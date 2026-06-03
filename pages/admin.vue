<script setup lang="ts">
definePageMeta({
  layout: false
})
useHead({
  bodyAttrs: {
    class: 'cms-admin-page'
  }
})
</script>

<template>
  <ClientOnly>
    <DyrectedAdmin api-path="/api/dyrected" />
  </ClientOnly>
</template>
