<script setup lang="ts">
import { ref, computed } from "vue";

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

const imgLoaded = ref(false);
const cardImageUrl = computed(() => {
  if (!props.rsvpId) return "";
  return `/api/pass/card-image/${props.rsvpId}.png`;
});

async function captureCardImage(): Promise<string> {
  if (!props.rsvpId) return "";
  const res = await fetch(`/api/pass/card-image/${props.rsvpId}.png`);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
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
});
</script>

<template>
  <div class="acp-card-container">
    <!-- Skeleton placeholder while image loads -->
    <div v-if="!imgLoaded || loading" class="acp-card-skeleton" aria-hidden="true">
      <div class="acp-skeleton-spinner" />
      <span class="acp-skeleton-text">Generating Pass…</span>
    </div>

    <!-- 100% Pixel-Perfect Server-Rendered Resvg Card Image -->
    <img
      v-if="cardImageUrl"
      :src="cardImageUrl"
      :alt="`Access Pass for ${guestName}`"
      class="acp-card-image"
      :class="{ 'acp-card-image--loaded': imgLoaded }"
      loading="eager"
      @load="imgLoaded = true"
    />
  </div>
</template>

<style scoped>
.acp-card-container {
  position: relative;
  width: 100%;
  max-width: 320px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto;
}

.acp-card-skeleton {
  width: 100%;
  max-width: 320px;
  aspect-ratio: 600 / 860;
  background: linear-gradient(135deg, #4a253b, #2d1222);
  border: 1.5px solid #d4af37;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.acp-skeleton-spinner {
  width: 28px;
  height: 28px;
  border: 2px solid rgba(212, 175, 55, 0.3);
  border-top-color: #d4af37;
  border-radius: 50%;
  animation: acp-spin 0.8s linear infinite;
}

.acp-skeleton-text {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #fce8b3;
}

@keyframes acp-spin {
  to {
    transform: rotate(360deg);
  }
}

.acp-card-image {
  width: 100%;
  max-width: 320px;
  height: auto;
  display: block;
  box-shadow:
    0 12px 36px -6px rgba(0, 0, 0, 0.35),
    0 4px 12px rgba(0, 0, 0, 0.2);
  opacity: 0;
  transition: opacity 250ms ease-in-out;
}

.acp-card-image--loaded {
  opacity: 1;
}
</style>
