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

const activeTab = ref<"whatsapp" | "card">("whatsapp");
const loadingDoc = ref(false);
const sendingWa = ref(false);
const sendingEmail = ref(false);
const sendSuccess = ref("");
const error = ref("");
const copied = ref(false);

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

const appUrl = computed(() => {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "thesweetunion.com" || host === "www.thesweetunion.com") {
      return "https://thesweetunion.com";
    }
  }
  const configured = (config.public as any).appUrl;
  if (configured && !configured.includes("-") && !configured.includes("localhost")) {
    return configured;
  }
  return "https://thesweetunion.com";
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

    try {
      const settings = (await client.global("site_settings").get()) as any;
      if (settings?.partnerOneName && settings?.partnerTwoName) {
        coupleName.value = `${settings.partnerOneName} & ${settings.partnerTwoName}`;
      }
      if (settings?.hashtag) hashtag.value = settings.hashtag;
      if (settings?.weddingDateText) weddingDateText.value = settings.weddingDateText;
    } catch {}

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

const guestName = computed(() => {
  if (hasSpouse.value && spouseName.value) return `${leadName.value} + ${spouseName.value}`;
  return leadName.value || "Guest";
});

const passUrl = computed(() => `${appUrl.value}/pass/${rsvpId.value || ""}`);
const wishlistUrl = computed(() => `${appUrl.value}/wishlist`);

