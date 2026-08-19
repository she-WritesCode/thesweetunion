<script setup lang="ts">
import { ref, watch, onMounted } from "vue";

const props = defineProps<{
  client?: any;
  context?: any;
  documents?: any[];
  pagination?: any;
  isLoading?: boolean;
}>();

const loading = ref(true);
const summary = ref<any>({
  totalRegistryTarget: 0,
  totalCommittedValue: 0,
  totalCommittedPct: 0,
  // 1. Immediate Payments
  paidNowCash: 0,
  paidNowPct: 0,
  paidNowCount: 0,
  paidNowCrowdfundCount: 0,
  paidNowFixedCount: 0,
  // 2. Bringing to Wedding Day
  weddingDayValue: 0,
  weddingDayPct: 0,
  weddingDayCount: 0,
  weddingDayQuantity: 0,
  // 3. Pledged / Remind Later
  pledgedValue: 0,
  pledgedPct: 0,
  remindLaterCount: 0,
  whatsappReminderCount: 0,
  emailReminderCount: 0,
  // 4. Registry Catalog Status
  totalItems: 0,
  claimedItemsCount: 0,
  partiallyClaimedCount: 0,
  unclaimedCount: 0,
  crowdfundCount: 0,
  fixedCount: 0,
});

async function safeAggregate(sdkClient: any, collectionName: string, input: Record<string, any>) {
  if (sdkClient && typeof sdkClient.collection === "function") {
    try {
      const col = sdkClient.collection(collectionName);
      if (typeof col.aggregate === "function") {
        const res = await col.aggregate(input);
        if (res) return res;
      }
    } catch (e) {
      console.warn(`[WishlistSummary] SDK aggregate failed for ${collectionName}, falling back to $fetch:`, e);
    }
  }
  return await $fetch<any>(`/api/dyrected/api/collections/${collectionName}/aggregate`, {
    method: "POST",
    body: input,
  }).catch(() =>
    $fetch<any>(`/api/dyrected/collections/${collectionName}/aggregate`, {
      method: "POST",
      body: input,
    }).catch(() => ({})),
  );
}

