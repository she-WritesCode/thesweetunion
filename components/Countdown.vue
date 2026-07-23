<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";

interface CountdownProps {
  targetDate: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const props = defineProps<CountdownProps>();

const timeLeft = ref<TimeLeft | null>(null);
let timer: NodeJS.Timeout | null = null;
let initialTimeout: NodeJS.Timeout | null = null;

const calculateTimeLeft = () => {
  const difference = +new Date(props.targetDate) - +new Date();
  if (difference <= 0) {
    return null;
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
};

const startTimer = () => {
  if (timer) clearInterval(timer);
  if (initialTimeout) clearTimeout(initialTimeout);

  initialTimeout = setTimeout(() => {
    timeLeft.value = calculateTimeLeft();
  }, 0);

  timer = setInterval(() => {
    timeLeft.value = calculateTimeLeft();
  }, 1000);
};

onMounted(() => {
  startTimer();
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
  if (initialTimeout) clearTimeout(initialTimeout);
});

watch(
  () => props.targetDate,
  () => {
    startTimer();
  },
);
</script>

<template>
  <div v-if="!timeLeft" class="text-center font-heading text-xl text-deep-terracotta italic py-6">
    The day has arrived! 🎉
  </div>
  <div v-else class="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6 max-w-2xl mx-auto py-8">
    <div
      v-for="block in [
        { label: 'Days', value: timeLeft.days },
        { label: 'Hours', value: timeLeft.hours },
        { label: 'Minutes', value: timeLeft.minutes },
        { label: 'Seconds', value: timeLeft.seconds },
      ]"
      :key="block.label"
      class="flex flex-col items-center justify-center min-w-[70px] sm:min-w-[90px] md:min-w-[110px] aspect-square rounded-2xl linen-card relative overflow-hidden group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 motion-lift"
    >
      <!-- Accent decoration inside the card -->
      <div
        class="absolute top-0 left-0 right-0 h-1 bg-amber-gold/50 group-hover:bg-deep-terracotta transition-colors duration-300"
      />

      <span class="font-heading text-2xl sm:text-3xl md:text-4xl font-semibold text-deep-espresso">
        {{ String(block.value).padStart(2, "0") }}
      </span>
      <span class="text-xs sm:text-sm font-body text-amber-gold font-medium uppercase tracking-wider mt-1">
        {{ block.label }}
      </span>
    </div>
  </div>
</template>
