<script setup lang="ts">
const route = useRoute();
const showPublicCursor = computed(() => !route.path.startsWith("/admin"));
</script>

<template>
  <div class="min-h-full flex flex-col">
    <PressedStampCursor v-if="showPublicCursor" />
    <slot />
  </div>
</template>
