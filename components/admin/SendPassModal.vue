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
const config = useRuntimeConfig();
const appUrl = (config.public as any).appUrl || "https://thesweetunion.com";

const loading = ref(false);
const loadingDoc = ref(false);
const sendingWa = ref(false);
const sendingEmail = ref(false);
const sendSuccess = ref("");
const error = ref("");

const customMessage = ref(typeof props.value === "string" ? props.value : "");
const isUserEdited = ref(Boolean(typeof props.value === "string" && props.value.trim()));
const fetchedDoc = ref<Record<string, any> | null>(null);
const eventNames = ref<string[]>([]);
const groupName = ref("");
const coupleName = ref("Adun & Uche");
const hashtag = ref("#TheSweetUnion");
const weddingDateText = ref("October 22 & 24, 2026");

const cardRef = ref<any>(null);

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
  const id = rsvpId.value;
  if (!id) return;

  loadingDoc.value = true;
  try {
    const res = await client.collection("rsvp_records").find({
      where: { id: { equals: id } },
      limit: 1,
      depth: 1,
    });
    if (res?.docs?.[0]) {
      fetchedDoc.value = res.docs[0];
    }

    // Fetch site settings via SDK
    try {
      const settings = (await client.global("site_settings").get()) as any;
      if (settings?.partnerOneName && settings?.partnerTwoName) {
        coupleName.value = `${settings.partnerOneName} & ${settings.partnerTwoName}`;
      }
      if (settings?.hashtag) hashtag.value = settings.hashtag;
      if (settings?.weddingDateText) weddingDateText.value = settings.weddingDateText;
    } catch {}

    // Populate events & group via SDK
    const current = record.value;
    if (Array.isArray(current.selectedEvents) && current.selectedEvents.length > 0) {
      if (typeof current.selectedEvents[0] === "object" && current.selectedEvents[0]?.name) {
        eventNames.value = current.selectedEvents.map((e: any) => e.name);
      } else {
        const eventsRes = await client.collection("events").find({ limit: 50, depth: 1 });
        eventNames.value = (eventsRes?.docs || [])
          .filter((e: any) => current.selectedEvents.includes(e.id))
          .map((e: any) => e.name);
      }
    }

    if (current.group) {
      if (typeof current.group === "object" && current.group?.name) {
        groupName.value = current.group.name;
      } else {
        const groupRes = await client.collection("rsvp_groups").find({
          where: { id: { equals: current.group } },
          limit: 1,
        });
        groupName.value = groupRes?.docs?.[0]?.name || "";
      }
    }
  } catch (err) {
    console.warn("Failed to fetch full RSVP record in Pass Dispatch:", err);
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
const leadPhone = computed(() => (record.value.leadPhone as string) ?? "");
const leadEmail = computed(() => (record.value.leadEmail as string) ?? "");
const hasSpouse = computed(() => Boolean(record.value.hasSpouse));
const spouseName = computed(() => (record.value.spouseName as string) ?? "");
const attending = computed(() => Boolean(record.value.attending));

const guestName = computed(() => {
  if (hasSpouse.value && spouseName.value) return `${leadName.value} + ${spouseName.value}`;
  return leadName.value || "Guest";
});

const passUrl = computed(() => `${appUrl}/pass/${rsvpId.value || ""}`);
const wishlistUrl = computed(() => `${appUrl}/wishlist`);

const defaultMessage = computed(() => {
  const name = leadName.value || "there";
  const idStr = (rsvpId.value || "").toUpperCase();

  return (
    `Hi ${name}!\n\n` +
    `You're invited to Adun & Uche's wedding celebration! 🎉\n\n` +
    `🎟️ Your Official Wedding Pass & Itinerary:\n${passUrl.value}\n\n` +
    `Pass Code: ${idStr}\n` +
    `Kindly show your pass at the entrance.\n\n` +
    `Your love, presence, and prayers are our greatest gifts. If you'd like to bless our new home, browse our registry wishlist here:\n${wishlistUrl.value}\n\n` +
    `#TheSweetUnion`
  );
});

watch(
  defaultMessage,
  (newVal) => {
    if (!isUserEdited.value) {
      customMessage.value = newVal;
    }
  },
  { immediate: true },
);

watch(
  customMessage,
  (newMsg) => {
    if (props.onChange) {
      props.onChange(newMsg);
    }
  },
  { immediate: true },
);

function resetToDefault() {
  isUserEdited.value = false;
  customMessage.value = defaultMessage.value;
}

const copied = ref(false);
const showPreview = ref(false);

async function copyPassUrl() {
  if (!passUrl.value) return;
  try {
    await navigator.clipboard.writeText(passUrl.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    console.error("Failed to copy link:", err);
  }
}

async function handleDownloadCard() {
  if (cardRef.value?.downloadCard) {
    await cardRef.value.downloadCard();
  }
}

async function sendWhatsApp() {
  const id = rsvpId.value;
  if (!id || sendingWa.value) return;
  sendingWa.value = true;
  error.value = "";
  sendSuccess.value = "";

  try {
    // Mark as sent via API
    await $fetch(`/api/invitations/send-single/${id}`, {
      method: "POST",
      headers: adminAuthHeaders(),
    });

    const cleanPhone = leadPhone.value.replace(/\+/g, "").replace(/[\s-()]/g, "");
    if (!cleanPhone) {
      throw new Error("No phone number found for this guest.");
    }

    const textToSend = customMessage.value.trim() || defaultMessage.value;
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textToSend)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");

    sendSuccess.value = "WhatsApp opened! Pass marked as Sent.";
    if (props.onChange) props.onChange({ invitationSent: true });
  } catch (err: any) {
    error.value = err?.data?.message || err.message || "Failed to dispatch pass.";
  } finally {
    sendingWa.value = false;
  }
}

async function sendEmail() {
  const id = rsvpId.value;
  if (!id || sendingEmail.value || !leadEmail.value) return;
  sendingEmail.value = true;
  error.value = "";
  sendSuccess.value = "";

  try {
    let imageBase64 = "";
    if (cardRef.value?.captureCardImage) {
      imageBase64 = await cardRef.value.captureCardImage();
    }
    await $fetch(`/api/invitations/send-email/${id}`, {
      method: "POST",
      headers: adminAuthHeaders(),
      body: { imageBase64 },
    });
    sendSuccess.value = `Wedding pass emailed to ${leadEmail.value}.`;
    if (props.onChange) props.onChange({ invitationSent: true });
  } catch (err: any) {
    error.value = err?.data?.message || err.message || "Failed to send email.";
  } finally {
    sendingEmail.value = false;
  }
}
</script>

<template>
  <div class="send-pass-widget">
    <template v-if="loadingDoc">
      <div class="loading-box">
        <div class="spinner-sm" />
        <p class="hint-text">Loading pass information…</p>
      </div>
    </template>
    <template v-else-if="!rsvpId">
      <p class="hint-text">Please save the guest record first before dispatching the pass.</p>
    </template>
    <template v-else>
      <div class="pass-stack">
        <!-- 1. Guest Quick Card Header -->
        <div class="guest-card">
          <div class="guest-info">
            <h4 class="guest-name">{{ guestName }}</h4>
            <div class="guest-tags">
              <span v-if="groupName" class="badge badge--group">{{ groupName }}</span>
              <span v-if="hasSpouse" class="badge badge--admits">Admits 2</span>
              <span class="badge badge--code">{{ rsvpId.toUpperCase() }}</span>
            </div>
          </div>
          <p v-if="leadPhone" class="guest-phone">📱 {{ leadPhone }}</p>
          <p v-else class="guest-phone error-inline">⚠️ No WhatsApp number</p>
        </div>

        <!-- 2. Primary WhatsApp & Action Dispatch Buttons -->
        <div class="actions-stack">
          <button
            type="button"
            class="btn-primary-wa"
            :disabled="sendingWa || !leadPhone || !customMessage.trim()"
            @click="sendWhatsApp"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
              />
            </svg>
            <span>{{ sendingWa ? "Opening WhatsApp…" : "Send Pass on WhatsApp" }}</span>
          </button>

          <div class="secondary-actions-row">
            <button
              v-if="leadEmail"
              type="button"
              class="btn-secondary"
              :disabled="sendingEmail"
              @click="sendEmail"
            >
              ✉️ {{ sendingEmail ? "Sending…" : "Send Email" }}
            </button>
            <button
              type="button"
              class="btn-secondary"
              @click="handleDownloadCard"
            >
              📥 Save Card PNG
            </button>
          </div>
        </div>

        <!-- Feedback Alert -->
        <p v-if="sendSuccess" class="alert-box alert-box--ok">{{ sendSuccess }}</p>
        <p v-if="error" class="alert-box alert-box--err">{{ error }}</p>

        <!-- 3. Copyable Public Pass URL -->
        <div class="link-card">
          <div class="link-card__header">
            <span class="widget-label">Digital Pass Link</span>
            <div class="link-buttons">
              <button type="button" class="btn-copy" @click="copyPassUrl">
                {{ copied ? "Copied! ✓" : "Copy Link 📋" }}
              </button>
              <a :href="passUrl" target="_blank" rel="noopener" class="btn-open-link">
                Open ↗
              </a>
            </div>
          </div>
          <div class="link-pill" @click="copyPassUrl" title="Click to copy">
            <span class="link-text">{{ passUrl }}</span>
          </div>
        </div>

        <!-- 4. WhatsApp Message Editor -->
        <div class="message-card">
          <div class="message-header">
            <span class="widget-label">WhatsApp Message Template</span>
            <button type="button" class="btn-reset" @click="resetToDefault">Reset Default</button>
          </div>
          <textarea
            v-model="customMessage"
            @input="isUserEdited = true"
            rows="5"
            class="wa-textarea"
            placeholder="Enter message to send on WhatsApp..."
          />
          <p class="message-hint">
            The link above will automatically unfurl with the official digital pass card on WhatsApp.
          </p>
        </div>

        <!-- 5. Collapsible Live Pass Preview -->
        <div class="preview-section">
          <button
            type="button"
            class="preview-toggle-btn"
            @click="showPreview = !showPreview"
          >
            <span>🎟️ {{ showPreview ? "Hide Digital Pass Preview" : "Show Digital Pass Preview" }}</span>
            <span class="toggle-arrow">{{ showPreview ? "▲" : "▼" }}</span>
          </button>

          <div v-show="showPreview" class="preview-content">
            <div class="card-scaler">
              <AccessCard
                ref="cardRef"
                :rsvp-id="rsvpId"
                :guest-name="guestName"
                :has-spouse="hasSpouse"
                :spouse-name="spouseName"
                :group-name="groupName"
                :event-names="eventNames"
                :couple-name="coupleName"
                :hashtag="hashtag"
                :wedding-date-text="weddingDateText"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.send-pass-widget {
  display: block;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  padding: 4px 0;
  font-family: inherit;
}

.loading-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 0;
}

