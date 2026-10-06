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
  <div class="mg-modal-root">
    <!-- Skeleton loader -->
    <div v-if="loadingDoc" class="mg-skeleton">
      <div class="mg-skeleton-line short"></div>
      <div class="mg-skeleton-card"></div>
      <div class="mg-skeleton-line"></div>
    </div>

    <template v-else>
      <!-- Summary Header Card -->
      <div class="mg-card">
        <div class="mg-card-header">
          <div class="mg-card-info">
            <h4 class="mg-guest-name">{{ guestName || "Guest" }}</h4>
            <div class="mg-item-row">
              <span class="mg-item-name">{{ itemName }}</span>
              <span v-if="quantity > 1" class="mg-qty-badge">Qty: {{ quantity }}</span>
            </div>
          </div>
          <div class="mg-card-pricing">
            <span class="mg-amount-display">
              ₦{{ (contributionAmount || itemPrice).toLocaleString("en-US") }}
            </span>
            <span class="mg-timing-tag">
              {{ paymentTiming === "now" ? "Immediate" : "Pledged" }} &bull;
              {{
                paymentOption === "bring_to_wedding"
                  ? "At Venue"
                  : paymentOption === "purchase_link"
                  ? "Direct Buy"
                  : "Bank Transfer"
              }}
            </span>
          </div>
        </div>

        <div v-if="reminderSentAt" class="mg-reminder-pill">
          <svg class="mg-inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0" />
          </svg>
          <span>
            Reminder dispatched:
            <strong>{{ new Date(reminderSentAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) }}</strong>
          </span>
        </div>
      </div>

      <!-- Status Selection -->
      <div class="mg-section">
        <label class="mg-label">Fulfillment Status</label>
        <div class="mg-status-grid">
          <!-- Received -->
          <button
            type="button"
            class="mg-status-btn"
            :class="{ 'active-received': giftStatus === 'received' }"
            @click="setStatus('received')"
          >
            <span class="mg-btn-text">Gift Received</span>
            <svg class="mg-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>

          <!-- Delivered -->
          <button
            type="button"
            class="mg-status-btn"
            :class="{ 'active-delivered': giftStatus === 'delivered' }"
            @click="setStatus('delivered')"
          >
            <span class="mg-btn-text">Delivered at Venue</span>
            <svg class="mg-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 12 20 22 4 22 4 12" />
              <rect x="2" y="7" width="20" height="5" />
              <line x1="12" y1="22" x2="12" y2="7" />
              <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
              <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
            </svg>
          </button>

          <!-- Pending -->
          <button
            type="button"
            class="mg-status-btn"
            :class="{ 'active-pending': giftStatus === 'pending' }"
            @click="setStatus('pending')"
          >
            <span class="mg-btn-text">Pending / Pledged</span>
            <svg class="mg-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </button>

          <!-- Cancelled -->
          <button
            type="button"
            class="mg-status-btn"
            :class="{ 'active-cancelled': giftStatus === 'cancelled' }"
            @click="setStatus('cancelled')"
          >
            <span class="mg-btn-text">Cancelled / Released</span>
            <svg class="mg-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Financial & Verification Fields -->
      <div class="mg-two-cols">
        <!-- Amount Received -->
        <div class="mg-field">
          <label class="mg-label">Amount Received (₦)</label>
          <div class="mg-input-prefix-box">
            <span class="mg-prefix">₦</span>
            <input
              v-model.number="amountReceived"
              type="number"
              placeholder="0"
              class="mg-input with-prefix"
            />
          </div>
          <span class="mg-hint">Actual payment or cash fund recorded.</span>
        </div>

        <!-- Date Received -->
        <div class="mg-field">
          <label class="mg-label">Date &amp; Time Verified</label>
          <input
            v-model="giftReceivedAt"
            type="datetime-local"
            class="mg-input"
          />
          <span class="mg-hint">Timestamp when receipt was confirmed.</span>
        </div>
      </div>

      <!-- Admin Notes -->
      <div class="mg-field">
        <label class="mg-label">Verification &amp; Handover Notes</label>
        <textarea
          v-model="giftNotes"
          rows="2"
          placeholder="e.g. Verified GTBank bank transfer alert, or received physical box at gift table..."
          class="mg-textarea"
        ></textarea>
      </div>

      <!-- Save Button -->
      <div class="mg-submit-wrap">
        <button
          type="button"
          class="mg-submit-btn"
          :disabled="saving"
          @click="saveGiftStatus"
        >
          <svg v-if="saving" class="mg-spinner" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="32" stroke-dashoffset="12" />
          </svg>
          <svg v-else class="mg-submit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{{ saving ? "Updating Records…" : "Save Gift Status" }}</span>
        </button>
      </div>

      <!-- Alerts -->
      <div v-if="error" class="mg-alert mg-alert-error">
        <svg class="mg-alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{{ error }}</span>
      </div>

      <div v-else-if="saved" class="mg-alert mg-alert-success">
        <svg class="mg-alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>Gift status updated and wishlist registry metrics synchronized.</span>
      </div>

      <!-- WhatsApp Thank You Section -->
      <div v-if="giftStatus === 'received' || giftStatus === 'delivered'" class="mg-thankyou-section">
        <button
          type="button"
          class="mg-thankyou-toggle"
          @click="showThankYou = !showThankYou"
        >
          <div class="mg-thankyou-toggle-left">
            <svg class="mg-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            <span>Send WhatsApp Thank You</span>
          </div>
          <svg class="mg-chevron" :class="{ 'is-open': showThankYou }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <div v-if="showThankYou" class="mg-thankyou-body">
          <textarea
            :value="thankYouMessage"
            readonly
            rows="5"
            class="mg-thankyou-preview"
          ></textarea>

          <div class="mg-thankyou-actions">
            <button
              type="button"
              class="mg-btn-wa"
              @click="openWhatsAppThankYou"
            >
              <svg class="mg-icon-btn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              <span>Open in WhatsApp</span>
            </button>

            <button
              type="button"
              class="mg-btn-copy"
              @click="copyThankYouText"
            >
              <svg v-if="!thankYouCopied" class="mg-icon-btn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <svg v-else class="mg-icon-btn text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{{ thankYouCopied ? "Copied" : "Copy Message" }}</span>
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* ── Root Layout & Typography ─────────────────────────────────────────── */
.mg-modal-root {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: #0f172a;
  max-width: 520px;
  margin: 0 auto;
  padding: 4px 2px;
  box-sizing: border-box;
  line-height: 1.45;
}

