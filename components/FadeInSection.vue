<script setup lang="ts">
import { ref } from 'vue'

const isVisible = ref(true)
</script>

<template>
  <div class="opacity-100 translate-y-0">
    <slot />
  </div>
</template>