.spinner-sm {
  width: 18px;
  height: 18px;
  border: 2px solid #e09f8c;
  border-top-color: #865172;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.hint-text {
  font-size: 0.85rem;
  color: #888;
  font-style: italic;
  margin: 0;
}

.pass-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
}

/* ── Guest Card ── */
.guest-card {
  background: #fdfafc;
  border: 1px solid #ebdbe4;
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.guest-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.guest-name {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #30222a;
}

.guest-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.badge {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 4px;
}

.badge--group {
  background: rgba(134, 81, 114, 0.1);
  color: #865172;
  border: 1px solid rgba(134, 81, 114, 0.2);
}

.badge--admits {
  background: rgba(212, 175, 55, 0.15);
  color: #8a651e;
  border: 1px solid rgba(212, 175, 55, 0.4);
}

.badge--code {
  background: #30222a;
  color: #fce8b3;
  font-family: monospace;
}

.guest-phone {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: #555;
}

.error-inline {
  color: #c0514a;
}

/* ── Actions Stack ── */
.actions-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.btn-primary-wa {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 0.925rem;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid #25d366;
  background: #25d366;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(37, 211, 102, 0.25);
  transition:
    background 150ms,
    transform 100ms;
}

.btn-primary-wa:hover:not(:disabled) {
  background: #1eb556;
}

.btn-primary-wa:active:not(:disabled) {
  transform: scale(0.99);
}

.btn-primary-wa:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.secondary-actions-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  background: #ffffff;
  color: #653853;
  border: 1px solid #d4c5cf;
  transition:
    background 150ms,
    border-color 150ms;
}

