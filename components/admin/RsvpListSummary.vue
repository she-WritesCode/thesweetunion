<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import type { Asoebi_settingsGlobal } from "~/dyrected-types";

const props = defineProps<{
  client?: any;
  context?: any;
  documents?: any[];
  pagination?: any;
  isLoading?: boolean;
}>();

const loading = ref(true);
const summary = ref<any>({
  totalSubmitted: 0,
  totalAttending: 0,
  totalDeclined: 0,
  leadAttendingCount: 0,
  spouseAttendingCount: 0,
  totalGuestHeadcount: 0,
  asoebi: {
    orderCount: 0,
    totalYards: 0,
    fabricRevenue: 0,
    maleQty: 0,
    femaleQty: 0,
    totalAsoOkeRevenue: 0,
    grandRevenue: 0,
  },
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
      console.warn(`[RsvpSummary] SDK aggregate failed for ${collectionName}, falling back to $fetch:`, e);
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

async function safeFetchGlobal(sdkClient: any, globalName: string) {
  if (sdkClient && typeof sdkClient.global === "function") {
    try {
      const res = await sdkClient.global(globalName).get();
      if (res) return res;
    } catch (e) {
      console.warn(`[RsvpSummary] SDK global get failed for ${globalName}, falling back to $fetch:`, e);
    }
  }
  return await $fetch<any>(`/api/dyrected/api/globals/${globalName}`).catch(() => ({}));
}

const fetchSummary = async () => {
  try {
    loading.value = true;
    const sdkClient = props.client || props.context?.client;

    // Run database-level aggregate & fetch global pricing in parallel
    const [aggregateRes, asoebiGlobalRes] = await Promise.all([
      // 1. Native Database Aggregations
      safeAggregate(sdkClient, "rsvp_records", {
        totalSubmitted: { count: "*" },
        totalAttending: {
          count: "*",
          where: { attending: { equals: true } },
        },
        totalDeclined: {
          count: "*",
          where: { attending: { equals: false } },
        },
        spouseAttendingCount: {
          count: "*",
          where: {
            AND: [{ attending: { equals: true } }, { hasSpouse: { equals: true } }],
          },
        },
        asoebiOrderCount: {
          count: "*",
          where: {
            AND: [{ attending: { equals: true } }, { wantsAsoebi: { equals: true } }],
          },
        },
        totalAsoebiYards: {
          sum: "asoebiYards",
          cast: "number",
          where: {
            AND: [{ attending: { equals: true } }, { wantsAsoebi: { equals: true } }],
          },
        },
        totalAsoOkeMaleQty: {
          sum: "asoOkeMaleQty",
          cast: "number",
          where: {
            AND: [{ attending: { equals: true } }, { wantsAsoOke: { equals: true } }],
          },
        },
        totalAsoOkeFemaleQty: {
          sum: "asoOkeFemaleQty",
          cast: "number",
          where: {
            AND: [{ attending: { equals: true } }, { wantsAsoOke: { equals: true } }],
          },
        },
      }),

      // 2. Global Asoebi Pricing
      safeFetchGlobal(sdkClient, "asoebi_settings"),
    ]);

    const stats = aggregateRes || {};
    const asoebiGlobal: Partial<Asoebi_settingsGlobal> = (asoebiGlobalRes as any) || {};

    const pricePerYard = Number(asoebiGlobal?.pricePerYard) || 10000;
    const asoOkeMalePrice = Number(asoebiGlobal?.asoOkeMalePrice) || 6000;
    const asoOkeFemalePrice = Number(asoebiGlobal?.asoOkeFemalePrice) || 6000;

    const totalSubmitted = Number(stats.totalSubmitted) || 0;
    const totalAttending = Number(stats.totalAttending) || 0;
    const totalDeclined = Number(stats.totalDeclined) || 0;
    const spouseAttendingCount = Number(stats.spouseAttendingCount) || 0;
    const leadAttendingCount = totalAttending;
    const totalGuestHeadcount = leadAttendingCount + spouseAttendingCount;

    const asoebiOrderCount = Number(stats.asoebiOrderCount) || 0;
    const totalAsoebiYards = Number(stats.totalAsoebiYards) || 0;
    const totalAsoOkeMaleQty = Number(stats.totalAsoOkeMaleQty) || 0;
    const totalAsoOkeFemaleQty = Number(stats.totalAsoOkeFemaleQty) || 0;

    const fabricRevenue = totalAsoebiYards * pricePerYard;
    const asoOkeMaleRevenue = totalAsoOkeMaleQty * asoOkeMalePrice;
    const asoOkeFemaleRevenue = totalAsoOkeFemaleQty * asoOkeFemalePrice;
    const totalAsoOkeRevenue = asoOkeMaleRevenue + asoOkeFemaleRevenue;
    const grandRevenue = fabricRevenue + totalAsoOkeRevenue;

    summary.value = {
      totalSubmitted,
      totalAttending,
      totalDeclined,
      leadAttendingCount,
      spouseAttendingCount,
      totalGuestHeadcount,
      asoebi: {
        orderCount: asoebiOrderCount,
        totalYards: totalAsoebiYards,
        fabricRevenue,
        maleQty: totalAsoOkeMaleQty,
        femaleQty: totalAsoOkeFemaleQty,
        totalAsoOkeRevenue,
        grandRevenue,
      },
    };
  } catch (err) {
    console.error("Failed to fetch RSVP summary:", err);
  } finally {
    loading.value = false;
  }
};

watch(
  () => [props.client, props.context?.client],
  () => fetchSummary(),
  { immediate: true },
);
onMounted(() => fetchSummary());
</script>

<template>
  <div class="mb-6 p-5 bg-white rounded-xl shadow-xs border border-gray-200">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h4 class="text-sm font-semibold text-gray-800">RSVP &amp; Asoebi Summary</h4>
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

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Attendance Headcount -->
      <div class="p-4 bg-purple-50/60 rounded-xl border border-purple-100 flex flex-col justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-purple-700">Attending Guests</span>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-3xl font-black text-purple-900">{{ summary.totalGuestHeadcount }}</span>
          <span class="text-xs text-purple-700 font-medium">Headcount</span>
        </div>
        <div class="mt-2 text-xs text-purple-600 flex items-center justify-between border-t border-purple-100 pt-1.5">
          <span
            >Leads: <strong>{{ summary.leadAttendingCount }}</strong></span
          >
          <span
            >Spouses: <strong>{{ summary.spouseAttendingCount }}</strong></span
          >
        </div>
      </div>

      <!-- RSVP Response Breakdown -->
      <div class="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 flex flex-col justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-emerald-700">RSVP Status</span>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-3xl font-black text-emerald-900">{{ summary.totalAttending }}</span>
          <span class="text-xs text-emerald-700 font-medium">Confirmed Yes</span>
        </div>
        <div class="mt-2 text-xs text-emerald-600 flex items-center justify-between border-t border-emerald-100 pt-1.5">
          <span
            >Declined: <strong>{{ summary.totalDeclined }}</strong></span
          >
          <span
            >Total Submissions: <strong>{{ summary.totalSubmitted }}</strong></span
          >
        </div>
      </div>

      <!-- Asoebi Fabric & Aso-Oke Quantity -->
      <div class="p-4 bg-amber-50/60 rounded-xl border border-amber-100 flex flex-col justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-amber-800">Asoebi Fabric &amp; Headwear</span>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-3xl font-black text-amber-900"
            >{{ summary.asoebi?.totalYards || 0 }} <span class="text-base font-normal">Yards</span></span
          >
          <span class="text-xs text-amber-800 font-medium">{{ summary.asoebi?.orderCount || 0 }} orders</span>
        </div>
        <div class="mt-2 text-xs text-amber-700 flex items-center justify-between border-t border-amber-100 pt-1.5">
          <span
            >Male Caps: <strong>{{ summary.asoebi?.maleQty || 0 }}</strong></span
          >
          <span
            >Female Gele: <strong>{{ summary.asoebi?.femaleQty || 0 }}</strong></span
          >
        </div>
      </div>

      <!-- Total Estimated Revenue -->
      <div class="p-4 bg-rose-50/60 rounded-xl border border-rose-100 flex flex-col justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-rose-800">Total Asoebi Revenue</span>
        <div class="mt-2">
          <span class="text-2xl font-black text-rose-950"
            >₦{{ (summary.asoebi?.grandRevenue || 0).toLocaleString() }}</span
          >
        </div>
        <div class="mt-2 text-xs text-rose-700 flex items-center justify-between border-t border-rose-100 pt-1.5">
          <span>Fabric: ₦{{ (summary.asoebi?.fabricRevenue || 0).toLocaleString() }}</span>
          <span>Headwear: ₦{{ (summary.asoebi?.totalAsoOkeRevenue || 0).toLocaleString() }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