.mg-modal-root * {
  box-sizing: border-box;
}

/* ── Skeleton Loading ─────────────────────────────────────────────────── */
.mg-skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0;
}
.mg-skeleton-line {
  height: 14px;
  background: #e2e8f0;
  border-radius: 4px;
  animation: mg-pulse 1.4s ease-in-out infinite;
}
.mg-skeleton-line.short {
  width: 40%;
}
.mg-skeleton-card {
  height: 80px;
  background: #f1f5f9;
  border-radius: 8px;
  animation: mg-pulse 1.4s ease-in-out infinite;
}
@keyframes mg-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}

/* ── Summary Card ─────────────────────────────────────────────────────── */
.mg-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  padding: 12px 14px;
  margin-bottom: 16px;
}
.mg-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.mg-card-info {
  flex: 1;
  min-width: 0;
}
.mg-guest-name {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.01em;
}
.mg-item-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
}
.mg-item-name {
  font-size: 12px;
  color: #475569;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mg-qty-badge {
  font-size: 10px;
  font-weight: 600;
  color: #64748b;
  background: #e2e8f0;
  padding: 1px 5px;
  border-radius: 4px;
}
.mg-card-pricing {
  text-align: right;
  flex-shrink: 0;
}
.mg-amount-display {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.01em;
}
.mg-timing-tag {
  display: block;
  font-size: 10px;
  font-weight: 500;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-top: 2px;
}
.mg-reminder-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #e2e8f0;
  font-size: 11px;
  color: #475569;
}
.mg-inline-icon {
  width: 12px;
  height: 12px;
  color: #64748b;
  flex-shrink: 0;
}

/* ── Section & Labels ─────────────────────────────────────────────────── */
.mg-section {
  margin-bottom: 14px;
}
.mg-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}

/* ── Status Grid & Buttons ────────────────────────────────────────────── */
.mg-status-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.mg-status-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  border-radius: 7px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #334155;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 120ms ease;
  outline: none;
}
.mg-status-btn:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}
.mg-btn-text {
  white-space: nowrap;
}
.mg-status-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: #94a3b8;
  transition: color 120ms ease;
}