const fetchSummary = async () => {
  try {
    loading.value = true;
    const sdkClient = props.client || props.context?.client;

    const [itemStats, reservationStats] = await Promise.all([
      safeAggregate(sdkClient, "wishlist_items", {
        totalItems: {
          count: "*",
          where: { isHidden: { not_equals: true } },
        },
        totalTarget: {
          sum: "price",
          cast: "number",
          where: { isHidden: { not_equals: true } },
        },
        totalCrowdfundRaised: {
          sum: "amountRaised",
          cast: "number",
          where: { isHidden: { not_equals: true } },
        },
        crowdfundCount: {
          count: "*",
          where: {
            AND: [
              { fundingType: { equals: "crowdfund" } },
              { isHidden: { not_equals: true } },
            ],
          },
        },
        fixedCount: {
          count: "*",
          where: {
            AND: [
              { fundingType: { equals: "fixed" } },
              { isHidden: { not_equals: true } },
            ],
          },
        },
        claimedItemsCount: {
          count: "*",
          where: {
            AND: [
              { reservedCount: { gt: 0 } },
              { isHidden: { not_equals: true } },
            ],
          },
        },
      }),
      safeAggregate(sdkClient, "reservations", {
        totalReservations: { count: "*" },
        totalContributions: { sum: "contributionAmount", cast: "number" },
        totalQuantityReserved: { sum: "quantity", cast: "number" },
        // 1. Immediate Payments / Paid Now
        paidNowCount: {
          count: "*",
          where: { paymentTiming: { equals: "now" } },
        },
        paidNowCash: {
          sum: "contributionAmount",
          cast: "number",
          where: { paymentTiming: { equals: "now" } },
        },
        paidNowQuantity: {
          sum: "quantity",
          cast: "number",
          where: { paymentTiming: { equals: "now" } },
        },
        paidNowBankCount: {
          count: "*",
          where: {
            AND: [
              { paymentTiming: { equals: "now" } },
              { paymentOption: { equals: "bank_transfer" } },
            ],
          },
        },
        paidNowLinkCount: {
          count: "*",
          where: {
            AND: [
              { paymentTiming: { equals: "now" } },
              { paymentOption: { equals: "purchase_link" } },
            ],
          },
        },
        // 2. Bringing to Wedding Day
        weddingDayCount: {
          count: "*",
          where: { paymentOption: { equals: "bring_to_wedding" } },
        },
        weddingDayQuantity: {
          sum: "quantity",
          cast: "number",
          where: { paymentOption: { equals: "bring_to_wedding" } },
        },
        // 3. Remind Later / Scheduled Pledges
        remindLaterCount: {
          count: "*",
          where: {
            AND: [
              { paymentTiming: { equals: "later" } },
              { paymentOption: { not_equals: "bring_to_wedding" } },
            ],
          },
        },
        remindLaterCash: {
          sum: "contributionAmount",
          cast: "number",
          where: {
            AND: [
              { paymentTiming: { equals: "later" } },
              { paymentOption: { not_equals: "bring_to_wedding" } },
            ],
          },
        },
        whatsappReminderCount: {
          count: "*",
          where: { reminderChannel: { equals: "whatsapp" } },
        },
        emailReminderCount: {
          count: "*",
          where: { reminderChannel: { equals: "email" } },
        },
      }),
    ]);

    const totalItems = Number(itemStats?.totalItems) || 0;
    const totalRegistryTarget = Number(itemStats?.totalTarget) || 0;
    const totalCrowdfundRaised = Number(itemStats?.totalCrowdfundRaised) || 0;
    const crowdfundCount = Number(itemStats?.crowdfundCount) || 0;
    const fixedCount = Number(itemStats?.fixedCount) || 0;
    const claimedItemsCount = Number(itemStats?.claimedItemsCount) || 0;

    // Reservation statistics
    const paidNowCount = Number(reservationStats?.paidNowCount) || 0;
    const paidNowCash = Math.max(Number(reservationStats?.paidNowCash) || 0, totalCrowdfundRaised);
    const paidNowQuantity = Number(reservationStats?.paidNowQuantity) || 0;
    const paidNowCrowdfundCount = Number(reservationStats?.paidNowBankCount) || paidNowCount;
    const paidNowFixedCount = Math.max(0, paidNowCount - (crowdfundCount > 0 ? 1 : 0));

    const weddingDayCount = Number(reservationStats?.weddingDayCount) || 0;
    const weddingDayQuantity = Number(reservationStats?.weddingDayQuantity) || weddingDayCount;
    // Estimated average allocation for physical gifts or count
    const avgItemPrice = totalItems > 0 && totalRegistryTarget > 0 ? Math.round(totalRegistryTarget / totalItems) : 0;
    const weddingDayValue = weddingDayQuantity * avgItemPrice;

    const remindLaterCount = Number(reservationStats?.remindLaterCount) || 0;
    const remindLaterCash = Number(reservationStats?.remindLaterCash) || 0;
    const whatsappReminderCount = Number(reservationStats?.whatsappReminderCount) || 0;
    const emailReminderCount = Number(reservationStats?.emailReminderCount) || 0;
    const pledgedValue = remindLaterCash > 0 ? remindLaterCash : remindLaterCount * avgItemPrice;

    const totalCommittedValue = paidNowCash + weddingDayValue + pledgedValue;

    // Percentages of total registry target
    const totalCommittedPct =
      totalRegistryTarget > 0 ? Math.min(100, Math.round((totalCommittedValue / totalRegistryTarget) * 100)) : 0;
    const paidNowPct =
      totalRegistryTarget > 0 ? Math.min(100, Math.round((paidNowCash / totalRegistryTarget) * 100)) : 0;
    const weddingDayPct =
      totalRegistryTarget > 0 ? Math.min(100, Math.round((weddingDayValue / totalRegistryTarget) * 100)) : 0;
    const pledgedPct =
      totalRegistryTarget > 0 ? Math.min(100, Math.round((pledgedValue / totalRegistryTarget) * 100)) : 0;

    // Catalog item status
    const fullyClaimedCount = claimedItemsCount;
    const partiallyClaimedCount = crowdfundCount > 0 && totalCrowdfundRaised > 0 ? 1 : 0;
    const unclaimedCount = Math.max(0, totalItems - fullyClaimedCount);

    summary.value = {
      totalRegistryTarget,
      totalCommittedValue,
      totalCommittedPct,
      // 1. Immediate Payments
      paidNowCash,
      paidNowPct,
      paidNowCount,
      paidNowCrowdfundCount,
      paidNowFixedCount,
      // 2. Bringing to Wedding Day
      weddingDayValue,
      weddingDayPct,
      weddingDayCount,
      weddingDayQuantity,
      // 3. Pledged / Remind Later
      pledgedValue,
      pledgedPct,
      remindLaterCount,
      whatsappReminderCount,
      emailReminderCount,
      // 4. Registry Catalog Status
      totalItems,
      claimedItemsCount,
      partiallyClaimedCount,
      unclaimedCount,
      crowdfundCount,
      fixedCount,
    };
  } catch (err) {
    console.error("Failed to fetch Wishlist summary:", err);
  } finally {
    loading.value = false;
  }
};

