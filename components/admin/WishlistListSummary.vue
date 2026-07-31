<script setup lang="ts">
import { ref, onMounted } from "vue";

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
      const res = await props.client.collection("wishlist_items").find({ limit: 1000 });
      const docs = res?.docs || [];

      let totalRegistryTarget = 0;
      let totalAmountRaised = 0;
      let fullyReservedCount = 0;
      let partiallyFundedCount = 0;
      let unclaimedCount = 0;

      for (const item of docs) {
        const price = Number(item.price) || 0;
        const raised = Number(item.amountRaised) || 0;
        const reservedCount = Number(item.reservedCount) || 0;
        const maxQty = Number(item.maxQuantity) || 1;

        if (price > 0) totalRegistryTarget += price * maxQty;
        totalAmountRaised += raised;

        if (item.fundingType === "full") {
          if (reservedCount >= maxQty) fullyReservedCount++;
          else unclaimedCount++;
        } else {
          if (raised >= price && price > 0) fullyReservedCount++;
          else if (raised > 0) partiallyFundedCount++;
          else unclaimedCount++;
        }
      }

      const registryFulfillmentPct =
        totalRegistryTarget > 0 ? Math.min(100, Math.round((totalAmountRaised / totalRegistryTarget) * 100)) : 0;

      summary.value = {
        totalItems: docs.length,
        totalRegistryTarget,
        totalAmountRaised,
        registryFulfillmentPct,
        fullyReservedCount,
        partiallyFundedCount,
        unclaimedCount,
      };
    } else {
      const res = await $fetch<any>("/api/admin/wishlist-summary");
      if (res?.success) {
        summary.value = res.data;
      }
    }
  } catch (err) {
    console.error("Failed to fetch Wishlist summary:", err);
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
        <h4 class="text-xs text-gray-500 mt-0.5">
          Overall wishlist target, total raised, and item reservation progress across all items
        </h4>
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

    <div v-else-if="summary" class="space-y-4">
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
