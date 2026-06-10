<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";

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
    siblingData?: Record<string, unknown>;
  };
}>();

const qrCanvas = ref<HTMLCanvasElement | null>(null);
const loading = ref(false);
const sendingWa = ref(false);
const sendingEmail = ref(false);
const sendError = ref("");
const sendSuccess = ref("");

const eventNames = ref<string[]>([]);
const groupName = ref("");
const coupleName = ref("Adun & Uche");
const hashtag = ref("#TheSweetUnion");
const weddingDateText = ref("");

// id is not in siblingData — extracted from the URL and kept reactive via event listeners.
// Dyrected admin uses React Router (History API), so window.location.hash never changes;
// we must listen to pushState/replaceState and popstate to detect navigation.
const ROUTE_SEGMENTS = new Set(["admin", "create", "collections", "globals"]);

function readIdFromUrl(): string | undefined {
  // Try pathname first (React Router / History API)
  const pathId = window.location.pathname.split("/").filter(Boolean).at(-1);
  if (pathId && !ROUTE_SEGMENTS.has(pathId)) return pathId;
  // Fall back to hash routing
  const hashId = window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).at(-1);
  if (hashId && !ROUTE_SEGMENTS.has(hashId)) return hashId;
  return undefined;
}

const rsvpId = ref<string | undefined>(readIdFromUrl());

const siblingData = computed(() => props.context?.siblingData ?? {});
const leadName = computed(() => (siblingData.value.leadName as string) ?? "");
const leadEmail = computed(() => (siblingData.value.leadEmail as string) ?? "");
const leadPhone = computed(() => (siblingData.value.leadPhone as string) ?? "");
const spouseName = computed(() => (siblingData.value.spouseName as string) ?? "");
const hasSpouse = computed(() => (siblingData.value.hasSpouse as boolean) ?? false);
const attending = computed(() => (siblingData.value.attending as boolean) ?? false);
const invitationSent = computed(() => (siblingData.value.invitationSent as boolean) ?? false);
const invitationSentAt = computed(() => (siblingData.value.invitationSentAt as string) ?? "");
const invitationSentVia = computed(() => (siblingData.value.invitationSentVia as string) ?? "");
const selectedEventIds = computed(() => (siblingData.value.selectedEvents as string[]) ?? []);
const groupId = computed(() => (siblingData.value.group as string) ?? "");

const guestName = computed(() => {
  if (hasSpouse.value && spouseName.value) return `${leadName.value} + ${spouseName.value}`;
  return leadName.value || "Guest";
});

const sentLabel = computed(() => {
  if (!invitationSent.value) return null;
  const time = invitationSentAt.value
    ? new Date(invitationSentAt.value).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  return `Sent via ${invitationSentVia.value || "WhatsApp"}${time ? ` · ${time}` : ""}`;
});

async function loadCardData() {
  loading.value = true;
  try {
    await Promise.all([fetchEvents(), fetchGroup(), fetchSiteSettings()]);
  } finally {
    loading.value = false;
    await nextTick();
    await renderQR();
  }
}

async function fetchEvents() {
  if (!selectedEventIds.value.length) return;
  try {
    const data = await $fetch<any>("/api/dyrected/api/collections/events?limit=20");
    eventNames.value = (data?.docs ?? [])
      .filter((e: any) => selectedEventIds.value.includes(e.id))
      .map((e: any) => e.name);
  } catch {}
}

async function fetchGroup() {
  if (!groupId.value) return;
  try {
    const data = await $fetch<any>(`/api/dyrected/api/collections/rsvp_groups/${groupId.value}`);
    groupName.value = data?.name ?? "";
  } catch {}
}

async function fetchSiteSettings() {
  try {
    const data = await $fetch<any>("/api/dyrected/api/globals/site_settings");
    const p1 = data?.partnerOneName ?? "";
    const p2 = data?.partnerTwoName ?? "";
    if (p1 && p2) coupleName.value = `${p1} & ${p2}`;
    if (data?.hashtag) hashtag.value = data.hashtag;
    if (data?.weddingDateText) weddingDateText.value = data.weddingDateText;
  } catch {}
}

