<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useDyrectedClient } from "#imports";
import { adminAuthHeaders } from "~/utils/admin-auth";

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
const sending = ref(false);
const sendSuccess = ref("");
const error = ref("");
const copied = ref(false);
const emailInput = ref("");
const isEmailEdited = ref(false);
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

const rsvpId = computed(() => {
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

const record = computed<Record<string, any>>(() => {
  const ctx = props.context || {};
  return {
    ...(fetchedDoc.value || {}),
    ...(typeof props.value === "object" && props.value !== null ? props.value : {}),
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
  const current = record.value;
  if (current.leadName && current.leadEmail !== undefined && current.editToken !== undefined) {
    if (!isEmailEdited.value) {
      emailInput.value = current.leadEmail || "";
    }
    return;
  }

  const id = rsvpId.value;
  if (!id) return;

  loadingDoc.value = true;
  try {
    if (client) {
      const res = await client.collection("rsvp_records").find({
        where: { id: { equals: id } },
        limit: 1,
      });
      if (res?.docs?.[0]) {
        fetchedDoc.value = res.docs[0];
        if (!isEmailEdited.value) {
          emailInput.value = res.docs[0].leadEmail || "";
        }
        return;
      }
    }

    const data = await $fetch<any>(`/api/dyrected/api/collections/rsvp_records/${id}`, {
      headers: adminAuthHeaders(),
    });
    if (data?.id) {
      fetchedDoc.value = data;
      if (!isEmailEdited.value) {
        emailInput.value = data.leadEmail || "";
      }
    }
  } catch (err) {
    console.warn("Failed to fetch full RSVP record in ResendConfirmationAction:", err);
  } finally {
    loadingDoc.value = false;
  }
}

onMounted(() => {
  fetchRecordIfNeeded();
});

watch(rsvpId, () => {
  fetchRecordIfNeeded();
});

const leadName = computed(() => (record.value.leadName as string) ?? "");
const leadEmail = computed(() => (record.value.leadEmail as string) ?? "");
const hasSpouse = computed(() => Boolean(record.value.hasSpouse));
const spouseName = computed(() => (record.value.spouseName as string) ?? "");
const attending = computed(() => record.value.attending === true || record.value.attending === "true");
const editToken = computed(() => (record.value.editToken as string) ?? "");
const wantsAsoebi = computed(() => Boolean(record.value.wantsAsoebi));
const asoebiYards = computed(() => (record.value.asoebiYards as string) ?? "");
const wantsAsoOke = computed(() => Boolean(record.value.wantsAsoOke));
const asoOkeMaleQty = computed(() => Number(record.value.asoOkeMaleQty || 0));
const asoOkeFemaleQty = computed(() => Number(record.value.asoOkeFemaleQty || 0));
const groupName = computed(() => {
  const g = record.value.group;
  if (!g) return "";
  if (typeof g === "object") return g.name || "";
  return "";
});

watch(
  leadEmail,
  (val) => {
    if (!isEmailEdited.value && val) {
      emailInput.value = val;
    }
  },
  { immediate: true },
);

const displayName = computed(() => {
  if (hasSpouse.value && spouseName.value) {
    return `${leadName.value} & ${spouseName.value}`;
  }
  return leadName.value || "Guest";
});

const expectedSubject = computed(() => {
  if (!leadName.value) return "RSVP Confirmation Email";
  return attending.value
    ? `You're on the list, ${leadName.value}! 🎉`
    : `We'll miss you, ${leadName.value}`;
});

const editLink = computed(() => {
  const token = editToken.value;
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    return token ? `${origin}/rsvp?token=${token}` : `${origin}/rsvp`;
  }
  return token ? `https://thesweetunion.com/rsvp?token=${token}` : `https://thesweetunion.com/rsvp`;
});

function copyEditLink() {
  if (!editLink.value) return;
  navigator.clipboard.writeText(editLink.value).then(() => {
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2500);
  });
}

async function resendConfirmation() {
  const id = rsvpId.value;
  if (!id || sending.value) return;

  const emailToSend = emailInput.value.trim();
  if (!emailToSend) {
    error.value = "Please provide an email address for this guest.";
    return;
  }

  sending.value = true;
  error.value = "";
  sendSuccess.value = "";

  try {
    const res = await $fetch<any>(`/api/rsvp/resend-confirmation/${id}`, {
      method: "POST",
      headers: adminAuthHeaders(),
      body: {
        email: emailToSend,
      },
    });

    sendSuccess.value = res.message || `Confirmation email sent to ${emailToSend}!`;

    if (fetchedDoc.value) {
      fetchedDoc.value.leadEmail = emailToSend;
      if (res.editLink) {
        const tokenMatch = res.editLink.match(/token=([^&]+)/);
        if (tokenMatch?.[1]) {
          fetchedDoc.value.editToken = tokenMatch[1];
        }
      }
    }

    if (props.onChange) {
      props.onChange({
        leadEmail: emailToSend,
      });
    }
  } catch (err: any) {
    error.value = err?.data?.message || err.message || "Failed to send confirmation email.";
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <div class="resend-email-wrap">
    <div v-if="loadingDoc" class="loading-state">
      <div class="spinner"></div>
      <span>Loading RSVP details…</span>
    </div>

    <template v-else-if="!rsvpId">
      <p class="empty-note">Please save this guest record first.</p>
    </template>

    <template v-else>
      <!-- Guest Header Card -->
      <div class="guest-card">
        <div class="guest-info">
          <div class="name-row">
            <h4 class="guest-name">{{ displayName }}</h4>
            <span class="status-pill" :class="attending ? 'pill-attending' : 'pill-declined'">
              {{ attending ? "Attending" : "Declined" }}
            </span>
          </div>
          <div class="meta-row">
            <span v-if="groupName" class="meta-item">👥 {{ groupName }}</span>
            <span class="meta-item">✉️ {{ leadEmail || "No email stored" }}</span>
          </div>
        </div>
      </div>

      <!-- Recipient Email Form -->
      <div class="section-card">
        <label class="field-label">Recipient Email Address</label>
        <div class="input-row">
          <input
            v-model="emailInput"
            type="email"
            class="text-input"
            placeholder="guest@example.com"
            @input="isEmailEdited = true"
          />
        </div>
        <p class="hint-text">
          If the guest noticed a typo or provided a new email, edit it above. Resending will also update their email on file.
        </p>
      </div>

      <!-- Email Contents Breakdown -->
      <div class="breakdown-card">
        <div class="breakdown-header">
          <span class="breakdown-title">What the guest will receive</span>
          <span class="subject-tag">{{ expectedSubject }}</span>
        </div>

        <ul class="items-list">
          <li class="item-row">
            <span class="check-icon">✓</span>
            <div>
              <strong>RSVP Status Confirmation:</strong>
              <span>{{ attending ? `Confirmed attending (${hasSpouse ? "2 seats" : "1 seat"})` : "Declined RSVP" }}</span>
            </div>
          </li>

          <li v-if="attending" class="item-row">
            <span class="check-icon">✓</span>
            <div>
              <strong>Wedding Events &amp; Calendar:</strong>
              <span>Ceremony &amp; Reception schedule with Google Calendar links</span>
            </div>
          </li>

          <li class="item-row">
            <span class="check-icon">✓</span>
            <div>
              <strong>RSVP Edit Link:</strong>
              <span>Allows guest to update attendance or meal notes if plans change</span>
            </div>
          </li>

          <li v-if="wantsAsoebi || wantsAsoOke" class="item-row highlight-row">
            <span class="check-icon">✓</span>
            <div>
              <strong>Aso Ebi &amp; Bank Details:</strong>
              <span>
                {{ wantsAsoebi ? `${asoebiYards} yds fabric ` : "" }}
                {{ wantsAsoOke ? `(${asoOkeMaleQty} caps, ${asoOkeFemaleQty} gele) ` : "" }}
                &bull; Bank account details and WhatsApp proof submission link
              </span>
            </div>
          </li>

          <li class="item-row">
            <span class="check-icon">✓</span>
            <div>
              <strong>Gift Wishlist Link:</strong>
              <span>Direct link to the Sweet Union gift registry</span>
            </div>
          </li>
        </ul>

        <!-- Direct Edit Link Action -->
        <div class="quick-link-box">
          <div class="link-info">
            <span class="link-label">Direct RSVP Edit Link</span>
            <span class="link-url">{{ editLink }}</span>
          </div>
          <button type="button" class="copy-btn" @click="copyEditLink">
            {{ copied ? "✓ Copied!" : "Copy Link" }}
          </button>
        </div>
      </div>

      <!-- Alerts -->
      <div v-if="sendSuccess" class="alert alert-success">
        <span class="alert-icon">✓</span>
        <span>{{ sendSuccess }}</span>
      </div>

      <div v-if="error" class="alert alert-error">
        <span class="alert-icon">⚠️</span>
        <span>{{ error }}</span>
      </div>

      <!-- Action Button -->
      <div class="action-footer">
        <button
          type="button"
          class="submit-btn"
          :disabled="sending || !emailInput.trim()"
          @click="resendConfirmation"
        >
          <span v-if="sending" class="spinner-small"></span>
          <span>{{ sending ? "Sending Confirmation Email…" : "📨 Resend RSVP Confirmation Email" }}</span>
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.resend-email-wrap {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 6px 0;
  font-family: inherit;
  color: #1f2937;
}

.loading-state {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px;
  color: #6b7280;
  font-size: 13px;
}

.empty-note {
  font-size: 13px;
  color: #9ca3af;
  font-style: italic;
  padding: 12px 0;
}

.guest-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fdfaf8;
  border: 1px solid #fed7aa;
  border-radius: 10px;
  padding: 12px 16px;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.guest-name {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #462137;
}

.status-pill {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.pill-attending {
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
}

.pill-declined {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.meta-row {
  display: flex;
  gap: 14px;
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
}

.section-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 14px 16px;
}

.field-label {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.text-input {
  width: 100%;
  padding: 9px 12px;
  font-size: 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #f9fafb;
  color: #111827;
  outline: none;
  transition: all 0.15s ease;
}

.text-input:focus {
  border-color: #865172;
  background: #fff;
  box-shadow: 0 0 0 2px rgba(134, 81, 114, 0.15);
}

.hint-text {
  margin: 0;
  font-size: 11px;
  color: #6b7280;
  line-height: 1.4;
}

.breakdown-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #faf5f8;
  border: 1px solid #eedde6;
  border-radius: 10px;
  padding: 14px 16px;
}

.breakdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.breakdown-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #865172;
}

.subject-tag {
  font-size: 11px;
  background: #ffffff;
  color: #462137;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid #e2cdd9;
  font-family: Georgia, serif;
}

.items-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: #4b5563;
  line-height: 1.4;
}

.highlight-row {
  background: #fff7ed;
  border: 1px solid #fed7aa;
  padding: 6px 8px;
  border-radius: 6px;
  color: #9a3412;
}

.check-icon {
  color: #865172;
  font-weight: bold;
}

.quick-link-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: #ffffff;
  border: 1px dashed #d1d5db;
  border-radius: 6px;
  padding: 8px 12px;
  margin-top: 4px;
}

.link-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.link-label {
  font-size: 10px;
  text-transform: uppercase;
  color: #9ca3af;
  font-weight: 600;
}

.link-url {
  font-size: 11px;
  color: #865172;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: monospace;
}

.copy-btn {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.copy-btn:hover {
  background: #e5e7eb;
}

.alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
}

.alert-success {
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.alert-error {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.action-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}

.submit-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #865172;
  color: #ffffff;
  border: none;
  padding: 10px 20px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.15s ease;
}

.submit-btn:hover:not(:disabled) {
  background: #6e3d5c;
  transform: translateY(-1px);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e5e7eb;
  border-top-color: #865172;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.spinner-small {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
