<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import type { Check_ins, Rsvp_records } from "~/dyrected-types";

const props = defineProps<{
  client?: any;
  context?: any;
  documents?: any[];
  pagination?: any;
  isLoading?: boolean;
}>();

const loading = ref(true);
const summary = ref<any>({
  totalCheckedIn: 0,
  totalExpected: 0,
  checkInPct: 0,
});

const fetchSummary = async () => {
  try {
    loading.value = true;
    let checkInDocs: Check_ins[] = [];
    let rsvpDocs: Rsvp_records[] = [];

    const sdkClient = props.client || props.context?.client;

    if (sdkClient && typeof sdkClient.collection === "function") {
      const [checkInRes, rsvpRes] = await Promise.all([
        sdkClient.collection("check_ins").find({ limit: 1000 }).catch(() => ({ docs: [] })),
        sdkClient.collection("rsvp_records").find({ limit: 1000 }).catch(() => ({ docs: [] })),
      ]);
      checkInDocs = checkInRes?.docs || [];
      rsvpDocs = rsvpRes?.docs || [];
    } else {
      const [checkInRes, rsvpRes] = await Promise.all([
        $fetch<any>("/api/dyrected/check_ins?limit=1000").catch(() => ({ docs: [] })),
        $fetch<any>("/api/dyrected/rsvp_records?limit=1000").catch(() => ({ docs: [] })),
      ]);
      checkInDocs = checkInRes?.docs || [];
      rsvpDocs = rsvpRes?.docs || [];
    }

    let totalGuestHeadcount = 0;
    for (const record of rsvpDocs) {
      if (record.attending === true || (record.attending as any) === "true") {
        totalGuestHeadcount++;
        if (record.hasSpouse) {
          totalGuestHeadcount++;
        }
      }
    }

    const checkedInCount = checkInDocs.length;
    const checkInPct = totalGuestHeadcount > 0 ? Math.round((checkedInCount / totalGuestHeadcount) * 100) : 0;

    summary.value = {
      totalCheckedIn: checkedInCount,
      totalExpected: totalGuestHeadcount,
      checkInPct,
    };
  } catch (err) {
    console.error("Failed to fetch CheckIn summary:", err);
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
        <h4 class="text-sm font-semibold text-gray-800">Check-In Summary</h4>
      </div>
      <button
        @click="fetchSummary"
        type="button"
        title="Refresh scans"
        aria-label="Refresh scans"
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

    <div v-else class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="p-4 bg-teal-50/60 rounded-xl border border-teal-100 flex flex-col justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-teal-800">Door Checked In</span>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-3xl font-black text-teal-950">{{ summary.totalCheckedIn || 0 }}</span>
          <span class="text-xs text-teal-700 font-medium">Scanned</span>
        </div>
      </div>

      <div class="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 flex flex-col justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-indigo-800">Expected Headcount</span>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-3xl font-black text-indigo-950">{{ summary.totalExpected || 0 }}</span>
          <span class="text-xs text-indigo-700 font-medium">Confirmed RSVPs</span>
        </div>
      </div>

      <div class="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 flex flex-col justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-emerald-800">Arrival Completion</span>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-3xl font-black text-emerald-950">{{ summary.checkInPct || 0 }}%</span>
          <span class="text-xs text-emerald-700 font-medium">Arrived</span>
        </div>
      </div>
    </div>
  </div>
</template>
