<script setup lang="ts">
definePageMeta({
  layout: false
})
</script>

<template>
  <ClientOnly>
    <DyrectedAdmin api-path="/api/dyrected" />
  </ClientOnly>
</template>
