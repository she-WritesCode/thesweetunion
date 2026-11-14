<script setup lang="ts">
import { ref, computed, watch } from "vue";

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
    weddingDateText: "Saturday, November 21, 2026",
    loading: false,
    idPrefix: "access-card",
  },
);

const imageLoading = ref(true);

const cardImageUrl = computed(() => {
  const id = props.rsvpId || "guest";
  const params = new URLSearchParams();
  if (props.guestName) params.set("name", props.guestName);
  if (props.hasSpouse) {
    params.set("spouse", "true");
    if (props.spouseName) params.set("spouseName", props.spouseName);
  }
  if (props.groupName) params.set("group", props.groupName);
  if (props.eventNames && props.eventNames.length > 0) {
    params.set("events", props.eventNames.join(" · "));
  }
  if (props.coupleName) params.set("couple", props.coupleName);
  if (props.hashtag) params.set("hashtag", props.hashtag);
  if (props.weddingDateText) params.set("date", props.weddingDateText);

  return `/api/pass/card-image/${id}.png?${params.toString()}`;
});

watch(cardImageUrl, () => {
  imageLoading.value = true;
});

async function captureCardImage(): Promise<string> {
  const res = await fetch(cardImageUrl.value);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

async function downloadCard() {
  const downloadUrl = `${cardImageUrl.value}&download=true`;
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
    <!-- Skeleton loader placeholder while generating / downloading -->
    <div v-show="imageLoading" class="acp-card-skeleton">
      <div class="acp-skeleton-shimmer"></div>
      <div class="acp-skeleton-content">
        <div class="acp-skeleton-crest"></div>
        <div class="acp-skeleton-line short"></div>
        <div class="acp-skeleton-box"></div>
        <div class="acp-skeleton-line"></div>
      </div>
    </div>

    <img
      :src="cardImageUrl"
      :alt="`Access Pass for ${guestName}`"
      class="acp-card-image"
      :class="{ 'is-loading': imageLoading }"
      loading="eager"
      @load="imageLoading = false"
      @error="imageLoading = false"
    />
  </div>
</template>

<style scoped>
.acp-card-container {
  width: 100%;
  max-width: 320px;
  margin: 0 auto;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  aspect-ratio: 600 / 860;
}

.acp-card-skeleton {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #4a253b 0%, #301726 100%);
  border: 2px solid rgba(212, 175, 55, 0.4);
  box-shadow:
    0 14px 40px -6px rgba(0, 0, 0, 0.4),
    0 4px 14px rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  z-index: 1;
}

.acp-skeleton-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(212, 175, 55, 0.08) 50%,
    transparent 100%
  );
  animation: shimmer 1.8s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.acp-skeleton-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 75%;
}

.acp-skeleton-crest {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1.5px solid rgba(212, 175, 55, 0.3);
}

.acp-skeleton-line {
  height: 12px;
  width: 80%;
  border-radius: 4px;
  background: rgba(212, 175, 55, 0.15);
}

.acp-skeleton-line.short {
  width: 50%;
}

.acp-skeleton-box {
  width: 120px;
  height: 120px;
  border-radius: 8px;
  border: 1px dashed rgba(212, 175, 55, 0.3);
  background: rgba(212, 175, 55, 0.05);
}

.acp-card-image {
  width: 100%;
  max-width: 320px;
  height: auto;
  display: block;
  box-shadow:
    0 14px 40px -6px rgba(0, 0, 0, 0.4),
    0 4px 14px rgba(0, 0, 0, 0.25);
  border-radius: 0;
  transition: opacity 0.25s ease-in;
}

.acp-card-image.is-loading {
  opacity: 0;
}
</style>