async function renderQR() {
  if (!qrCanvas.value || !rsvpId.value) return;
  const QRCode = (await import("qrcode")).default;
  await QRCode.toCanvas(qrCanvas.value, rsvpId.value, {
    width: 110,
    margin: 1,
    color: { dark: "#865172", light: "#F5EDF1" },
  });
}

function handleNavigation() {
  rsvpId.value = readIdFromUrl();
}

// Patch history API — React Router uses pushState, not hashchange
let origPushState: typeof history.pushState;
let origReplaceState: typeof history.replaceState;

onMounted(async () => {
  origPushState = history.pushState.bind(history);
  origReplaceState = history.replaceState.bind(history);
  history.pushState = (...args) => {
    origPushState(...args);
    handleNavigation();
  };
  history.replaceState = (...args) => {
    origReplaceState(...args);
    handleNavigation();
  };
  window.addEventListener("popstate", handleNavigation);
  window.addEventListener("hashchange", handleNavigation);
  await loadCardData();
});

onUnmounted(() => {
  if (origPushState) history.pushState = origPushState;
  if (origReplaceState) history.replaceState = origReplaceState;
  window.removeEventListener("popstate", handleNavigation);
  window.removeEventListener("hashchange", handleNavigation);
});

watch(rsvpId, loadCardData);
watch([selectedEventIds, groupId], loadCardData, { deep: true });

async function captureCardImage(): Promise<string> {
  const captureEl = document.getElementById(`access-card-capture-${rsvpId.value}`);
  const cardEl = document.getElementById(`access-card-${rsvpId.value}`);
  if (!captureEl || !cardEl) throw new Error("Card element not found");

  // Add exporting class to temporarily fall back to solid colors for html2canvas
  cardEl.classList.add("acp-exporting");

  try {
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(captureEl, { scale: 3, backgroundColor: null, useCORS: true });
    return canvas.toDataURL("image/png");
  } finally {
    // Restore the screen-friendly shiny gradients immediately
    cardEl.classList.remove("acp-exporting");
  }
}

async function downloadCard() {
  const dataUrl = await captureCardImage();
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `access-card-${(guestName.value || "guest").replace(/[^a-z0-9]/gi, "-").toLowerCase()}.png`;
  a.click();
}

async function sendWhatsApp() {
  if (!rsvpId.value || sendingWa.value) return;
  sendingWa.value = true;
  sendError.value = "";
  sendSuccess.value = "";
  try {
    // Capture the card image and trigger download so user can attach in WhatsApp
    const dataUrl = await captureCardImage();
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `access-card-${(guestName.value || "guest").replace(/[^a-z0-9]/gi, "-").toLowerCase()}.png`;
    a.click();

    // Mark as sent + get wa.me link
    const data = await $fetch<any>(`/api/invitations/send-single/${rsvpId.value}`, { method: "POST" });
    if (data.waUrl) {
      window.open(data.waUrl, "_blank", "noopener,noreferrer");
    }
    sendSuccess.value = "Card downloaded & WhatsApp opened — attach the image before sending.";
    if (props.onChange) props.onChange({ invitationSent: true });
  } catch (err: any) {
    sendError.value = err?.data?.message || err.message || "Failed. Please try again.";
  } finally {
    sendingWa.value = false;
  }
}

async function sendEmail() {
  if (!rsvpId.value || sendingEmail.value) return;
  sendingEmail.value = true;
  sendError.value = "";
  sendSuccess.value = "";
  try {
    const imageBase64 = await captureCardImage();
    await $fetch(`/api/invitations/send-email/${rsvpId.value}`, {
      method: "POST",
      body: { imageBase64 },
    });
    sendSuccess.value = `Invitation emailed to ${leadEmail.value || "guest"}.`;
    if (props.onChange) props.onChange({ invitationSent: true });
  } catch (err: any) {
    sendError.value = err?.data?.message || err.message || "Failed to send email.";
  } finally {
    sendingEmail.value = false;
  }
}
</script>

