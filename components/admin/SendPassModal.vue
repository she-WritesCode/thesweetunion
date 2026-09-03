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
const invitationSent = computed(() => Boolean(record.value.invitationSent));
const invitationSentVia = computed(() => (record.value.invitationSentVia as string) || "WhatsApp");

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
  <div class="dispatch-cockpit">
    <!-- Loading State -->
    <div v-if="loadingDoc" class="loading-state">
      <div class="spinner-sm" />
      <span>Loading invitation details…</span>
    </div>

    <template v-else-if="!rsvpId">
      <div class="empty-state">
        <p>Please save the guest record first before dispatching the pass.</p>
      </div>
    </template>

    <template v-else>
      <!-- ─── Header: Guest Identity Bar ──────────────────────── -->
      <div class="guest-header">
        <div class="guest-header__main">
          <div class="guest-avatar">
            {{ (leadName[0] || "G").toUpperCase() }}
          </div>
          <div class="guest-details">
            <h3 class="guest-name">{{ guestName }}</h3>
            <div class="guest-meta">
              <span v-if="leadPhone" class="meta-phone">
                <span class="phone-dot" />
                {{ leadPhone }}
              </span>
              <span v-if="groupName" class="meta-group">{{ groupName }}</span>
              <span v-if="hasSpouse" class="meta-admits">Admits 2</span>
            </div>
          </div>
        </div>

        <div class="status-indicator" :class="invitationSent ? 'status-indicator--sent' : 'status-indicator--pending'">
          <span class="status-dot" />
          <span>{{ invitationSent ? `Sent (${invitationSentVia})` : "Pending Dispatch" }}</span>
        </div>
      </div>

      <!-- ─── Segmented Navigation ────────────────────────────── -->
      <div class="segmented-bar">
        <button
          type="button"
          class="seg-btn"
          :class="{ 'seg-btn--active': activeTab === 'whatsapp' }"
          @click="activeTab = 'whatsapp'"
        >
          <svg class="w-3.5 h-3.5 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span>WhatsApp Message</span>
        </button>
        <button
          type="button"
          class="seg-btn"
          :class="{ 'seg-btn--active': activeTab === 'card' }"
          @click="activeTab = 'card'"
        >
          <svg class="w-3.5 h-3.5 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2"/>
            <line x1="7" y1="8" x2="17" y2="8"/>
            <line x1="7" y1="12" x2="17" y2="12"/>
          </svg>
          <span>Access Pass Card</span>
        </button>
      </div>

      <!-- ─── Tab 1: WhatsApp Dispatch Cockpit ────────────────── -->
      <div v-if="activeTab === 'whatsapp'" class="tab-pane">
        <!-- Quick Link Bar -->
        <div class="link-bar">
          <div class="link-bar__info">
            <span class="link-bar__badge">PASS URL</span>
            <span class="link-bar__url">/pass/{{ rsvpId.toLowerCase() }}</span>
          </div>
          <div class="link-bar__actions">
            <button type="button" class="btn-tool" @click="copyPassUrl">
              {{ copied ? "Copied! ✓" : "Copy Link" }}
            </button>
            <a :href="passUrl" target="_blank" rel="noopener" class="btn-tool">
              Open ↗
            </a>
          </div>
        </div>

        <!-- WhatsApp Chat Simulator / Editor -->
        <div class="chat-composer">
          <div class="chat-composer__top">
            <span class="composer-label">Message Preview &amp; Customization</span>
            <button type="button" class="btn-reset-link" @click="resetToDefault">
              Reset Default
            </button>
          </div>

          <div class="wa-bubble">
            <textarea
              v-model="customMessage"
              @input="isUserEdited = true"
              rows="6"
              class="wa-bubble__textarea"
              placeholder="Type message to guest..."
            />

            <!-- Embedded Unfurl Preview -->
            <div class="wa-unfurl">
              <div class="wa-unfurl__thumb">
                <svg class="w-4 h-4 text-[#865172]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="16" rx="2"/>
                  <line x1="7" y1="8" x2="17" y2="8"/>
                </svg>
              </div>
              <div class="wa-unfurl__body">
                <span class="wa-unfurl__title">Official Wedding Pass · Adun &amp; Uche</span>
                <span class="wa-unfurl__domain">thesweetunion.com</span>
              </div>
            </div>

            <div class="wa-bubble__footer">
              <span class="wa-note">WhatsApp link unfurl preview included</span>
              <span class="wa-time">Now ✓✓</span>
            </div>
          </div>
        </div>

        <!-- Feedback Messages -->
        <div v-if="sendSuccess" class="toast toast--success">
          <span>✓</span> {{ sendSuccess }}
        </div>
        <div v-if="error" class="toast toast--error">
          <span>⚠️</span> {{ error }}
        </div>

        <!-- Primary Dispatch Button -->
        <button
          type="button"
          class="btn-wa-dispatch"
          :disabled="sendingWa || !leadPhone || !customMessage.trim()"
          @click="sendWhatsApp"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
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

        <div v-if="leadEmail" class="secondary-actions">
          <button
            type="button"
            class="btn-email-link"
            :disabled="sendingEmail"
            @click="sendEmail"
          >
            ✉️ {{ sendingEmail ? "Sending Email…" : `Also send to ${leadEmail}` }}
          </button>
        </div>
      </div>

      <!-- ─── Tab 2: Pass Card Preview ───────────────────────── -->
      <div v-else class="tab-pane">
        <div class="card-display">
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

        <div class="card-actions">
          <button type="button" class="btn-action-gold" @click="handleDownloadCard">
            <svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download High-Res PNG
          </button>
          <button
            v-if="leadEmail"
            type="button"
            class="btn-action-outline"
            :disabled="sendingEmail"
            @click="sendEmail"
          >
            Email Pass Card
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dispatch-cockpit {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  box-sizing: border-box;
  font-family: inherit;
  color: #30222a;
}

