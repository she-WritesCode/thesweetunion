<script setup lang="ts">
import { computed } from "vue";

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
    <img
      :src="cardImageUrl"
      :alt="`Access Pass for ${guestName}`"
      class="acp-card-image"
      loading="eager"
    />
  </div>
</template>

<style scoped>
.acp-card-container {
  width: 100%;
  max-width: 320px;
  margin: 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
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
}
</style>