const defaultMessage = computed(() => {
  const name = leadName.value || "there";
  const idStr = (rsvpId.value || "").toUpperCase();

  return (
    `Hi ${name}!\n\n` +
    `You're invited to Adun & Uche's wedding celebration! 🎉\n\n` +
    `Your Official Wedding Pass & Itinerary:\n${passUrl.value}\n\n` +
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
  const id = rsvpId.value;
  if (!id) return;
  const downloadUrl = `/api/pass/card-image/${id}.png?download=true`;
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = `wedding-pass-${guestName.value.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function sendWhatsApp() {
  const id = rsvpId.value;
  if (!id || sendingWa.value) return;
  sendingWa.value = true;
  error.value = "";
  sendSuccess.value = "";

  try {
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
      try {
        imageBase64 = await cardRef.value.captureCardImage();
      } catch (e) {
        console.warn("Client card capture skipped, using server generator:", e);
      }
    }
    await $fetch(`/api/invitations/send-email/${id}`, {
      method: "POST",
      headers: adminAuthHeaders(),
      body: { imageBase64: imageBase64 || undefined },
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
  <div class="mini-modal">
    <!-- Loading State -->
    <div v-if="loadingDoc" class="mini-loading">
      <div class="mini-spinner" />
      <span>Loading details…</span>
    </div>

    <template v-else-if="!rsvpId">
      <div class="mini-empty">
        <p>Save this guest record first to generate the access pass.</p>
      </div>
    </template>

    <template v-else>
      <!-- Sleek Segmented Switcher -->
      <div class="mini-tabs">
        <button
          type="button"
          class="mini-tab-btn"
          :class="{ 'mini-tab-btn--active': activeTab === 'whatsapp' }"
          @click="activeTab = 'whatsapp'"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span>WhatsApp Message</span>
        </button>

        <button
          type="button"
          class="mini-tab-btn"
          :class="{ 'mini-tab-btn--active': activeTab === 'card' }"
          @click="activeTab = 'card'"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2"/>
            <line x1="7" y1="8" x2="17" y2="8"/>
            <line x1="7" y1="12" x2="17" y2="12"/>
          </svg>
          <span>Access Pass Card</span>
        </button>
      </div>

      <!-- Tab 1: Minimalist WhatsApp Dispatch -->
      <div v-if="activeTab === 'whatsapp'" class="mini-pane">
        <!-- Message Box -->
        <div class="mini-textarea-wrap">
          <textarea
            v-model="customMessage"
            @input="isUserEdited = true"
            rows="6"
            class="mini-textarea"
            placeholder="Type message to guest..."
          />
        </div>

        <!-- Inline Meta & Quick Actions -->
        <div class="mini-actions-row">
          <div class="mini-link-group">
            <button type="button" class="mini-chip-btn" @click="copyPassUrl">
              {{ copied ? "Copied! ✓" : "Copy Link" }}
            </button>
            <a :href="passUrl" target="_blank" rel="noopener" class="mini-chip-btn">
              Open ↗
            </a>
          </div>

          <button type="button" class="mini-text-btn" @click="resetToDefault">
            Reset Template
          </button>
        </div>

        <!-- Feedback Alert -->
        <div v-if="sendSuccess" class="mini-toast mini-toast--success">
          <span>✓</span> {{ sendSuccess }}
        </div>
        <div v-if="error" class="mini-toast mini-toast--error">
          <span>⚠️</span> {{ error }}
        </div>

        <!-- Send on WhatsApp Button -->
        <button
          type="button"
          class="mini-btn-wa"
          :disabled="sendingWa || !leadPhone || !customMessage.trim()"
          @click="sendWhatsApp"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          <span>{{ sendingWa ? "Opening WhatsApp…" : (leadPhone ? `Send to ${leadPhone}` : "Send on WhatsApp") }}</span>
        </button>

        <!-- Secondary Email Dispatch -->
        <div v-if="leadEmail" class="mini-email-wrap">
          <button
            type="button"
            class="mini-text-email-btn"
            :disabled="sendingEmail"
            @click="sendEmail"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <span>{{ sendingEmail ? "Sending Email…" : `Also email pass to ${leadEmail}` }}</span>
          </button>
        </div>
      </div>

      <!-- Tab 2: Minimalist Card Preview -->
      <div v-else class="mini-pane">
        <div class="mini-card-container">
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

        <div class="mini-card-actions">
          <button type="button" class="mini-btn-primary" @click="handleDownloadCard">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Download PNG</span>
          </button>

          <button
            v-if="leadEmail"
            type="button"
            class="mini-btn-secondary"
            :disabled="sendingEmail"
            @click="sendEmail"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <span>{{ sendingEmail ? "Sending…" : "Email Card" }}</span>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.mini-modal {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
  font-family: inherit;
  color: #2b1c26;
}

.mini-loading,
.mini-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 0;
  color: #7d6b76;
  font-size: 0.825rem;
}

.mini-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #e0cbd6;
  border-top-color: #865172;
  border-radius: 50%;
  animation: mini-spin 0.6s linear infinite;
}

@keyframes mini-spin {
  to { transform: rotate(360deg); }
}

/* ── Minimalist Segmented Tabs ────────────────────────────── */
.mini-tabs {
  display: flex;
  background: #f4ecf0;
  padding: 3px;
  border-radius: 8px;
  gap: 3px;
}

.mini-tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: #705566;
  font-size: 0.78rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 120ms ease;
}

.mini-tab-btn:hover:not(.mini-tab-btn--active) {
  color: #30222a;
}

.mini-tab-btn--active {
  background: #ffffff;
  color: #30222a;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

/* ── Pane ─────────────────────────────────────────────────── */
.mini-pane {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ── Minimalist Textarea ─────────────────────────────────── */
.mini-textarea-wrap {
  border: 1px solid #e4d8df;
  border-radius: 8px;
  background: #faf7f9;
  transition: border-color 120ms, box-shadow 120ms;
}

.mini-textarea-wrap:focus-within {
  border-color: #865172;
  background: #ffffff;
  box-shadow: 0 0 0 2px rgba(134, 81, 114, 0.1);
}

.mini-textarea {
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  resize: vertical;
  font-family: inherit;
  font-size: 0.825rem;
  line-height: 1.45;
  color: #2b1c26;
  padding: 10px 12px;
  box-sizing: border-box;
}

/* ── Actions Row ─────────────────────────────────────────── */
.mini-actions-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.mini-link-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mini-chip-btn {
  display: inline-flex;
  align-items: center;
  background: #ffffff;
  border: 1px solid #dfd3db;
  border-radius: 5px;
  padding: 3px 8px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #705566;
  cursor: pointer;
  text-decoration: none;
  transition: all 120ms;
}

.mini-chip-btn:hover {
  border-color: #865172;
  color: #865172;
  background: #fdfafc;
}

.mini-text-btn {
  background: none;
  border: none;
  color: #8a7380;
  font-size: 0.72rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.mini-text-btn:hover {
  color: #30222a;
}

/* ── Toast ────────────────────────────────────────────────── */
.mini-toast {
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.mini-toast--success {
  background: #edf7ed;
  color: #2d7a47;
}

.mini-toast--error {
  background: #fde8e7;
  color: #c0514a;
}

/* ── WhatsApp Button ─────────────────────────────────────── */
.mini-btn-wa {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  border: none;
  background: #25d366;
  color: #ffffff;
  transition: filter 120ms ease, transform 120ms ease;
}

.mini-btn-wa:hover:not(:disabled) {
  filter: brightness(1.05);
}

.mini-btn-wa:active:not(:disabled) {
  transform: scale(0.99);
}

.mini-btn-wa:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Secondary Email ─────────────────────────────────────── */
.mini-email-wrap {
  display: flex;
  justify-content: center;
  padding-top: 2px;
}

.mini-text-email-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: none;
  color: #865172;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.mini-text-email-btn:hover {
  color: #4a253b;
}

/* ── Card Pane ───────────────────────────────────────────── */
.mini-card-container {
  display: flex;
  justify-content: center;
  width: 100%;
  padding: 4px 0;
}

.mini-card-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.mini-btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 14px;
  border-radius: 7px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  border: none;
  background: linear-gradient(135deg, #fce8b3 0%, #d4af37 50%, #b48a1e 100%);
  color: #30222a;
  transition: filter 120ms;
}

.mini-btn-primary:hover {
  filter: brightness(1.06);
}

.mini-btn-secondary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 14px;
  border-radius: 7px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  background: #ffffff;
  color: #865172;
  border: 1px solid #dfd3db;
  transition: all 120ms;
}

.mini-btn-secondary:hover:not(:disabled) {
  background: #faf6f8;
  border-color: #865172;
}
</style>
