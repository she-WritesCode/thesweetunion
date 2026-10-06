<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { adminAuthHeaders } from "~/utils/admin-auth";

const props = defineProps<{
  client?: any;
  context?: any;
  documents?: any[];
  pagination?: any;
  isLoading?: boolean;
}>();

const loading = ref(true);
const recalculating = ref(false);
const feedbackMessage = ref("");
const feedbackType = ref<"success" | "error">("success");

const summary = ref<any>({
  totalGroups: 0,
  totalCapacity: 0,
  totalConfirmedSeats: 0,
  totalDeclinedSeats: 0,
  respondedCount: 0,
  responsePct: 0,
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
      console.warn(`[GroupSummary] SDK aggregate failed for ${collectionName}, falling back to $fetch:`, e);
    }
  }
  return await $fetch<any>(`/api/dyrected/api/collections/${collectionName}/aggregate`, {
    method: "POST",
    body: input,
  }).catch(() =>
    $fetch<any>(`/api/dyrected/collections/${collectionName}/aggregate`, {
      method: "POST",
      body: input,
    }).catch(() => ({}))
  );
}

const fetchSummary = async () => {
  try {
    loading.value = true;
    const sdkClient = props.client || props.context?.client;

    const stats = await safeAggregate(sdkClient, "rsvp_groups", {
      totalGroups: { count: "*" },
      totalCapacity: { sum: "maxCapacity", cast: "number" },
      totalConfirmedSeats: { sum: "confirmedCount", cast: "number" },
      totalDeclinedSeats: { sum: "declinedCount", cast: "number" },
      activeGroups: { count: "*", where: { isActive: { equals: true } } },
    });

    const totalGroups = Number(stats?.totalGroups) || 0;
    const totalCapacity = Number(stats?.totalCapacity) || 0;
    const totalConfirmedSeats = Number(stats?.totalConfirmedSeats) || 0;
    const totalDeclinedSeats = Number(stats?.totalDeclinedSeats) || 0;

    // Responded groups calculation from documents or fallback
    let respondedGroupsCount = 0;
    if (props.documents && props.documents.length) {
      respondedGroupsCount = props.documents.filter(
        (g: any) => (Number(g.confirmedCount) || 0) > 0 || (Number(g.declinedCount) || 0) > 0,
      ).length;
    } else {
      respondedGroupsCount = totalConfirmedSeats > 0 ? totalGroups : 0;
    }

    const responsePct = totalCapacity > 0 ? Math.min(100, Math.round((totalConfirmedSeats / totalCapacity) * 100)) : 0;

    summary.value = {
      totalGroups,
      totalCapacity,
      totalConfirmedSeats,
      totalDeclinedSeats,
      respondedCount: respondedGroupsCount,
      responsePct,
    };
  } catch (err) {
    console.error("Failed to fetch Group summary:", err);
  } finally {
    loading.value = false;
  }
};

async function handleRecalculateAll() {
  if (recalculating.value) return;
  try {
    recalculating.value = true;
    feedbackMessage.value = "";

    const res = await $fetch<any>("/api/rsvp/recalculate-counts", {
      method: "POST",
      headers: adminAuthHeaders(),
    });

    feedbackType.value = "success";
    feedbackMessage.value = res.message || "All group counts successfully repopulated!";
    await fetchSummary();

    // Signal any listening Dyrected list view to refresh its table data
    window.dispatchEvent(new CustomEvent("dyrected:refresh"));

    setTimeout(() => {
      feedbackMessage.value = "";
    }, 8000);
  } catch (err: any) {
    console.error("Recalculate all group counts failed:", err);
    feedbackType.value = "error";
    feedbackMessage.value = err?.data?.message || err?.message || "Failed to recalculate group counts.";
  } finally {
    recalculating.value = false;
  }
}

watch(
  () => [props.client, props.context?.client, props.documents],
  () => fetchSummary(),
  { immediate: true },
);

onMounted(() => {
  fetchSummary();
});
</script>

<template>
  <div class="mb-6 p-5 bg-white rounded-xl shadow-xs border border-gray-200">
    <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
      <div>
        <h4 class="text-sm font-semibold text-gray-800">Group Capacity &amp; Responses</h4>
        <p class="text-xs text-gray-500 mt-0.5">Overview of guest allocations and confirmation progress</p>
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="handleRecalculateAll"
          :disabled="recalculating"
          type="button"
          title="Recalculate counts for all invitation groups based on current RSVP records"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 active:bg-purple-200 border border-purple-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg
            class="w-3.5 h-3.5"
            :class="{ 'animate-spin': recalculating }"
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
          <span>{{ recalculating ? "Recalculating..." : "Recalculate All Counts" }}</span>
        </button>

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
    </div>

    <!-- Alert / Toast Banner -->
    <div
      v-if="feedbackMessage"
      class="mb-4 p-3 rounded-lg text-xs flex items-center justify-between border"
      :class="
        feedbackType === 'success'
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : 'bg-rose-50 border-rose-200 text-rose-800'
      "
    >
      <div class="flex items-center gap-2">
        <svg
          v-if="feedbackType === 'success'"
          class="w-4 h-4 text-emerald-600 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <svg
          v-else
          class="w-4 h-4 text-rose-600 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
        <span>{{ feedbackMessage }}</span>
      </div>
      <button @click="feedbackMessage = ''" type="button" class="text-xs hover:opacity-75 cursor-pointer ml-3">✕</button>
    </div>

    <div v-if="loading" class="animate-pulse space-y-3">
      <div class="h-16 bg-gray-100 rounded-lg"></div>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
