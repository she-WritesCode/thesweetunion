<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const isVisible = ref(false)
const isMounted = ref(false)
const domRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(() => {
  isMounted.value = true
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          isVisible.value = true
          if (domRef.value) {
            observer?.unobserve(domRef.value)
          }
        }
      })
    },
    {
      threshold: 0.15,
    }
  )

  if (domRef.value) {
    observer.observe(domRef.value)
  }
})

onUnmounted(() => {
  if (domRef.value && observer) {
    observer.unobserve(domRef.value)
  }
})
</script>

<template>
  <div
    ref="domRef"
    class="transition-all duration-1000 ease-out transform"
    :class="[
      isMounted ? (isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8') : 'opacity-100 translate-y-0'
    ]"
  >
    <slot />
  </div>
</template>