/* Active status states */
.mg-status-btn.active-received {
  background: #ecfdf5;
  border-color: #059669;
  color: #065f46;
  font-weight: 600;
}
.mg-status-btn.active-received .mg-status-icon {
  color: #059669;
}

.mg-status-btn.active-delivered {
  background: #f5f3ff;
  border-color: #7c3aed;
  color: #5b21b6;
  font-weight: 600;
}
.mg-status-btn.active-delivered .mg-status-icon {
  color: #7c3aed;
}

.mg-status-btn.active-pending {
  background: #fffbeb;
  border-color: #d97706;
  color: #92400e;
  font-weight: 600;
}
.mg-status-btn.active-pending .mg-status-icon {
  color: #d97706;
}

.mg-status-btn.active-cancelled {
  background: #fff1f2;
  border-color: #e11d48;
  color: #9f1239;
  font-weight: 600;
}
.mg-status-btn.active-cancelled .mg-status-icon {
  color: #e11d48;
}

/* ── Form Inputs ──────────────────────────────────────────────────────── */
.mg-two-cols {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 12px;
}
.mg-field {
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;
}
.mg-input-prefix-box {
  position: relative;
  width: 100%;
}
.mg-prefix {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
  pointer-events: none;
}
.mg-input {
  width: 100%;
  height: 36px;
  padding: 0 10px;
  font-size: 13px;
  font-family: inherit;
  color: #0f172a;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  outline: none;
  transition: border-color 120ms, box-shadow 120ms;
}
.mg-input.with-prefix {
  padding-left: 26px;
}
.mg-input:focus,
.mg-textarea:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}
.mg-textarea {
  width: 100%;
  padding: 8px 10px;
  font-size: 13px;
  font-family: inherit;
  color: #0f172a;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  outline: none;
  resize: vertical;
  min-height: 56px;
  transition: border-color 120ms, box-shadow 120ms;
}
.mg-hint {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 4px;
}

/* ── Submit Button ────────────────────────────────────────────────────── */
.mg-submit-wrap {
  margin-top: 4px;
}
.mg-submit-btn {
  width: 100%;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  background: #0f172a;
  border: 1px solid #0f172a;
  border-radius: 7px;
  cursor: pointer;
  transition: background-color 120ms, opacity 120ms;
  outline: none;
}
.mg-submit-btn:hover:not(:disabled) {
  background: #1e293b;
  border-color: #1e293b;
}
.mg-submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.mg-submit-icon {
  width: 14px;
  height: 14px;
}
.mg-spinner {
  width: 14px;
  height: 14px;
  animation: mg-spin 0.7s linear infinite;
}
@keyframes mg-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ── Alerts ───────────────────────────────────────────────────────────── */
.mg-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  margin-top: 10px;
}
.mg-alert-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}
.mg-alert-error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}
.mg-alert-success {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
}

/* ── WhatsApp Thank You Section ───────────────────────────────────────── */
.mg-thankyou-section {
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px solid #e2e8f0;
}
.mg-thankyou-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 6px 0;
  background: transparent;
  border: none;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  outline: none;
  transition: color 120ms ease;
}
.mg-thankyou-toggle:hover {
  color: #0f172a;
}
.mg-thankyou-toggle-left {
  display: flex;
  align-items: center;
  gap: 6px;
}
.mg-icon-sm {
  width: 13px;
  height: 13px;
}
.mg-chevron {
  width: 14px;
  height: 14px;
  transition: transform 150ms ease;
}
.mg-chevron.is-open {
  transform: rotate(180deg);
}
.mg-thankyou-body {
  margin-top: 8px;
  padding: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 7px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.mg-thankyou-preview {
  width: 100%;
  padding: 8px 10px;
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 5px;
  color: #334155;
  outline: none;
  resize: vertical;
  line-height: 1.45;
}
.mg-thankyou-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.mg-btn-wa {
  flex: 1;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #ffffff;
  background: #16a34a;
  border: 1px solid #16a34a;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 120ms;
}
.mg-btn-wa:hover {
  background: #15803d;
}
.mg-btn-copy {
  height: 32px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #334155;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  cursor: pointer;
  transition: all 120ms;
}
.mg-btn-copy:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}
.mg-icon-btn {
  width: 13px;
  height: 13px;
}
</style>