<template>
  <div class="acp-wrap">
    <p v-if="!rsvpId" class="acp-empty">Save this record first to generate the access card.</p>

    <template v-else>
      <!-- ─── Card + overlay wrapper ───────────────────────── -->
      <div class="acp-card-wrap">
        <div :id="`access-card-capture-${rsvpId}`" class="acp-capture-wrapper">
          <div :id="`access-card-${rsvpId}`" class="acp-card">
            <!-- Paper grain overlay -->
            <div class="acp-texture" aria-hidden="true" />

            <div class="acp-inner-frame">
              <!-- ── Header ──────────────────────────────────────── -->
              <!-- Botanical ornament with gold-foil gradient definition -->
              <svg
                class="acp-botanical"
                viewBox="0 0 160 36"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="gold-foil" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#FCE8B3" />
                    <stop offset="40%" stop-color="#D4AF37" />
                    <stop offset="60%" stop-color="#F5D77F" />
                    <stop offset="100%" stop-color="#B48A1E" />
                  </linearGradient>
                </defs>
                <path d="M80 18 C65 10, 48 8, 30 14" stroke="url(#gold-foil)" stroke-width="1" stroke-linecap="round" />
                <path
                  d="M80 18 C95 10, 112 8, 130 14"
                  stroke="url(#gold-foil)"
                  stroke-width="1"
                  stroke-linecap="round"
                />
                <path
                  d="M50 14 C46 8, 40 6, 34 10"
                  stroke="url(#gold-foil)"
                  stroke-width="0.8"
                  stroke-linecap="round"
                />
                <path
                  d="M110 14 C114 8, 120 6, 126 10"
                  stroke="url(#gold-foil)"
                  stroke-width="0.8"
                  stroke-linecap="round"
                />
                <path
                  d="M60 12 C57 6, 53 4, 48 7"
                  stroke="url(#gold-foil)"
                  stroke-width="0.7"
                  stroke-linecap="round"
                  opacity="0.7"
                />
                <path
                  d="M100 12 C103 6, 107 4, 112 7"
                  stroke="url(#gold-foil)"
                  stroke-width="0.7"
                  stroke-linecap="round"
                  opacity="0.7"
                />
                <circle cx="80" cy="18" r="1.5" fill="url(#gold-foil)" opacity="0.8" />
                <circle cx="34" cy="10" r="1" fill="url(#gold-foil)" opacity="0.6" />
                <circle cx="126" cy="10" r="1" fill="url(#gold-foil)" opacity="0.6" />
              </svg>

              <p class="acp-couple">{{ coupleName }}</p>
              <p class="acp-hashtag">{{ hashtag }}</p>

              <!-- ── Divider ─────────────────────────────────────── -->
              <div class="acp-divider">
                <span class="acp-divider__line" />
                <svg class="acp-divider__diamond" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <defs>
                    <linearGradient id="gold-foil-diamond" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#FCE8B3" />
                      <stop offset="40%" stop-color="#D4AF37" />
                      <stop offset="60%" stop-color="#F5D77F" />
                      <stop offset="100%" stop-color="#B48A1E" />
                    </linearGradient>
                  </defs>
                  <path d="M6 1 L11 6 L6 11 L1 6 Z" fill="url(#gold-foil-diamond)" opacity="0.85" />
                </svg>
                <span class="acp-divider__line" />
              </div>

              <!-- ── Body ───────────────────────────────────────── -->
              <div class="acp-body">
                <p class="acp-guest">{{ guestName }}</p>

                <div v-if="hasSpouse" class="acp-admits">
                  <span class="acp-admits__pill">ADMITS 2</span>
                </div>

                <p v-if="groupName" class="acp-group">{{ groupName }}</p>

                <p v-if="eventNames.length" class="acp-events">
                  <span v-for="(name, i) in eventNames" :key="name">
                    {{ name }}<span v-if="i < eventNames.length - 1" class="acp-events__sep"> · </span>
                  </span>
                </p>
                <p v-else-if="loading" class="acp-events acp-events--loading">Loading…</p>

                <!-- QR code frame -->
                <div class="acp-qr-frame">
                  <div class="acp-qr-inner">
                    <canvas ref="qrCanvas" class="acp-qr-canvas" />
                  </div>
                  <p class="acp-qr-label">Show at entrance</p>
                </div>
              </div>

              <!-- ── Footer ─────────────────────────────────────── -->
              <div class="acp-footer">
                <div class="acp-footer__rule" />
                <p v-if="weddingDateText" class="acp-date">{{ weddingDateText }}</p>
                <p class="acp-welcome">Welcome to our celebration</p>
                <p class="acp-footer__hashtag">{{ hashtag }}</p>
              </div>
            </div>
          </div>
        </div>
        <!-- ─── End Card ──────────────────────────────────── -->

        <!-- Loading overlay -->
        <div v-if="loading" class="acp-overlay" aria-hidden="true">
          <div class="acp-loading__spinner" />
        </div>
      </div>
      <!-- ─── End Card Wrap ─────────────────────────────────── -->

      <!-- Actions -->
      <div class="acp-actions">
        <!-- Download -->
        <button type="button" class="acp-btn" :disabled="loading" @click="downloadCard">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download
        </button>

        <template v-if="attending">
          <!-- WhatsApp -->
          <button
            type="button"
            class="acp-btn acp-btn--wa"
            :disabled="loading || sendingWa || !leadPhone"
            @click="sendWhatsApp"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
              />
            </svg>
            {{ sendingWa ? "Opening…" : "Send WhatsApp" }}
          </button>

          <!-- Email -->
          <button
            type="button"
            class="acp-btn acp-btn--email"
            :disabled="loading || sendingEmail || !leadEmail"
            @click="sendEmail"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            {{ sendingEmail ? "Sending…" : "Send Email" }}
          </button>
        </template>
      </div>

      <!-- Feedback -->
      <p v-if="sendSuccess" class="acp-feedback acp-feedback--ok">{{ sendSuccess }}</p>
      <p v-else-if="sendError" class="acp-feedback acp-feedback--err">{{ sendError }}</p>

      <!-- Sent status -->
      <p v-if="invitationSent && sentLabel" class="acp-sent">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {{ sentLabel }}
      </p>
      <p v-if="attending && !leadPhone" class="acp-hint">No phone number — WhatsApp unavailable.</p>
      <p v-if="attending && !leadEmail" class="acp-hint">No email address — email unavailable.</p>
    </template>
  </div>
