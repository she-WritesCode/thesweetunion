<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from "vue";

const props = withDefaults(
  defineProps<{
    rsvpId?: string;
    guestName?: string;
    hasSpouse?: boolean;
    spouseName?: string;
    groupName?: string;
    eventNames?: string[];
    coupleName?: string;
    hashtag?: string;
    weddingDateText?: string;
    loading?: boolean;
    idPrefix?: string;
  }>(),
  {
    rsvpId: "",
    guestName: "Guest",
    hasSpouse: false,
    spouseName: "",
    groupName: "",
    eventNames: () => [],
    coupleName: "Adun & Uche",
    hashtag: "#TheSweetUnion",
    weddingDateText: "October 22 & 24, 2026",
    loading: false,
    idPrefix: "access-card",
  },
);

const qrCanvas = ref<HTMLCanvasElement | null>(null);

const uniqueCardId = computed(() => `${props.idPrefix}-${props.rsvpId || "guest"}`);
const uniqueCaptureId = computed(() => `${props.idPrefix}-capture-${props.rsvpId || "guest"}`);

async function renderQR() {
  if (!qrCanvas.value || !props.rsvpId) return;
  const QRCode = (await import("qrcode")).default;
  await QRCode.toCanvas(qrCanvas.value, props.rsvpId, {
    width: 110,
    margin: 1,
    color: { dark: "#865172", light: "#F5EDF1" },
  });
}

onMounted(async () => {
  await nextTick();
  await renderQR();
});

watch(
  () => [props.rsvpId, qrCanvas.value],
  async () => {
    await nextTick();
    await renderQR();
  },
  { deep: true },
);

async function captureCardImage(): Promise<string> {
  const captureEl = document.getElementById(uniqueCaptureId.value);
  const cardEl = document.getElementById(uniqueCardId.value);
  if (!captureEl || !cardEl) throw new Error("Card element not found");

  cardEl.classList.add("acp-exporting");
  try {
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(captureEl, { scale: 3, backgroundColor: null, useCORS: true });
    return canvas.toDataURL("image/png");
  } finally {
    cardEl.classList.remove("acp-exporting");
  }
}

async function downloadCard() {
  const dataUrl = await captureCardImage();
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `access-card-${(props.guestName || "guest").replace(/[^a-z0-9]/gi, "-").toLowerCase()}.png`;
  a.click();
}

defineExpose({
  captureCardImage,
  downloadCard,
  renderQR,
});
</script>

<template>
  <div class="acp-card-wrap">
    <div :id="uniqueCaptureId" class="acp-capture-wrapper">
      <div :id="uniqueCardId" class="acp-card">
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
              <linearGradient :id="`gold-foil-${rsvpId}`" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#FCE8B3" />
                <stop offset="40%" stop-color="#D4AF37" />
                <stop offset="60%" stop-color="#F5D77F" />
                <stop offset="100%" stop-color="#B48A1E" />
              </linearGradient>
            </defs>
            <path
              d="M80 18 C65 10, 48 8, 30 14"
              :stroke="`url(#gold-foil-${rsvpId})`"
              stroke-width="1"
              stroke-linecap="round"
            />
            <path
              d="M80 18 C95 10, 112 8, 130 14"
              :stroke="`url(#gold-foil-${rsvpId})`"
              stroke-width="1"
              stroke-linecap="round"
            />
            <path
              d="M50 14 C46 8, 40 6, 34 10"
              :stroke="`url(#gold-foil-${rsvpId})`"
              stroke-width="0.8"
              stroke-linecap="round"
            />
            <path
              d="M110 14 C114 8, 120 6, 126 10"
              :stroke="`url(#gold-foil-${rsvpId})`"
              stroke-width="0.8"
              stroke-linecap="round"
            />
            <path
              d="M60 12 C57 6, 53 4, 48 7"
              :stroke="`url(#gold-foil-${rsvpId})`"
              stroke-width="0.7"
              stroke-linecap="round"
              opacity="0.7"
            />
            <path
              d="M100 12 C103 6, 107 4, 112 7"
              :stroke="`url(#gold-foil-${rsvpId})`"
              stroke-width="0.7"
              stroke-linecap="round"
              opacity="0.7"
            />
            <circle cx="80" cy="18" r="1.5" :fill="`url(#gold-foil-${rsvpId})`" opacity="0.8" />
            <circle cx="34" cy="10" r="1" :fill="`url(#gold-foil-${rsvpId})`" opacity="0.6" />
            <circle cx="126" cy="10" r="1" :fill="`url(#gold-foil-${rsvpId})`" opacity="0.6" />
          </svg>

          <p class="acp-couple">{{ coupleName }}</p>
          <p class="acp-hashtag">{{ hashtag }}</p>

          <!-- ── Divider ─────────────────────────────────────── -->
          <div class="acp-divider">
            <span class="acp-divider__line" />
            <svg class="acp-divider__diamond" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <defs>
                <linearGradient :id="`gold-foil-diamond-${rsvpId}`" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#FCE8B3" />
                  <stop offset="40%" stop-color="#D4AF37" />
                  <stop offset="60%" stop-color="#F5D77F" />
                  <stop offset="100%" stop-color="#B48A1E" />
                </linearGradient>
              </defs>
              <path d="M6 1 L11 6 L6 11 L1 6 Z" :fill="`url(#gold-foil-diamond-${rsvpId})`" opacity="0.85" />
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
              <p class="acp-qr-label">{{ rsvpId ? rsvpId.toUpperCase() : "Show at entrance" }}</p>
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

    <!-- Loading overlay -->
    <div v-if="loading" class="acp-overlay" aria-hidden="true">
      <div class="acp-loading__spinner" />
    </div>
  </div>
