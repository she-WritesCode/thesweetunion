<script setup lang="ts">
import { ref, onMounted } from "vue";

const loading = ref(true);
const summary = ref<any>(null);

const fetchSummary = async () => {
  try {
    loading.value = true;
    const res = await $fetch<any>("/api/admin/checkin-summary");
    if (res?.success) {
      summary.value = res.data;
    }
  } catch (err) {
    console.error("Failed to fetch CheckIn summary:", err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchSummary();
});
</script>

<template>
  <div class="mb-6 p-5 bg-white rounded-xl shadow-xs border border-gray-200">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span>🎟️</span> Live Door Check-In Analytics
        </h3>
        <p class="text-xs text-gray-500 mt-0.5">Real-time venue check-in rate vs expected attending guests</p>
      </div>
      <button
        @click="fetchSummary"
        type="button"
        class="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 transition-colors flex items-center gap-1 cursor-pointer"
      >
        <span>🔄</span> Refresh Scans
      </button>
    </div>

    <div v-if="loading" class="animate-pulse space-y-3">
      <div class="h-16 bg-gray-100 rounded-lg"></div>
    </div>

    <div v-else-if="summary" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
