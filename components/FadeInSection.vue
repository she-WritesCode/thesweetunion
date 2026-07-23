<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { motionTokens, useReducedMotion } from "~/composables/useMotion";

interface FadeInSectionProps {
  as?: string;
  variant?: "fade-up" | "fade-in" | "scale-in";
  delay?: number;
  duration?: number;
  distance?: number;
  once?: boolean;
  threshold?: number;
  rootMargin?: string;
  class?: string;
}

const props = withDefaults(defineProps<FadeInSectionProps>(), {
  as: "div",
  variant: "fade-up",
  delay: 0,
  duration: motionTokens.duration.slow,
  distance: motionTokens.distance.md,
  once: true,
  threshold: 0.2,
  rootMargin: "0px 0px -12% 0px",
  class: "",
});

const elementRef = ref<HTMLElement | null>(null);
const isVisible = ref(false);
const hasEntered = ref(false);
const { prefersReducedMotion } = useReducedMotion();
let observer: IntersectionObserver | null = null;

const revealClass = computed(() => {
  if (prefersReducedMotion.value) {
    return "motion-reveal motion-reveal--ready";
  }

  return [
    "motion-reveal",
    `motion-reveal--${props.variant}`,
    (isVisible.value || hasEntered.value) && "motion-reveal--ready",
  ]
    .filter(Boolean)
    .join(" ");
});

const revealStyle = computed(() => ({
  "--motion-delay": `${props.delay}ms`,
  "--motion-duration": `${props.duration}ms`,
  "--motion-distance": `${props.distance}px`,
  "--motion-ease": motionTokens.easing.standard,
}));

onMounted(() => {
  if (prefersReducedMotion.value) {
    isVisible.value = true;
    hasEntered.value = true;
    return;
  }

  observer = new IntersectionObserver(
    (entries) => {
      const [entry] = entries;
      if (!entry) return;

      if (entry.isIntersecting) {
        isVisible.value = true;
        hasEntered.value = true;
        if (props.once) {
          observer?.disconnect();
          observer = null;
        }
        return;
      }

      if (!props.once) {
        isVisible.value = false;
      }
    },
    {
      threshold: props.threshold,
      rootMargin: props.rootMargin,
    },
  );

  if (elementRef.value) {
    observer.observe(elementRef.value);
  }
});

onBeforeUnmount(() => {
  observer?.disconnect();
});
</script>

<template>
  <component :is="as" ref="elementRef" :class="[revealClass, props.class]" :style="revealStyle">
    <slot />
  </component>
</template>
