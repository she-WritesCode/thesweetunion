<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import type { Wishlist_items, Reservations } from "~/dyrected-types";

const props = defineProps<{
  client?: any;
  context?: any;
  documents?: any[];
  pagination?: any;
  isLoading?: boolean;
}>();

const loading = ref(true);
const summary = ref<any>({
  totalItems: 0,
  totalReservations: 0,
  totalRegistryTarget: 0,
  totalAmountRaised: 0,
  registryFulfillmentPct: 0,
  fullyReservedCount: 0,
  partiallyFundedCount: 0,
  unclaimedCount: 0,
});

async function safeFetchCollection(sdkClient: any, collectionName: string) {
  if (sdkClient && typeof sdkClient.collection === "function") {
    try {
      const res = await sdkClient.collection(collectionName).find({ limit: 1000 });
      if (res) return res;
    } catch (e) {
      console.warn(`[WishlistSummary] SDK find failed for ${collectionName}, falling back to $fetch:`, e);
    }
  }
  return await $fetch<any>(`/api/dyrected/${collectionName}?limit=1000`).catch(() => ({ docs: [] }));
}

const fetchSummary = async () => {
  try {
    loading.value = true;
    const sdkClient = props.client || props.context?.client;

    const [itemsRes, reservationsRes] = await Promise.all([
      safeFetchCollection(sdkClient, "wishlist_items"),
      safeFetchCollection(sdkClient, "reservations"),
    ]);

    const docs: Wishlist_items[] = itemsRes?.docs || [];
    const reservationDocs: Reservations[] = reservationsRes?.docs || [];

    let totalRegistryTarget = 0;
    let totalAmountRaised = 0;
    let fullyReservedCount = 0;
    let partiallyFundedCount = 0;
    let unclaimedCount = 0;

    for (const item of docs) {
      const price = Number(item.price) || 0;
      const maxQty = Number(item.maxQuantity) || 1;
      const isCrowdfund = item.fundingType === "crowdfund";

      // Find matching reservation records for this wishlist item
      const itemReservations = reservationDocs.filter((r: any) => {
        const rItemId = typeof r.item === "object" && r.item !== null ? r.item.id : r.item;
        return rItemId === item.id;
      });

      const reservationContribSum = itemReservations.reduce(
        (sum: number, r: any) => sum + (Number(r.contributionAmount) || 0),
        0,
      );
      const raised = Math.max(Number(item.amountRaised) || 0, reservationContribSum);

      const reservationDocsCount = itemReservations.length;
      const reservedCount = Math.max(Number(item.reservedCount) || 0, reservationDocsCount);

      if (price > 0) {
        totalRegistryTarget += price * maxQty;
      }

      if (isCrowdfund) {
        totalAmountRaised += raised;
        if (price > 0 && raised >= price) {
          fullyReservedCount++;
        } else if (raised > 0 || reservationDocsCount > 0) {
          partiallyFundedCount++;
        } else {
          unclaimedCount++;
        }
      } else {
        const reservedValue = reservedCount > 0 ? Math.min(reservedCount, maxQty) * price : 0;
        totalAmountRaised += reservedValue;

        if (reservedCount >= maxQty) {
          fullyReservedCount++;
        } else if (reservedCount > 0) {
          partiallyFundedCount++;
        } else {
          unclaimedCount++;
        }
      }
    }

    const registryFulfillmentPct =
      totalRegistryTarget > 0 ? Math.min(100, Math.round((totalAmountRaised / totalRegistryTarget) * 100)) : 0;

    summary.value = {
      totalItems: docs.length,
      totalReservations: reservationDocs.length,
      totalRegistryTarget,
      totalAmountRaised,
      registryFulfillmentPct,
      fullyReservedCount,
      partiallyFundedCount,
      unclaimedCount,
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
    <div class="flex items-center justify-between mb-4">
      <div>
        <h4 class="text-sm font-semibold text-gray-800">Wishlist &amp; Registry Summary</h4>
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
      <div class="h-16 bg-gray-100 rounded-lg"></div>
    </div>

    <div v-else class="space-y-4">
      <!-- Fulfillment Progress Bar -->
      <div class="p-4 bg-amber-50/50 rounded-xl border border-amber-200/60">
        <div class="flex items-center justify-between text-xs font-bold text-amber-900 mb-1.5">
          <span>Overall Registry Goal Fulfillment</span>
          <span>{{ summary.registryFulfillmentPct }}% Funded</span>
        </div>
        <div class="w-full bg-amber-100 h-3 rounded-full overflow-hidden">
          <div
            class="bg-amber-600 h-full transition-all duration-500 rounded-full"
            :style="{ width: `${summary.registryFulfillmentPct}%` }"
          ></div>
        </div>
        <div class="mt-2 flex items-center justify-between text-xs text-amber-800 font-medium">
          <span
            >Raised / Reserved: <strong>₦{{ (summary.totalAmountRaised || 0).toLocaleString() }}</strong></span
          >
          <span
            >Total Goal: <strong>₦{{ (summary.totalRegistryTarget || 0).toLocaleString() }}</strong></span
          >
        </div>
      </div>

      <!-- KPI Metrics Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
          <span class="text-xs font-bold uppercase tracking-wider text-emerald-800">Fully Claimed Items</span>
          <div class="mt-1 flex items-baseline justify-between">
            <span class="text-3xl font-black text-emerald-900">{{ summary.fullyReservedCount }}</span>
            <span class="text-xs text-emerald-700 font-medium">Completed</span>
          </div>
        </div>

        <div class="p-4 bg-blue-50/60 rounded-xl border border-blue-100">
          <span class="text-xs font-bold uppercase tracking-wider text-blue-800">Partially Funded</span>
          <div class="mt-1 flex items-baseline justify-between">
            <span class="text-3xl font-black text-blue-900">{{ summary.partiallyFundedCount }}</span>
            <span class="text-xs text-blue-700 font-medium">In Progress</span>
          </div>
        </div>

        <div class="p-4 bg-slate-50/60 rounded-xl border border-slate-200">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-700">Available / Unclaimed</span>
          <div class="mt-1 flex items-baseline justify-between">
            <span class="text-3xl font-black text-slate-900">{{ summary.unclaimedCount }}</span>
            <span class="text-xs text-slate-600 font-medium">Out of {{ summary.totalItems }} items</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
