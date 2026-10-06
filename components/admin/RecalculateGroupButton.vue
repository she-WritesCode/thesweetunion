<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { adminAuthHeaders } from "~/utils/admin-auth";

const props = defineProps<{
  value?: any;
  onChange?: (...args: any[]) => void;
  field?: Record<string, any>;
  path?: string;
  disabled?: boolean;
  collection?: string;
  context?: {
    user?: Record<string, unknown> | null;
    schemas?: Record<string, unknown>;
    siblingData?: Record<string, any>;
    doc?: Record<string, any>;
    record?: Record<string, any>;
  };
}>();

const SKIP = new Set(["admin", "create", "collections", "globals"]);
function readIdFromUrl() {
  if (typeof window === "undefined") return undefined;
  const hashId = window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).at(-1);
  return hashId && !SKIP.has(hashId) ? hashId : undefined;
}

const currentRecordId = ref<string | undefined>(
  (props.context?.doc?.id as string) ||
  (props.context?.siblingData?.id as string) ||
  (props.context?.record?.id as string) ||
  readIdFromUrl(),
);

const loadingGroup = ref(false);
const loadingAll = ref(false);
const message = ref("");
const error = ref("");
const lastStats = ref<any>(null);

const hasGroup = computed(() => Boolean(currentRecordId.value));
const groupName = computed(() => {
  return (
    props.context?.siblingData?.name ||
    props.context?.doc?.name ||
    props.context?.record?.name ||
    ""
  );
});

onMounted(() => {
  const update = () => {
    currentRecordId.value =
      (props.context?.doc?.id as string) ||
      (props.context?.siblingData?.id as string) ||
      (props.context?.record?.id as string) ||
      readIdFromUrl();
  };
  const origPush = history.pushState.bind(history);
  history.pushState = (...args) => {
    origPush(...args);
    update();
  };
  window.addEventListener("hashchange", update);
  onUnmounted(() => {
    history.pushState = origPush;
    window.removeEventListener("hashchange", update);
  });
});

async function handleRecalculateGroup() {
  const id = currentRecordId.value;
  if (!id) {
    error.value = "Group ID not found. Please save the group first.";
    return;
  }

  loadingGroup.value = true;
  message.value = "";
  error.value = "";

  try {
    const res = await $fetch<any>("/api/rsvp/recalculate-counts", {
      method: "POST",
      headers: adminAuthHeaders(),
      body: { groupId: id },
    });

    if (res.success && res.stats) {
      lastStats.value = res.stats;
      message.value = `Updated: ${res.stats.confirmedCount} confirmed seats, ${res.stats.declinedCount} declined.`;

      if (typeof props.onChange === "function") {
        props.onChange(new Date().toISOString());
      }
      window.dispatchEvent(new CustomEvent("dyrected:refresh"));
    } else {
      message.value = res.message || "Group counts updated successfully.";
    }
  } catch (err: any) {
    console.error("Recalculate group failed:", err);
    error.value = err?.data?.message || err?.message || "Failed to recalculate group count.";
  } finally {
    loadingGroup.value = false;
  }
}

async function handleRecalculateAll() {
  loadingAll.value = true;
  message.value = "";
  error.value = "";

  try {
    const res = await $fetch<any>("/api/rsvp/recalculate-counts", {
      method: "POST",
      headers: adminAuthHeaders(),
    });

    if (res.success) {
      message.value = res.message || "Counts recalculated for all groups!";
      if (typeof props.onChange === "function") {
        props.onChange(new Date().toISOString());
      }
      window.dispatchEvent(new CustomEvent("dyrected:refresh"));
    }
  } catch (err: any) {
    console.error("Recalculate all failed:", err);
    error.value = err?.data?.message || err?.message || "Failed to recalculate all group counts.";
  } finally {
    loadingAll.value = false;
  }
}
</script>

<template>
  <div class="p-4 bg-gray-50/80 rounded-xl border border-gray-200 flex flex-col gap-3 my-2">
    <div class="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-gray-800">
            {{ hasGroup ? (groupName ? `Sync "${groupName}" Count` : "Sync Group Count") : "Sync Group Counts" }}
          </span>
          <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-purple-100 text-purple-800">
            RSVP Sync
          </span>
        </div>
        <p class="text-xs text-gray-500 mt-1 max-w-md">
          Recalculates confirmed guest headcount (leads + spouse seats) and declined responses directly from guest RSVP submissions.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <!-- Recalculate this group (if in a group context) -->
        <button
          v-if="hasGroup"
          @click="handleRecalculateGroup"
          :disabled="loadingGroup || loadingAll"
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          <svg
            class="w-3.5 h-3.5"
            :class="{ 'animate-spin': loadingGroup }"
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
          <span>{{ loadingGroup ? "Recalculating..." : "Recalculate This Group" }}</span>
        </button>

        <!-- Recalculate all groups button -->
        <button
          @click="handleRecalculateAll"
          :disabled="loadingGroup || loadingAll"
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 border border-gray-300 shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          <svg
            class="w-3.5 h-3.5"
            :class="{ 'animate-spin': loadingAll }"
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
          <span>{{ loadingAll ? "Recalculating All..." : "Recalculate All Groups" }}</span>
        </button>
      </div>
    </div>

    <!-- Feedback Message -->
    <div
      v-if="message"
      class="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between"
    >
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <span>{{ message }}</span>
      </div>
      <button @click="message = ''" type="button" class="text-emerald-600 hover:text-emerald-800 text-xs">✕</button>
    </div>

    <div
      v-if="error"
      class="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center justify-between"
    >
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
        <span>{{ error }}</span>
      </div>
      <button @click="error = ''" type="button" class="text-rose-600 hover:text-rose-800 text-xs">✕</button>
    </div>
  </div>
</template>
