import { computed, onBeforeUnmount, onMounted, ref } from "vue";

export const motionTokens = {
  duration: {
    fast: 180,
    base: 320,
    slow: 560,
    hero: 900,
  },
  easing: {
    standard: "cubic-bezier(0.22, 1, 0.36, 1)",
    soft: "cubic-bezier(0.16, 1, 0.3, 1)",
  },
  distance: {
    xs: 10,
    sm: 18,
    md: 28,
    lg: 42,
  },
  delay: {
    xs: 60,
    sm: 120,
    md: 180,
    lg: 260,
  },
} as const;

export const publicPageTransition = {
  name: "page-soft",
  mode: "out-in" as const,
};

export function useReducedMotion() {
  const prefersReducedMotion = ref(false);
  let mediaQuery: MediaQueryList | null = null;

  const updatePreference = (event?: MediaQueryListEvent) => {
    prefersReducedMotion.value = event?.matches ?? mediaQuery?.matches ?? false;
  };

  onMounted(() => {
    mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    updatePreference();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updatePreference);
      onBeforeUnmount(() => mediaQuery?.removeEventListener("change", updatePreference));
      return;
    }

    mediaQuery.addListener(updatePreference);
    onBeforeUnmount(() => mediaQuery?.removeListener(updatePreference));
  });

  return {
    prefersReducedMotion,
    motionSafe: computed(() => !prefersReducedMotion.value),
  };
}
