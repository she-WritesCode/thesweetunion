<script setup lang="ts">
import { ref, onMounted } from "vue";

const loading = ref(true);
const summary = ref<any>(null);

const fetchSummary = async () => {
  try {
    loading.value = true;
    const res = await $fetch<any>("/api/admin/rsvp-summary");
    if (res?.success) {
      summary.value = res.data;
    }
  } catch (err) {
    console.error("Failed to fetch RSVP summary:", err);
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
          <span>👥</span> Guest Responses &amp; Asoebi Executive Summary
        </h3>
        <p class="text-xs text-gray-500 mt-0.5">Real-time attendance headcount, fabric orders, and revenue metrics</p>
      </div>
      <button
        @click="fetchSummary"
        type="button"
        class="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 transition-colors flex items-center gap-1 cursor-pointer"
      >
        <span>🔄</span> Refresh Stats
      </button>
    </div>

    <div v-if="loading" class="animate-pulse space-y-3">
      <div class="h-16 bg-gray-100 rounded-lg"></div>
    </div>

    <div v-else-if="summary" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Attendance Headcount -->
      <div class="p-4 bg-purple-50/60 rounded-xl border border-purple-100 flex flex-col justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-purple-700">Attending Guests</span>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-3xl font-black text-purple-900">{{ summary.totalGuestHeadcount }}</span>
          <span class="text-xs text-purple-700 font-medium">Headcount</span>
        </div>
        <div class="mt-2 text-xs text-purple-600 flex items-center justify-between border-t border-purple-100 pt-1.5">
          <span>Leads: <strong>{{ summary.leadAttendingCount }}</strong></span>
          <span>Spouses: <strong>{{ summary.spouseAttendingCount }}</strong></span>
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
          <span>Declined: <strong>{{ summary.totalDeclined }}</strong></span>
          <span>Total Submissions: <strong>{{ summary.totalSubmitted }}</strong></span>
        </div>
      </div>

      <!-- Asoebi Fabric & Aso-Oke Quantity -->
      <div class="p-4 bg-amber-50/60 rounded-xl border border-amber-100 flex flex-col justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-amber-800">Asoebi Fabric &amp; Headwear</span>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-3xl font-black text-amber-900">{{ summary.asoebi?.totalYards || 0 }} <span class="text-base font-normal">Yards</span></span>
          <span class="text-xs text-amber-800 font-medium">{{ summary.asoebi?.orderCount || 0 }} orders</span>
        </div>
        <div class="mt-2 text-xs text-amber-700 flex items-center justify-between border-t border-amber-100 pt-1.5">
          <span>Male Caps: <strong>{{ summary.asoebi?.maleQty || 0 }}</strong></span>
          <span>Female Gele: <strong>{{ summary.asoebi?.femaleQty || 0 }}</strong></span>
        </div>
      </div>

      <!-- Total Estimated Revenue -->
      <div class="p-4 bg-rose-50/60 rounded-xl border border-rose-100 flex flex-col justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-rose-800">Total Asoebi Revenue</span>
        <div class="mt-2">
          <span class="text-2xl font-black text-rose-950">₦{{ (summary.asoebi?.grandRevenue || 0).toLocaleString() }}</span>
        </div>
        <div class="mt-2 text-xs text-rose-700 flex items-center justify-between border-t border-rose-100 pt-1.5">
          <span>Fabric: ₦{{ (summary.asoebi?.fabricRevenue || 0).toLocaleString() }}</span>
          <span>Headwear: ₦{{ (summary.asoebi?.totalAsoOkeRevenue || 0).toLocaleString() }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