/* ── Loading / Empty ───────────────────────────────────────── */
.loading-state,
.empty-state {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 0;
  color: #8a7280;
  font-size: 0.85rem;
}

.spinner-sm {
  width: 16px;
  height: 16px;
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

/* ── Guest Header ──────────────────────────────────────────── */
.guest-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border: 1px solid #ebdbe4;
  border-radius: 12px;
  padding: 10px 14px;
  box-shadow: 0 1px 4px rgba(48, 34, 42, 0.04);
}

.guest-header__main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.guest-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #653853, #4a253b);
  color: #fce8b3;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.95rem;
  flex-shrink: 0;
}

.guest-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.guest-name {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: #30222a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.guest-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 0.725rem;
}

.meta-phone {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  color: #25d366;
}

.phone-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #25d366;
}

.meta-group {
  background: #f5edf1;
  color: #865172;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.meta-admits {
  background: #fff8e6;
  color: #b48a1e;
  border: 1px solid #fce8b3;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 700;
  text-transform: uppercase;
}

.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 12px;
  flex-shrink: 0;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-indicator--sent {
  background: #e8f5e9;
  color: #2e7d32;
}
.status-indicator--sent .status-dot {
  background: #2e7d32;
}

.status-indicator--pending {
  background: #fff3e0;
  color: #e65100;
}
.status-indicator--pending .status-dot {
  background: #e65100;
}

/* ── Segmented Navigation ──────────────────────────────────── */
.segmented-bar {
  display: flex;
  background: #f0e6eb;
  padding: 3px;
  border-radius: 8px;
  gap: 4px;
}

.seg-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 10px;
  border: none;
  background: transparent;
  color: #865172;
  font-size: 0.8rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 150ms ease;
}

.seg-btn:hover:not(.seg-btn--active) {
  background: rgba(255, 255, 255, 0.4);
}

.seg-btn--active {
  background: #ffffff;
  color: #30222a;
  box-shadow: 0 1px 3px rgba(48, 34, 42, 0.1);
}

.seg-icon {
  font-size: 0.9rem;
}

/* ── Tab Pane ──────────────────────────────────────────────── */
.tab-pane {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── Link Bar ──────────────────────────────────────────────── */
.link-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #faf5f8;
  border: 1px dashed #d5cad0;
  padding: 6px 10px;
  border-radius: 8px;
}