.btn-secondary:hover:not(:disabled) {
  background: #fdfafc;
  border-color: #865172;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Alerts ── */
.alert-box {
  margin: 0;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  line-height: 1.4;
  font-weight: 600;
}

.alert-box--ok {
  background: #edf7ed;
  color: #2d7a47;
  border: 1px solid #c8e6c9;
}

.alert-box--err {
  background: #fde8e7;
  color: #c0514a;
  border: 1px solid #f9c2be;
}

/* ── Pass Link Card ── */
.link-card {
  background: #fdfafc;
  border: 1px solid #ebdbe4;
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.link-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.widget-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #653853;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.link-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-copy {
  background: none;
  border: none;
  color: #865172;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.btn-copy:hover {
  color: #4a253b;
}

.btn-open-link {
  color: #865172;
  font-size: 0.75rem;
  font-weight: 600;
  text-decoration: underline;
}

.link-pill {
  background: #f5edf1;
  border: 1px solid #dfcdd8;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link-text {
  font-family: monospace;
  font-size: 0.78rem;
  color: #653853;
  user-select: all;
}

/* ── Message Card ── */
.message-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.message-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.btn-reset {
  background: none;
  border: none;
  color: #865172;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}

.wa-textarea {
  width: 100%;
  box-sizing: border-box;
  font-family: inherit;
  font-size: 0.85rem;
  line-height: 1.45;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #d4c5cf;
  background: #ffffff;
  color: #2b1c28;
  resize: vertical;
  outline: none;
  transition: border-color 150ms;
}

.wa-textarea:focus {
  border-color: #865172;
  box-shadow: 0 0 0 2px rgba(134, 81, 114, 0.15);
}

.message-hint {
  margin: 0;
  font-size: 0.725rem;
  color: #8a7280;
  line-height: 1.35;
  font-style: italic;
}

/* ── Preview Accordion Section ── */
.preview-section {
  border-top: 1px solid #ebdbe4;
  padding-top: 10px;
}

.preview-toggle-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fdfafc;
  border: 1px solid #ebdbe4;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 0.825rem;
  font-weight: 600;
  color: #653853;
  cursor: pointer;
  transition: background 150ms;
}

.preview-toggle-btn:hover {
  background: #f5edf1;
}

.toggle-arrow {
  font-size: 0.7rem;
  color: #865172;
}

.preview-content {
  margin-top: 12px;
  display: flex;
  justify-content: center;
  width: 100%;
  overflow-x: auto;
}

.card-scaler {
  width: 100%;
  max-width: 340px;
  margin: 0 auto;
}
</style>