</template>

<style scoped>
/* ── Wrapper ──────────────────────────────────────────────────────── */
.acp-wrap {
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-items: flex-start;
}

.acp-empty {
  font-size: 0.85rem;
  color: #9a7b8e;
  font-style: italic;
}

.acp-card-wrap {
  position: relative;
  display: block;
  max-width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 12px;
}

.acp-overlay {
  position: absolute;
  inset: 0;
  border-radius: 16px;
  background: rgba(245, 237, 241, 0.72);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.acp-loading__spinner {
  width: 28px;
  height: 28px;
  border: 2.5px solid #e09f8c;
  border-top-color: #865172;
  border-radius: 50%;
  animation: acp-spin 0.7s linear infinite;
}

@keyframes acp-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── Card shell ───────────────────────────────────────────────────── */
.acp-card {
  position: relative;
  width: 480px;
  aspect-ratio: 3 / 4;
  background-color: #653853;
  border: 1.5px solid;
  border-image: linear-gradient(135deg, #fce8b3 0%, #d4af37 40%, #f5d77f 60%, #b48a1e 100%) 1;
  border-radius: 0;
  overflow: hidden;
  box-shadow:
    0 12px 40px -6px rgba(48, 34, 42, 0.25),
    0 3px 12px rgba(48, 34, 42, 0.1);
  padding: 14px;
  box-sizing: border-box;
}

/* Double border frame mimicking elegant wedding card stock */
.acp-inner-frame {
  border: 1.5px solid;
  border-image: linear-gradient(135deg, #b48a1e 0%, #f5d77f 40%, #d4af37 60%, #fce8b3 100%) 1;
  outline: 1px solid #d4af37;
  outline-offset: -4px;
  border-radius: 0;
  padding: 14px 12px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

.acp-capture-wrapper {
  padding: 8px;
  background: transparent;
  display: inline-block;
}

/* Paper grain texture overlay */
.acp-texture {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  opacity: 0.025;
  background-image:
    linear-gradient(90deg, rgba(255, 255, 255, 0.15) 50%, transparent 50%),
    linear-gradient(rgba(255, 255, 255, 0.15) 50%, transparent 50%);
  background-size: 2px 2px;
}

/* Everything above texture */
.acp-card > *:not(.acp-texture) {
  position: relative;
  z-index: 2;
}

/* ── Header ───────────────────────────────────────────────────────── */
.acp-header {
  background: transparent;
  padding: 12px 16px 8px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  width: 100%;
}

.acp-botanical {
  width: 160px;
  height: 36px;
  margin-bottom: 12px;
  opacity: 0.95;
}

.acp-couple {
  margin: 0;
  font-family: "Cinzel Decorative", serif;
  font-size: 1.25rem;
  font-weight: 700;
  background: linear-gradient(135deg, #fce8b3 0%, #d4af37 40%, #f5d77f 60%, #b48a1e 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 0.06em;
  line-height: 1.3;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
}

.acp-hashtag {
  margin: 6px 0 0;
  font-family: "Jost", sans-serif;
  font-size: 0.62rem;
  font-weight: 500;
  background: linear-gradient(135deg, #fce8b3 0%, #d4af37 50%, #b48a1e 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

/* ── Divider ──────────────────────────────────────────────────────── */
.acp-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 24px;
  margin: 12px 0 4px;
  width: 100%;
  box-sizing: border-box;
}

.acp-divider__line {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(212, 175, 55, 0.65), transparent);
}

.acp-divider__diamond {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}

/* ── Body ─────────────────────────────────────────────────────────── */
.acp-body {
  padding: 12px 16px 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 100%;
  box-sizing: border-box;
}

.acp-guest {
  margin: 0;
  font-family: "Lora", serif;
  font-size: 1.45rem;
  font-weight: 600;
  color: #faf5f8;
  letter-spacing: 0.01em;
  line-height: 1.25;
}

.acp-admits {
  margin: 4px 0 2px;
}

.acp-admits__pill {
  display: inline-block;
  padding: 3px 12px;
  border: 1px solid;
  border-image: linear-gradient(135deg, #fce8b3, #d4af37, #b48a1e) 1;
  border-radius: 0;
  font-family: "Jost", sans-serif;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: #faf5f8;
  text-transform: uppercase;
  background: rgba(212, 175, 55, 0.08);
}

.acp-group {
  margin: 2px 0 0;
  font-family: "Jost", sans-serif;
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(250, 245, 248, 0.7);
}

.acp-events {
  margin: 2px 0 0;
  font-family: "Lora", serif;
  font-size: 0.75rem;
  font-style: italic;
  color: rgba(250, 245, 248, 0.85);
  line-height: 1.4;
}

.acp-events__sep {
  color: #d4af37;
  font-style: normal;
}

.acp-events--loading {
  color: rgba(250, 245, 248, 0.4);
}

/* QR frame */
.acp-qr-frame {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
}

.acp-qr-inner {
  padding: 8px;
  background: #faf5f8;
  border: 1.5px solid;
  border-image: linear-gradient(135deg, #fce8b3, #d4af37, #b48a1e) 1;
  border-radius: 0;
  box-shadow: 0 4px 14px rgba(48, 34, 42, 0.2);
}

.acp-qr-canvas {
  display: block;
  border-radius: 4px;
}

.acp-qr-label {
  margin: 0;
  font-family: "Jost", sans-serif;
  font-size: 0.6rem;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(250, 245, 248, 0.6);
}

/* ── Footer ───────────────────────────────────────────────────────── */
.acp-footer {
  padding: 10px 16px 4px;
  text-align: center;
  background: transparent;
  border-top: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
  box-sizing: border-box;
}

.acp-footer__rule {
  width: 40px;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(212, 175, 55, 0.65), transparent);
  margin-bottom: 8px;
}

.acp-date {
  margin: 0;
  font-family: "Jost", sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  background: linear-gradient(135deg, #fce8b3 0%, #d4af37 50%, #b48a1e 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.acp-welcome {
  margin: 0;
  font-family: "Lora", serif;
  font-size: 0.75rem;
  font-style: italic;
  color: rgba(250, 245, 248, 0.7);
}

.acp-footer__hashtag {
  margin: 0;
  font-family: "Jost", sans-serif;
  font-size: 0.6rem;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(250, 245, 248, 0.5);
  opacity: 0.7;
}

/* Fallbacks during HTML2Canvas Export */
.acp-card.acp-exporting {
  border: 1.5px solid #d4af37;
  border-image: none;
}
.acp-card.acp-exporting .acp-inner-frame {
  border: 1.5px solid #d4af37;
  border-image: none;
  outline: 1.5px solid #d4af37;
}
.acp-card.acp-exporting .acp-couple {
  background: none;
  -webkit-background-clip: initial;
  background-clip: initial;
  -webkit-text-fill-color: initial;
  color: #d4af37;
}
.acp-card.acp-exporting .acp-hashtag {
  background: none;
  -webkit-background-clip: initial;
  background-clip: initial;
  -webkit-text-fill-color: initial;
  color: #d4af37;
}
.acp-card.acp-exporting .acp-date {
  background: none;
  -webkit-background-clip: initial;
  background-clip: initial;
  -webkit-text-fill-color: initial;
  color: #d4af37;
}
.acp-card.acp-exporting .acp-admits__pill {
  border: 1px solid #d4af37;
  border-image: none;
}
.acp-card.acp-exporting .acp-qr-inner {
  border: 1.5px solid #d4af37;
  border-image: none;
}

/* ── Actions ──────────────────────────────────────────────────────── */
.acp-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.acp-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid rgba(138, 98, 124, 0.4);
  border-radius: 6px;
  background: #fff;
  color: #865172;
  font-family: "Jost", sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 150ms,
    border-color 150ms,
    color 150ms;
}

.acp-btn:hover:not(:disabled) {
  background: #f5edf1;
  border-color: #865172;
  color: #30222a;
}

.acp-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.acp-btn--wa {
  background: #25d366;
  color: #fff;
  border-color: #25d366;
}
.acp-btn--wa:hover:not(:disabled) {
  background: #1eb556;
  border-color: #1eb556;
  color: #fff;
}

.acp-btn--email {
  background: #865172;
  color: #fff;
  border-color: #865172;
}
.acp-btn--email:hover:not(:disabled) {
  background: #653853;
  border-color: #653853;
  color: #fff;
}

.acp-sent {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: "Jost", sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  color: #2d7a47;
}

.acp-feedback {
  margin: 0;
  font-family: "Jost", sans-serif;
  font-size: 0.78rem;
  line-height: 1.4;
}
.acp-feedback--ok {
  color: #2d7a47;
}
.acp-feedback--err {
  color: #c0514a;
}

.acp-hint {
  margin: 0;
  font-family: "Jost", sans-serif;
  font-size: 0.74rem;
  color: #b5a0a8;
  font-style: italic;
}
</style>
