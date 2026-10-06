<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useDyrectedClient } from "#imports";
import { useCachedDyrectedGlobal } from "~/composables/useCachedData";
import { adminAuthHeaders } from "~/utils/admin-auth";
import { buildWhatsAppThankYouText } from "~~/dyrected/reminder-message";

/**
 * "Manage Gift" action dialog for wishlist reservations.
 * Lets admins update whether a pledged/reminded gift has been received,
 * record the amount paid, add verification notes, or send a WhatsApp thank you.
 *
 * Registered as "reservations.manageGift" in pages/admin.vue.
 */
const props = defineProps<{
  doc?: Record<string, any>;
  data?: Record<string, any>;
  record?: Record<string, any>;
  row?: Record<string, any>;
  ids?: string[];
  user?: any;
  value?: any;
  onChange?: (...args: any[]) => void;
  field?: Record<string, any>;
  path?: string;
  disabled?: boolean;
  collection?: string;
  context?: {
    user?: Record<string, unknown> | null;
    schemas?: Record<string, unknown>;
    siblingData?: Record<string, unknown>;
    doc?: Record<string, unknown>;
    row?: Record<string, unknown>;
    record?: Record<string, unknown>;
    data?: Record<string, unknown>;
    formData?: Record<string, unknown>;
    ids?: string[];
  };
}>();

const client = useDyrectedClient();
const loadingDoc = ref(false);
const saving = ref(false);
const saved = ref(false);
const error = ref("");
const fetchedDoc = ref<Record<string, any> | null>(null);

const ROUTE_SEGMENTS = new Set(["admin", "create", "collections", "globals"]);
function readIdFromUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const pathId = window.location.pathname.split("/").filter(Boolean).at(-1);
  if (pathId && !ROUTE_SEGMENTS.has(pathId)) return pathId;
  const hashId = window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).at(-1);
  if (hashId && !ROUTE_SEGMENTS.has(hashId)) return hashId;
  return undefined;
}

const reservationId = computed(() => {
  return (
    props.doc?.id ||
    props.context?.doc?.id ||
    props.context?.row?.id ||
    (props as any).row?.id ||
    (props as any).ids?.[0] ||
    props.context?.ids?.[0] ||
    readIdFromUrl()
  );
});

const currentRecord = computed<Record<string, any>>(() => {
  const ctx = props.context || {};
  return {
    ...(fetchedDoc.value || {}),
    ...(ctx.formData || {}),
    ...(ctx.siblingData || {}),
    ...(ctx.data || {}),
    ...(ctx.record || {}),
    ...(ctx.row || {}),
    ...(ctx.doc || {}),
    ...((props as any).data || {}),
    ...((props as any).record || {}),
    ...((props as any).row || {}),
    ...(props.doc || {}),
  };
});

async function fetchRecordIfNeeded() {
  const current = currentRecord.value;
  if (current.guestName && current.item && typeof current.item === "object") {
    syncFormFields(current);
    return;
  }
  const id = reservationId.value;
  if (!id) return;

  loadingDoc.value = true;
  try {
    if (client) {
      const res = await client.collection("reservations").find({
        where: { id: { equals: id } },
        limit: 1,
        depth: 1,
      });
      if (res?.docs?.[0]) {
        fetchedDoc.value = res.docs[0];
        syncFormFields(res.docs[0]);
        return;
      }
    }
    const data = await $fetch<any>(`/api/dyrected/api/collections/reservations/${id}?depth=1`, {
      headers: adminAuthHeaders(),
    });
    if (data?.id) {
      fetchedDoc.value = data;
      syncFormFields(data);
    }
  } catch (err) {
    console.warn("Failed to fetch reservation record in Manage Gift dialog:", err);
  } finally {
    loadingDoc.value = false;
  }
}

onMounted(fetchRecordIfNeeded);
watch(reservationId, fetchRecordIfNeeded);

// ─── Display Details ──────────────────────────────────────────────────────────
const guestName = computed(() => (currentRecord.value.guestName as string) ?? "");
const itemName = computed(() => {
  const it = currentRecord.value.item;
  return (typeof it === "object" ? it?.name : it) ?? "Gift item";
});
const itemPrice = computed(() => {
  const it = currentRecord.value.item;
  return typeof it === "object" ? Number(it?.price) || 0 : 0;
});
const quantity = computed(() => Number(currentRecord.value.quantity) || 1);
const contributionAmount = computed(() => Number(currentRecord.value.contributionAmount) || 0);
const paymentOption = computed(() => (currentRecord.value.paymentOption as string) || "bank_transfer");
const paymentTiming = computed(() => (currentRecord.value.paymentTiming as string) || "later");
const reminderChannel = computed(() => (currentRecord.value.reminderChannel as string) || "");
const reminderContact = computed(() => (currentRecord.value.reminderContact as string) || "");
const reminderSentAt = computed(() => (currentRecord.value.reminderSentAt as string) || "");

// ─── Editable Form State ────────────────────────────────────────────────────
const giftStatus = ref<"pending" | "received" | "delivered" | "cancelled">("pending");
const amountReceived = ref<number>(0);
const giftReceivedAt = ref<string>("");
const giftNotes = ref<string>("");

