<script setup lang="ts">
import { ref, watch, onMounted } from "vue";

const props = defineProps<{
  client?: any;
  documents?: any[];
  pagination?: any;
  isLoading?: boolean;
}>();

const loading = ref(true);
const summary = ref<any>(null);

const fetchSummary = async () => {
  try {
    loading.value = true;
    if (props.client) {
      const res = await props.client.collection("rsvp_groups").find({ limit: 1000 });
      const docs = res?.docs || [];

      let totalCapacity = 0;
      let totalConfirmedSeats = 0;
      let respondedCount = 0;

      for (const g of docs) {
        totalCapacity += Number(g.maxCapacity) || 0;
        totalConfirmedSeats += Number(g.confirmedCount) || 0;
        if (g.hasSubmitted || (g.confirmedCount || 0) > 0 || (g.declinedCount || 0) > 0) {
          respondedCount++;
        }
      }

      const responsePct = docs.length > 0 ? Math.round((respondedCount / docs.length) * 100) : 0;

      summary.value = {
        totalGroups: docs.length,
        totalCapacity,
        totalConfirmedSeats,
        respondedCount,
        responsePct,
      };
    } else {
      const res = await $fetch<any>("/api/admin/group-summary");
      if (res?.success) {
        summary.value = res.data;
      }
    }
  } catch (err) {
    console.error("Failed to fetch Group summary:", err);
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.client,
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
        <h4 class="text-sm font-semibold text-gray-800">Group Capacity &amp; Responses</h4>
      </div>
      <button
        @click="fetchSummary"
        type="button"
        title="Refresh stats"
        aria-label="Refresh stats"
        class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors cursor-pointer flex items-center justify-center"
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

    <div v-else-if="summary" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="p-4 bg-purple-50/60 rounded-xl border border-purple-100 flex flex-col justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-purple-700">Confirmed Guest Headcount</span>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-3xl font-black text-purple-950">{{ summary.totalConfirmedSeats || 0 }}</span>
          <span class="text-xs text-purple-700 font-medium">Attending Seats</span>
        </div>
      </div>

      <div class="p-4 bg-sky-50/60 rounded-xl border border-sky-100 flex flex-col justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-sky-800">Total Group Capacity</span>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-3xl font-black text-sky-950">{{ summary.totalCapacity || 0 }}</span>
          <span class="text-xs text-sky-700 font-medium">Max Allowed</span>
        </div>
      </div>

      <div class="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 flex flex-col justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-indigo-800">Responded Groups</span>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-3xl font-black text-indigo-950">{{ summary.respondedCount || 0 }}</span>
          <span class="text-xs text-indigo-700 font-medium">Out of {{ summary.totalGroups || 0 }} Groups</span>
        </div>
      </div>

      <div class="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 flex flex-col justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-emerald-800">Group Response Rate</span>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-3xl font-black text-emerald-950">{{ summary.responsePct || 0 }}%</span>
          <span class="text-xs text-emerald-700 font-medium">Completed</span>
        </div>
      </div>
    </div>
  </div>
</template>