watch(
  () => [props.client, props.context?.client],
  () => fetchSummary(),
  { immediate: true },
);

onMounted(() => {
  fetchSummary();
});
</script>

<template>
  <div class="mb-6 p-5 bg-white rounded-xl shadow-xs border border-gray-200">
    <!-- Header Strip -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center space-x-2.5">
        <div class="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
          <!-- Gift Icon -->
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v13m0-13V4.5a2.5 2.5 0 115 0V8h-5zm0 0V4.5a2.5 2.5 0 10-5 0V8h5zm-7 0h14a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1V9a1 1 0 011-1zm2 5h10v7a1 1 0 01-1 1H8a1 1 0 01-1-1v-7z" />
          </svg>
        </div>
        <div>
          <h4 class="text-sm font-semibold text-gray-900">Registry &amp; Wishlist Fulfillment Summary</h4>
          <p class="text-xs text-gray-500">Live operational breakdown of guest gifts and payments</p>
        </div>
      </div>
      <button
        @click="fetchSummary"
        type="button"
        title="Refresh stats"
        aria-label="Refresh stats"
        class="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer"
      >
        <svg
          class="w-4 h-4"
          :class="{ 'animate-spin': loading }"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
    </div>

    <div v-if="loading" class="animate-pulse space-y-3">
      <div class="h-20 bg-gray-100 rounded-lg"></div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="h-28 bg-gray-100 rounded-xl"></div>
        <div class="h-28 bg-gray-100 rounded-xl"></div>
        <div class="h-28 bg-gray-100 rounded-xl"></div>
        <div class="h-28 bg-gray-100 rounded-xl"></div>
      </div>
    </div>

    <div v-else class="space-y-4">
      <!-- Fulfillment Multi-Segment Progress Bar -->
      <div class="p-4 bg-amber-50/50 rounded-xl border border-amber-200/60">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-bold text-amber-950 mb-2">
          <span>Overall Registry Fulfillment</span>
          <span class="text-amber-900 font-semibold">
            ₦{{ (summary.totalCommittedValue || 0).toLocaleString() }} of ₦{{ (summary.totalRegistryTarget || 0).toLocaleString() }}
            <span class="text-amber-700 font-bold ml-1">({{ summary.totalCommittedPct }}% Committed)</span>
          </span>
        </div>

        <!-- Stacked Progress Bar -->
        <div class="w-full bg-amber-100/80 h-3 rounded-full overflow-hidden flex">
          <div
            title="Cash Paid"
            class="bg-emerald-600 h-full transition-all duration-500"
            :style="{ width: `${summary.paidNowPct}%` }"
          ></div>
          <div
            title="Wedding Day Gifts"
            class="bg-purple-600 h-full transition-all duration-500"
            :style="{ width: `${summary.weddingDayPct}%` }"
          ></div>
          <div
            title="Pledged / Reminders"
            class="bg-amber-500 h-full transition-all duration-500"
            :style="{ width: `${summary.pledgedPct}%` }"
          ></div>
        </div>

        <!-- Segment Legend -->
        <div class="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-700 font-medium">
          <div class="flex items-center space-x-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
            <span><strong>₦{{ (summary.paidNowCash || 0).toLocaleString() }}</strong> Cash Paid ({{ summary.paidNowPct }}%)</span>
          </div>
          <div class="flex items-center space-x-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block"></span>
            <span><strong>₦{{ (summary.weddingDayValue || 0).toLocaleString() }}</strong> Wedding Day ({{ summary.weddingDayPct }}%)</span>
          </div>
          <div class="flex items-center space-x-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
            <span><strong>₦{{ (summary.pledgedValue || 0).toLocaleString() }}</strong> Pledged ({{ summary.pledgedPct }}%)</span>
          </div>
        </div>
      </div>

      <!-- 4 KPI Operational Cards Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- 1. Immediate Payments (Bank) -->
        <div class="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-emerald-800">1. Immediate Payments</span>
              <!-- Credit Card Icon -->
              <svg class="w-4 h-4 text-emerald-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div class="mt-2">
              <div class="text-2xl font-black text-emerald-950 leading-tight">
                ₦{{ (summary.paidNowCash || 0).toLocaleString() }}
              </div>
              <div class="text-xs font-medium text-emerald-800 mt-0.5">
                {{ summary.paidNowCount }} Payment{{ summary.paidNowCount === 1 ? '' : 's' }} / Transfer{{ summary.paidNowCount === 1 ? '' : 's' }}
              </div>
            </div>
          </div>
          <div class="mt-3 pt-2 text-xs text-emerald-700 flex items-center justify-between border-t border-emerald-100">
            <span>Cash into bank details</span>
            <span class="font-semibold">{{ summary.paidNowCount }} Confirmed</span>
          </div>
        </div>

        <!-- 2. Bringing to Wedding Day -->
        <div class="p-4 bg-purple-50/60 rounded-xl border border-purple-100 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-purple-800">2. Wedding Day Gifts</span>
              <!-- Gift Box Icon -->
              <svg class="w-4 h-4 text-purple-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div class="mt-2">
              <div class="text-2xl font-black text-purple-950 leading-tight">
                ₦{{ (summary.weddingDayValue || 0).toLocaleString() }}
              </div>
              <div class="text-xs font-medium text-purple-800 mt-0.5">
                {{ summary.weddingDayCount }} Physical Gift{{ summary.weddingDayCount === 1 ? '' : 's' }}
              </div>
            </div>
          </div>
          <div class="mt-3 pt-2 text-xs text-purple-700 flex items-center justify-between border-t border-purple-100">
            <span>Physical gifts at venue</span>
            <span class="font-semibold">{{ summary.weddingDayQuantity }} Unit{{ summary.weddingDayQuantity === 1 ? '' : 's' }}</span>
          </div>
        </div>

        <!-- 3. Pledged / Remind Later -->
        <div class="p-4 bg-amber-50/60 rounded-xl border border-amber-100 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-amber-800">3. Pledged / Remind Later</span>
              <!-- Clock Icon -->
              <svg class="w-4 h-4 text-amber-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="mt-2">
              <div class="text-2xl font-black text-amber-950 leading-tight">
                ₦{{ (summary.pledgedValue || 0).toLocaleString() }}
              </div>
              <div class="text-xs font-medium text-amber-800 mt-0.5">
                {{ summary.remindLaterCount }} Scheduled Pledge{{ summary.remindLaterCount === 1 ? '' : 's' }}
              </div>
            </div>
          </div>
          <div class="mt-3 pt-2 text-xs text-amber-700 flex items-center justify-between border-t border-amber-100">
            <span>{{ summary.whatsappReminderCount }} WhatsApp</span>
            <span>{{ summary.emailReminderCount }} Email</span>
          </div>
        </div>

        <!-- 4. Registry Catalog Status -->
        <div class="p-4 bg-slate-50/60 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-800">4. Catalog Status</span>
              <!-- Clipboard List Icon -->
              <svg class="w-4 h-4 text-slate-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div class="mt-2">
              <div class="text-2xl font-black text-slate-950 leading-tight">
                {{ summary.totalItems }} Total Items
              </div>
              <div class="text-xs font-medium text-slate-700 mt-0.5">
                {{ summary.claimedItemsCount }} Claimed &bull; {{ summary.unclaimedCount }} Open
              </div>
            </div>
          </div>
          <div class="mt-3 pt-2 text-xs text-slate-600 flex items-center justify-between border-t border-slate-200">
            <span>{{ summary.fixedCount }} Fixed</span>
            <span>{{ summary.crowdfundCount }} Crowdfund</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