</template>

<style scoped>
.acp-card-wrap {
  position: relative;
  display: block;
  max-width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 8px;
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
  width: 100%;
  max-width: 320px;
  aspect-ratio: 3 / 4;
  background-color: #653853;
  border: 1.5px solid;
  border-image: linear-gradient(135deg, #fce8b3 0%, #d4af37 40%, #f5d77f 60%, #b48a1e 100%) 1;
  border-radius: 0;
  overflow: hidden;
  box-shadow:
    0 12px 40px -6px rgba(48, 34, 42, 0.25),
    0 3px 12px rgba(48, 34, 42, 0.1);
  padding: 10px;
  box-sizing: border-box;
  margin: 0 auto;
}

/* Double border frame */
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
  padding: 4px;
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

.acp-card > *:not(.acp-texture) {
  position: relative;
  z-index: 2;
}

.acp-botanical {
  width: 150px;
  height: 34px;
  margin-bottom: 8px;
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
  text-align: center;
}

.acp-hashtag {
  margin: 4px 0 0;
  font-family: "Jost", sans-serif;
  font-size: 0.62rem;
  font-weight: 500;
  background: linear-gradient(135deg, #fce8b3 0%, #d4af37 50%, #b48a1e 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  text-align: center;
}

.acp-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px;
  margin: 8px 0 2px;
  width: 100%;
  box-sizing: border-box;
}

.acp-divider__line {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(212, 175, 55, 0.65), transparent);
}

.acp-divider__diamond {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
}

.acp-body {
  padding: 8px 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
  box-sizing: border-box;
}

.acp-guest {
  margin: 0;
  font-family: "Lora", serif;
  font-size: 1.35rem;
  font-weight: 600;
  color: #faf5f8;
  letter-spacing: 0.01em;
  line-height: 1.25;
}

.acp-admits {
  margin: 2px 0;
}

.acp-admits__pill {
  display: inline-block;
  padding: 2px 10px;
  border: 1px solid;
  border-image: linear-gradient(135deg, #fce8b3, #d4af37, #b48a1e) 1;
  border-radius: 0;
  font-family: "Jost", sans-serif;
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: #faf5f8;
  text-transform: uppercase;
  background: rgba(212, 175, 55, 0.08);
}

.acp-group {
  margin: 2px 0 0;
  font-family: "Jost", sans-serif;
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(250, 245, 248, 0.7);
}

.acp-events {
  margin: 2px 0 0;
  font-family: "Lora", serif;
  font-size: 0.72rem;
  font-style: italic;
  color: rgba(250, 245, 248, 0.85);
  line-height: 1.3;
}

.acp-events__sep {
  color: #d4af37;
  font-style: normal;
}

.acp-events--loading {
  color: rgba(250, 245, 248, 0.4);
}

.acp-qr-frame {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.acp-qr-inner {
  padding: 6px;
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
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #d4af37;
}

.acp-footer {
  padding: 8px 12px 2px;
  text-align: center;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: 100%;
  box-sizing: border-box;
}

.acp-footer__rule {
  width: 36px;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(212, 175, 55, 0.65), transparent);
  margin-bottom: 6px;
}

.acp-date {
  margin: 0;
  font-family: "Jost", sans-serif;
  font-size: 0.68rem;
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
  font-size: 0.72rem;
  font-style: italic;
  color: rgba(250, 245, 248, 0.7);
}

.acp-footer__hashtag {
  margin: 0;
  font-family: "Jost", sans-serif;
  font-size: 0.58rem;
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
.acp-card.acp-exporting .acp-couple,
.acp-card.acp-exporting .acp-hashtag,
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
</style>
