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
    guestName: "Honoured Guest",
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

const displayName = computed(() => {
  if (props.hasSpouse && props.spouseName) {
    return `${props.guestName} & ${props.spouseName}`;
  }
  return props.guestName || "Honoured Guest";
});

const passCode = computed(() => (props.rsvpId || "SHOW AT ENTRANCE").toUpperCase());

async function renderQR() {
  if (!qrCanvas.value || !props.rsvpId) return;
  try {
    const QRCode = (await import("qrcode")).default;
    const passUrl = `https://thesweetunion.com/pass/${props.rsvpId.toLowerCase()}`;
    await QRCode.toCanvas(qrCanvas.value, passUrl, {
      width: 110,
      margin: 1,
      color: { dark: "#865172", light: "#F5EDF1" },
    });
  } catch (err) {
    console.warn("QR canvas render warning:", err);
  }
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
  if (props.rsvpId) {
    try {
      const res = await fetch(`/api/pass/card-image/${props.rsvpId}.png`);
      if (res.ok) {
        const blob = await res.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
    } catch {
      // fallback to html2canvas
    }
  }

  const captureEl = document.getElementById(uniqueCaptureId.value);
  const cardEl = document.getElementById(uniqueCardId.value);
  if (!captureEl || !cardEl) throw new Error("Card element not found");

  const html2canvas = (await import("html2canvas")).default;
  const canvas = await html2canvas(captureEl, { scale: 2, backgroundColor: null, useCORS: true });
  return canvas.toDataURL("image/png");
}

async function downloadCard() {
  if (!props.rsvpId) return;
  const downloadUrl = `/api/pass/card-image/${props.rsvpId}.png?download=true`;
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = `wedding-pass-${(props.guestName || "guest").replace(/[^a-z0-9]/gi, "-").toLowerCase()}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
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
        <!-- Paper grain subtle overlay -->
        <div class="acp-texture" aria-hidden="true" />

        <div class="acp-inner-frame">
          <!-- ── Header ──────────────────────────────────────── -->
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
              stroke-width="1.2"
              stroke-linecap="round"
            />
            <path
              d="M80 18 C95 10, 112 8, 130 14"
              :stroke="`url(#gold-foil-${rsvpId})`"
              stroke-width="1.2"
              stroke-linecap="round"
            />
            <path
              d="M50 14 C46 8, 40 6, 34 10"
              :stroke="`url(#gold-foil-${rsvpId})`"
              stroke-width="0.9"
              stroke-linecap="round"
            />
            <path
              d="M110 14 C114 8, 120 6, 126 10"
              :stroke="`url(#gold-foil-${rsvpId})`"
              stroke-width="0.9"
              stroke-linecap="round"
            />
            <circle cx="80" cy="18" r="1.8" :fill="`url(#gold-foil-${rsvpId})`" />
            <circle cx="34" cy="10" r="1.2" :fill="`url(#gold-foil-${rsvpId})`" opacity="0.8" />
            <circle cx="126" cy="10" r="1.2" :fill="`url(#gold-foil-${rsvpId})`" opacity="0.8" />
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
              <path d="M6 1 L11 6 L6 11 L1 6 Z" :fill="`url(#gold-foil-diamond-${rsvpId})`" opacity="0.9" />
            </svg>
            <span class="acp-divider__line" />
          </div>

          <!-- ── Body ───────────────────────────────────────── -->
          <div class="acp-body">
            <p class="acp-guest">{{ displayName }}</p>

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
              <p class="acp-qr-label">{{ passCode }}</p>
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
  </div>
</template>

<style scoped>
.acp-card-wrap {
  position: relative;
  display: block;
  max-width: 100%;
  margin: 0 auto;
}

/* ── Card shell ───────────────────────────────────────────────────── */
.acp-card {
  position: relative;
  width: 100%;
  max-width: 320px;
  background: linear-gradient(135deg, #653853 0%, #4a253b 100%);
  border: 1.5px solid;
  border-image: linear-gradient(135deg, #fce8b3 0%, #d4af37 40%, #f5d77f 60%, #b48a1e 100%) 1;
  border-radius: 0;
  box-shadow:
    0 12px 36px -6px rgba(0, 0, 0, 0.35),
    0 4px 12px rgba(0, 0, 0, 0.2);
  padding: 8px;
  box-sizing: border-box;
  margin: 0 auto;
}

/* Double border frame */
.acp-inner-frame {
  border: 1.5px solid;
  border-image: linear-gradient(135deg, #b48a1e 0%, #f5d77f 40%, #d4af37 60%, #fce8b3 100%) 1;
  outline: 1px solid #d4af37;
  outline-offset: -3px;
  border-radius: 0;
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 2px;
  width: 100%;
  box-sizing: border-box;
}

.acp-capture-wrapper {
  padding: 2px;
  background: transparent;
  display: block;
}

/* Paper grain texture overlay */
.acp-texture {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  opacity: 0.03;
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
  width: 140px;
  height: 28px;
  margin-bottom: 4px;
  opacity: 0.95;
}

.acp-couple {
  margin: 0;
  font-family: "Cinzel Decorative", "Cinzel", serif;
  font-size: 1.25rem;
  font-weight: 700;
  background: linear-gradient(135deg, #fce8b3 0%, #d4af37 40%, #f5d77f 60%, #b48a1e 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 0.08em;
  line-height: 1.2;
  text-align: center;
}

.acp-hashtag {
  margin: 2px 0 0;
  font-family: "Jost", "Inter", sans-serif;
  font-size: 0.6rem;
  font-weight: 600;
  background: linear-gradient(135deg, #fce8b3 0%, #d4af37 50%, #b48a1e 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  text-align: center;
}

.acp-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  margin: 6px 0 4px;
  width: 100%;
  box-sizing: border-box;
}

.acp-divider__line {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(212, 175, 55, 0.65), transparent);
}

.acp-divider__diamond {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
}

.acp-body {
  padding: 4px 6px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: 100%;
  box-sizing: border-box;
}

.acp-guest {
  margin: 0;
  font-family: "Lora", "Cinzel", serif;
  font-size: 1.25rem;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: 0.01em;
  line-height: 1.2;
}

.acp-admits {
  margin: 2px 0;
}

.acp-admits__pill {
  display: inline-block;
  padding: 2px 8px;
  border: 1px solid;
  border-image: linear-gradient(135deg, #fce8b3, #d4af37, #b48a1e) 1;
  border-radius: 0;
  font-family: "Jost", "Inter", sans-serif;
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: #faf5f8;
  text-transform: uppercase;
  background: rgba(212, 175, 55, 0.12);
}

.acp-group {
  margin: 2px 0 0;
  font-family: "Jost", "Inter", sans-serif;
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #d4af37;
}

.acp-events {
  margin: 2px 0 0;
  font-family: "Lora", serif;
  font-size: 0.7rem;
  font-style: italic;
  color: rgba(250, 245, 248, 0.9);
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
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.acp-qr-inner {
  padding: 5px;
  background: #faf5f8;
  border: 1.5px solid;
  border-image: linear-gradient(135deg, #fce8b3, #d4af37, #b48a1e) 1;
  border-radius: 0;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
}

.acp-qr-canvas {
  display: block;
}

.acp-qr-label {
  margin: 0;
  font-family: "Jost", "Inter", sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #d4af37;
}

.acp-footer {
  padding: 6px 8px 2px;
  text-align: center;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 100%;
  box-sizing: border-box;
}

.acp-footer__rule {
  width: 36px;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(212, 175, 55, 0.65), transparent);
  margin-bottom: 4px;
}

.acp-date {
  margin: 0;
  font-family: "Jost", "Inter", sans-serif;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background: linear-gradient(135deg, #fce8b3 0%, #d4af37 50%, #b48a1e 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.acp-welcome {
  margin: 0;
  font-family: "Lora", serif;
  font-size: 0.68rem;
  font-style: italic;
  color: rgba(250, 245, 248, 0.75);
}

.acp-footer__hashtag {
  margin: 0;
  font-family: "Jost", "Inter", sans-serif;
  font-size: 0.58rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #d4af37;
  opacity: 0.8;
}
</style>