.link-bar__info {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.link-bar__badge {
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  background: #653853;
  color: #fce8b3;
  padding: 1px 5px;
  border-radius: 3px;
  flex-shrink: 0;
}

.link-bar__url {
  font-family: monospace;
  font-size: 0.78rem;
  color: #653853;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link-bar__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.btn-tool {
  background: #ffffff;
  border: 1px solid #d4c5cf;
  border-radius: 4px;
  padding: 2px 7px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #865172;
  cursor: pointer;
  text-decoration: none;
  transition: all 120ms;
}

.btn-tool:hover {
  background: #f5edf1;
  border-color: #865172;
}

/* ── WhatsApp Chat Composer ────────────────────────────────── */
.chat-composer {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chat-composer__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.composer-label {
  font-size: 0.74rem;
  font-weight: 700;
  color: #653853;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.btn-reset-link {
  background: none;
  border: none;
  color: #865172;
  font-size: 0.74rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}

.btn-reset-link:hover {
  color: #30222a;
}

.wa-bubble {
  background: #e7ffdb;
  border: 1px solid #c2eab2;
  border-radius: 10px 10px 2px 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.wa-bubble__textarea {
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  resize: vertical;
  font-family: inherit;
  font-size: 0.85rem;
  line-height: 1.45;
  color: #111b21;
  box-sizing: border-box;
}

.wa-unfurl {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.04);
  border-left: 3px solid #25d366;
  padding: 6px 8px;
  border-radius: 4px;
}

.wa-unfurl__thumb {
  font-size: 1.1rem;
}

.wa-unfurl__body {
  display: flex;
  flex-direction: column;
}

.wa-unfurl__title {
  font-size: 0.74rem;
  font-weight: 700;
  color: #111b21;
}

.wa-unfurl__domain {
  font-size: 0.65rem;
  color: #667781;
}

.wa-bubble__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  padding-top: 4px;
}

.wa-note {
  font-size: 0.68rem;
  color: #54656f;
  font-style: italic;
}

.wa-time {
  font-size: 0.68rem;
  font-weight: 600;
  color: #53bdeb;
}

/* ── Toasts ────────────────────────────────────────────────── */
.toast {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.toast--success {
  background: #edf7ed;
  color: #2d7a47;
  border: 1px solid #c8e6c9;
}

.toast--error {
  background: #fde8e7;
  color: #c0514a;
  border: 1px solid #f9c2be;
}

/* ── Primary Action ────────────────────────────────────────── */
.btn-wa-dispatch {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 18px;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  border: none;
  background: linear-gradient(135deg, #25d366, #1eb556);
  color: #ffffff;
  box-shadow: 0 3px 10px rgba(37, 211, 102, 0.3);
  transition: all 150ms ease;
}

.btn-wa-dispatch:hover:not(:disabled) {
  filter: brightness(1.05);
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(37, 211, 102, 0.4);
}

.btn-wa-dispatch:active:not(:disabled) {
  transform: translateY(0);
}

.btn-wa-dispatch:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.secondary-actions {
  display: flex;
  justify-content: center;
}

.btn-email-link {
  background: none;
  border: none;
  color: #865172;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
}

.btn-email-link:hover {
  color: #4a253b;
}

/* ── Card Display (Tab 2) ──────────────────────────────────── */
.card-display {
  display: flex;
  justify-content: center;
  width: 100%;
  padding: 4px 0;
}

.card-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-action-gold {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  border: none;
  background: linear-gradient(135deg, #fce8b3 0%, #d4af37 50%, #b48a1e 100%);
  color: #30222a;
  box-shadow: 0 2px 8px rgba(212, 175, 55, 0.25);
  transition: filter 150ms;
}

.btn-action-gold:hover {
  filter: brightness(1.05);
}

.btn-action-outline {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 9px 14px;
  border-radius: 8px;
  font-size: 0.825rem;
  font-weight: 600;
  cursor: pointer;
  background: #ffffff;
  color: #865172;
  border: 1px solid #d4c5cf;
}

.btn-action-outline:hover:not(:disabled) {
  background: #fdfafc;
  border-color: #865172;
}
</style>
