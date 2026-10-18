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
  if (current.leadName && current.leadEmail !== undefined) {
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
    console.warn("Failed to fetch full RSVP record in SendEmailPassAction:", err);
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
const invitationSent = computed(() => record.value.invitationSent === true || record.value.invitationSent === "true");
const invitationSentAt = computed(() => (record.value.invitationSentAt as string) ?? "");
const invitationSentVia = computed(() => (record.value.invitationSentVia as string) ?? "");

watch(leadEmail, (val) => {
  if (!isEmailEdited.value && val) {
    emailInput.value = val;
  }
}, { immediate: true });

const displayName = computed(() => {
  if (hasSpouse.value && spouseName.value) {
    return `${leadName.value} & ${spouseName.value}`;
  }
  return leadName.value || "Guest";
});

const sentBadgeLabel = computed(() => {
  if (!invitationSent.value) return null;
  const time = invitationSentAt.value
    ? new Date(invitationSentAt.value).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  return `Sent via ${invitationSentVia.value || "email"}${time ? ` · ${time}` : ""}`;
});

const passUrl = computed(() => {
  const id = rsvpId.value;
  if (!id) return "";
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    return `${origin}/pass/${id.toLowerCase()}`;
  }
  return `https://thesweetunion.com/pass/${id.toLowerCase()}`;
});

function copyPassLink() {
  if (!passUrl.value) return;
  navigator.clipboard.writeText(passUrl.value).then(() => {
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2500);
  });
}

async function sendEmail() {
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
    const res = await $fetch<any>(`/api/invitations/send-email/${id}`, {
      method: "POST",
      headers: adminAuthHeaders(),
      body: {
        email: emailToSend,
      },
    });

    sendSuccess.value = `Access pass email delivered to ${emailToSend}!`;

    const nowIso = new Date().toISOString();
    if (fetchedDoc.value) {
      fetchedDoc.value.invitationSent = true;
      fetchedDoc.value.invitationSentAt = nowIso;
      fetchedDoc.value.invitationSentVia = "email";
      fetchedDoc.value.leadEmail = emailToSend;
    }

    if (props.onChange) {
      props.onChange({
        invitationSent: true,
        invitationSentAt: nowIso,
        invitationSentVia: "email",
        leadEmail: emailToSend,
      });
    }
  } catch (err: any) {
    error.value = err?.data?.message || err.message || "Failed to send invitation email.";
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <div class="send-email-wrap">
    <div v-if="loadingDoc" class="loading-state">
      <div class="spinner"></div>
      <span>Loading guest details…</span>
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
            <span v-if="sentBadgeLabel" class="sent-badge">✓ {{ sentBadgeLabel }}</span>
            <span v-else class="unsent-badge">Not sent yet</span>
          </div>
        </div>

        <div class="link-actions">
          <button type="button" class="btn-chip" @click="copyPassLink">
            {{ copied ? "Copied! ✓" : "Copy Pass Link 🔗" }}
          </button>
          <a :href="passUrl" target="_blank" rel="noopener noreferrer" class="btn-chip">
            View Pass ↗
          </a>
        </div>
      </div>

      <!-- Email Destination Input -->
      <div class="input-section">
        <label class="field-label">
          <span>Recipient Email Address</span>
          <span v-if="isEmailEdited" class="edited-tag">(Updated)</span>
        </label>
        <div class="email-input-row">
          <div class="input-icon-wrap">
            <svg class="mail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            <input
              v-model="emailInput"
              type="email"
              class="email-input"
              placeholder="e.g. guest@example.com"
              @input="isEmailEdited = true"
            />
          </div>

          <button
            type="button"
            class="btn-send-email"
            :disabled="sending || !emailInput.trim()"
            @click="sendEmail"
          >
            <svg v-if="!sending" class="send-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            <span>{{ sending ? "Sending Pass…" : invitationSent ? "Resend Email Pass ✉️" : "Send Email Pass ✉️" }}</span>
          </button>
        </div>
        <p class="input-hint">
          Includes the customized digital invitation, access pass image with unique QR code, event schedule, and calendar details.
        </p>
      </div>

      <!-- Feedback Alerts -->
      <div v-if="sendSuccess" class="alert alert-success">
        <span class="alert-icon">✓</span>
        <span>{{ sendSuccess }}</span>
      </div>

      <div v-if="error" class="alert alert-error">
        <span class="alert-icon">⚠️</span>
        <span>{{ error }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.send-email-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 0;
  font-family: inherit;
  color: #2b1c28;
}

.loading-state {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #888;
  font-size: 0.85rem;
  padding: 12px 0;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #ebdbe5;
  border-top-color: #865172;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-note {
  font-size: 0.85rem;
  color: #888;
  font-style: italic;
  margin: 0;
}

.guest-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fcf9fb;
  border: 1px solid #ebdbe5;
  border-radius: 8px;
  padding: 10px 14px;
  gap: 12px;
  flex-wrap: wrap;
}

.guest-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.guest-name {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: #3b2837;
}

.status-pill {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.pill-attending {
  background: #e7f8ee;
  color: #17803d;
}

.pill-declined {
  background: #fee2e2;
  color: #b91c1c;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sent-badge {
  font-size: 0.775rem;
  font-weight: 600;
  color: #15803d;
}

.unsent-badge {
  font-size: 0.775rem;
  color: #887483;
}

.link-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-chip {
  background: #fff;
  border: 1px solid #d4c5cf;
  color: #5c354e;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.775rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  transition: all 150ms;
}

.btn-chip:hover {
  background: #f4ecf1;
  border-color: #865172;
}

.input-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #5c354e;
}

.edited-tag {
  color: #d97706;
  font-size: 0.7rem;
  font-weight: 600;
}

.email-input-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.input-icon-wrap {
  position: relative;
  flex: 1;
  min-width: 220px;
  display: flex;
  align-items: center;
}

.mail-icon {
  position: absolute;
  left: 10px;
  width: 15px;
  height: 15px;
  color: #887483;
  pointer-events: none;
}

.email-input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px 8px 32px;
  border-radius: 6px;
  border: 1px solid #d4c5cf;
  background: #fff;
  font-size: 0.875rem;
  color: #2b1c28;
  outline: none;
  transition: border-color 150ms;
}

.email-input:focus {
  border-color: #865172;
  box-shadow: 0 0 0 2px rgba(134, 81, 114, 0.15);
}

.btn-send-email {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #4a3746;
  color: #fff;
  border: 1px solid #4a3746;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms;
}

.btn-send-email:hover:not(:disabled) {
  background: #362633;
}

.btn-send-email:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-icon {
  width: 14px;
  height: 14px;
}

.input-hint {
  margin: 0;
  font-size: 0.75rem;
  color: #887483;
  line-height: 1.35;
}

.alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.825rem;
}

.alert-success {
  background: #e7f8ee;
  border: 1px solid #b7e8c6;
  color: #15803d;
}

.alert-error {
  background: #fef0ef;
  border: 1px solid #f8c9c7;
  color: #b33934;
}

.alert-icon {
  font-weight: 700;
}
</style>