function toDatetimeLocal(isoStr?: string): string {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

function syncFormFields(rec: Record<string, any>) {
  giftStatus.value = rec.giftStatus || "pending";
  amountReceived.value =
    rec.amountReceived !== undefined && rec.amountReceived !== null
      ? Number(rec.amountReceived)
      : Number(rec.contributionAmount) || 0;
  giftReceivedAt.value = toDatetimeLocal(rec.giftReceivedAt);
  giftNotes.value = rec.giftNotes || "";
}

function setStatus(status: "pending" | "received" | "delivered" | "cancelled") {
  giftStatus.value = status;
  if (status === "received" || status === "delivered") {
    if (!giftReceivedAt.value) {
      giftReceivedAt.value = toDatetimeLocal(new Date().toISOString());
    }
    if (!amountReceived.value && contributionAmount.value > 0) {
      amountReceived.value = contributionAmount.value;
    }
  } else if (status === "cancelled") {
    // If cancelled, keep notes for reference
  }
}

// ─── Save Action ────────────────────────────────────────────────────────────
async function saveGiftStatus() {
  const id = reservationId.value;
  if (!id) {
    error.value = "Cannot identify reservation ID";
    return;
  }
  saving.value = true;
  error.value = "";
  saved.value = false;

  try {
    const payload: Record<string, any> = {
      id,
      giftStatus: giftStatus.value,
      amountReceived: Number(amountReceived.value) || 0,
      giftReceivedAt: giftReceivedAt.value ? new Date(giftReceivedAt.value).toISOString() : undefined,
      giftNotes: giftNotes.value.trim(),
    };

    const res = await $fetch<any>("/api/reservations/manage", {
      method: "POST",
      headers: adminAuthHeaders(),
      body: payload,
    });

    if (res?.success) {
      saved.value = true;
      if (res.reservation) {
        fetchedDoc.value = res.reservation;
      }
      if (typeof props.onChange === "function") {
        props.onChange(payload);
      }
    } else {
      error.value = res?.message || "Failed to update gift status.";
    }
  } catch (err: any) {
    console.error("Save gift error:", err);
    error.value = err?.data?.message || err?.message || "Error saving gift status";
  } finally {
    saving.value = false;
  }
}

// ─── WhatsApp Thank You Message ─────────────────────────────────────────────
const { data: siteSettings } = useCachedDyrectedGlobal("site_settings");
const showThankYou = ref(false);
const thankYouCopied = ref(false);

const coupleNames = computed(() => {
  const s = siteSettings.value as any;
  return [s?.partnerOneName, s?.partnerTwoName].filter(Boolean).join(" & ") || "Busola & Joel";
});

const thankYouMessage = computed(() => {
  const amt = Number(amountReceived.value) || Number(contributionAmount.value) || 0;
  return buildWhatsAppThankYouText(guestName.value || "there", itemName.value, amt, coupleNames.value);
});

const thankYouPhone = computed(() => {
  return reminderContact.value.replace(/[^0-9+]/g, "");
});

function openWhatsAppThankYou() {
  const text = encodeURIComponent(thankYouMessage.value);
  const phone = thankYouPhone.value.replace(/^0/, "234").replace(/^\+/, "");
  const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
  window.open(url, "_blank");
}

function copyThankYouText() {
  if (navigator?.clipboard) {
    navigator.clipboard.writeText(thankYouMessage.value);
    thankYouCopied.value = true;
    setTimeout(() => {
      thankYouCopied.value = false;
    }, 2500);
  }
}
</script>

<template>
  <div class="space-y-4 text-gray-900 max-w-lg mx-auto py-1">
    <!-- Loading skeleton -->
    <div v-if="loadingDoc" class="animate-pulse space-y-3">
      <div class="h-6 bg-gray-200 rounded w-1/2"></div>
      <div class="h-24 bg-gray-100 rounded-lg"></div>
      <div class="h-10 bg-gray-200 rounded"></div>
    </div>

    <template v-else>
      <!-- Guest & Item Summary Card -->
      <div class="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl">
        <div class="flex items-start justify-between gap-2">
          <div>
            <h4 class="text-sm font-bold text-gray-900">{{ guestName || "Guest" }}</h4>
            <p class="text-xs text-amber-900 font-medium mt-0.5">
              {{ itemName }}
              <span v-if="quantity > 1" class="text-amber-700 font-semibold">(Qty: {{ quantity }})</span>
            </p>
          </div>
          <div class="text-right">
            <span class="text-xs font-bold text-gray-900">
              ₦{{ (contributionAmount || itemPrice).toLocaleString("en-US") }}
            </span>
            <div class="text-[10px] text-gray-500 uppercase tracking-wide">
              {{ paymentTiming === "now" ? "Paid Now" : "Pay Later" }} &bull;
              {{
                paymentOption === "bring_to_wedding"
                  ? "At Wedding"
                  : paymentOption === "purchase_link"
                  ? "Direct Buy"
                  : "Bank Transfer"
              }}
            </div>
          </div>
        </div>

        <div v-if="reminderSentAt" class="mt-2 pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px] text-amber-950">
          <span>Reminder Sent:</span>
          <span class="font-semibold text-emerald-800">
            {{ new Date(reminderSentAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) }}
          </span>
        </div>
      </div>

      <!-- Status Selection Chips -->
      <div>
        <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
          Fulfillment Status
        </label>
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            @click="setStatus('received')"
            :class="[
              giftStatus === 'received'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50',
            ]"
            class="px-3 py-2 text-xs font-semibold rounded-lg border transition-all text-left flex items-center justify-between cursor-pointer"
          >
            <span>Gift Received / Paid</span>
            <span>✅</span>
          </button>

          <button
            type="button"
            @click="setStatus('delivered')"
            :class="[
              giftStatus === 'delivered'
                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300 hover:bg-purple-50/50',
            ]"
            class="px-3 py-2 text-xs font-semibold rounded-lg border transition-all text-left flex items-center justify-between cursor-pointer"
          >
            <span>Delivered at Wedding</span>
            <span>🎁</span>
          </button>

          <button
            type="button"
            @click="setStatus('pending')"
            :class="[
              giftStatus === 'pending'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-white text-gray-700 border-gray-200 hover:border-amber-300 hover:bg-amber-50/50',
            ]"
            class="px-3 py-2 text-xs font-semibold rounded-lg border transition-all text-left flex items-center justify-between cursor-pointer"
          >
            <span>Pending / Pledged</span>
            <span>⏳</span>
          </button>

          <button
            type="button"
            @click="setStatus('cancelled')"
            :class="[
              giftStatus === 'cancelled'
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-white text-gray-700 border-gray-200 hover:border-rose-300 hover:bg-rose-50/50',
            ]"
            class="px-3 py-2 text-xs font-semibold rounded-lg border transition-all text-left flex items-center justify-between cursor-pointer"
          >
            <span>Cancelled / Released</span>
            <span>✕</span>
          </button>
        </div>
      </div>

      <!-- Financial & Verification Fields -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <!-- Amount Received -->
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
            Amount Received (₦)
          </label>
          <div class="relative">
            <span class="absolute left-3 top-2 text-sm text-gray-400 font-bold">₦</span>
            <input
              v-model.number="amountReceived"
              type="number"
              placeholder="e.g. 20000"
              class="w-full pl-8 pr-3 py-2 text-sm font-semibold border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <p class="text-[11px] text-gray-500 mt-0.5">
            Confirmed bank payment or cash fund.
          </p>
        </div>

        <!-- Date Received -->
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
            Date &amp; Time Received
          </label>
          <input
            v-model="giftReceivedAt"
            type="datetime-local"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <p class="text-[11px] text-gray-500 mt-0.5">
            Stamps when payment was verified.
          </p>
        </div>
      </div>

      <!-- Admin Notes -->
      <div>
        <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
          Fulfillment &amp; Verification Notes
        </label>
        <textarea
          v-model="giftNotes"
          rows="2"
          placeholder="e.g. Verified GTBank alert from Tunde, or physical gift handed over at reception..."
          class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
        ></textarea>
      </div>

      <!-- Save Button -->
      <div class="pt-1">
        <button
          type="button"
          :disabled="saving"
          @click="saveGiftStatus"
          class="w-full px-4 py-2.5 text-sm font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
        >
          <span v-if="saving" class="animate-spin text-base">⏳</span>
          <span>{{ saving ? "Saving Updates…" : "Save & Update Gift" }}</span>
        </button>
      </div>

      <!-- Status Alerts -->
      <div v-if="error" class="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-800">
        ✕ {{ error }}
      </div>
      <div v-else-if="saved" class="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800 flex items-center justify-between">
        <span>✓ Gift status and registry stats successfully updated!</span>
      </div>

      <!-- WhatsApp Thank You Section -->
      <div v-if="giftStatus === 'received' || giftStatus === 'delivered'" class="mt-4 pt-3 border-t border-gray-200">
        <button
          type="button"
          @click="showThankYou = !showThankYou"
          class="flex items-center justify-between w-full text-xs font-bold text-amber-900 hover:text-amber-700 py-1 cursor-pointer"
        >
          <span class="flex items-center space-x-1.5">
            <span>💬</span>
            <span>Send WhatsApp Thank You to {{ guestName || "Guest" }}</span>
          </span>
          <span class="text-xs">{{ showThankYou ? "▲ Hide" : "▼ Show Message" }}</span>
        </button>

        <div v-if="showThankYou" class="mt-2.5 p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2.5">
          <textarea
            :value="thankYouMessage"
            readonly
            rows="6"
            class="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg font-mono bg-white text-gray-800 whitespace-pre-wrap"
          ></textarea>

          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="openWhatsAppThankYou"
              class="flex-1 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <span>💬 Open WhatsApp</span>
            </button>
            <button
              type="button"
              @click="copyThankYouText"
              class="px-3 py-2 text-xs font-medium border border-gray-300 bg-white hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              {{ thankYouCopied ? "✓ Copied" : "Copy Text" }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
