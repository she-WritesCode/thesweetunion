<script setup lang="ts">
interface TimelineItem {
  key: string;
  label: string;
  title: string;
  description: string;
  imageUrl: string;
  photo?: any;
}

interface TimelineProps {
  items: TimelineItem[];
}

defineProps<TimelineProps>();

const emit = defineEmits<{
  (e: "imageClick", url: string): void;
}>();

const collageStyles = [
  {
    rotation: "rotate-[-2deg]",
    tapeRotation: "rotate-[-8deg] left-8 -top-3.5",
    tapeColor: "washi-tape-terracotta",
  },
  {
    rotation: "rotate-[2.5deg]",
    tapeRotation: "rotate-[9deg] right-8 -top-3",
    tapeColor: "washi-tape-gold",
  },
  {
    rotation: "rotate-[-1.5deg]",
    tapeRotation: "rotate-[-5deg] left-12 -top-4",
    tapeColor: "washi-tape",
  },
  {
    rotation: "rotate-[3deg]",
    tapeRotation: "rotate-[10deg] right-12 -top-3.5",
    tapeColor: "washi-tape-terracotta",
  },
];
</script>

<template>
  <div class="w-full max-w-4xl mx-auto py-6 px-4 select-text relative">
    <!-- Tall scroll container that controls the stack leave timing -->
    <div
      class="relative w-full"
      :style="{ height: `${Math.max(items.length, 1) * 75}vh` }"
    >
      <!-- Each story card track -->
      <div
        v-for="(item, index) in items"
        :key="item.key"
        class="absolute left-0 right-0 w-full"
        :style="{
          top: `${index * 75}vh`,
          height: `${items.length === 1 ? 75 : index === items.length - 1 ? 75 : 75}vh`,
          zIndex: items.length - index,
        }"
      >
        <!-- Sticky card inside track -->
        <div
          class="sticky w-full max-w-lg mx-auto transition-all duration-300 motion-lift"
          :style="{
            top: `calc(7rem + ${(items.length - 1 - index) * 4}px)`,
          }"
        >
          <!-- Washi tape accent holding the polaroid card -->
          <div
            class="washi-tape absolute z-30 pointer-events-none"
            :class="[
              collageStyles[index % collageStyles.length].tapeRotation,
              collageStyles[index % collageStyles.length].tapeColor,
            ]"
          />

          <!-- Polaroid Card -->
          <div
            class="bg-white p-4 sm:p-5 pb-7 sm:pb-8 rounded-lg shadow-2xl border border-deep-espresso/10 flex flex-col transform hover:scale-[1.02] hover:rotate-0 transition-transform duration-300 cursor-default"
            :class="collageStyles[index % collageStyles.length].rotation"
          >
            <!-- Photo Frame -->
            <div
              class="relative aspect-4/3 w-full overflow-hidden bg-deep-espresso/5 rounded-sm border border-deep-espresso/10 cursor-zoom-in group"
              @click="emit('imageClick', item.imageUrl)"
            >
              <DyrectedMedia
                :media="(item as any).photo || item.imageUrl"
                :alt="item.title"
                class="img-fill transition-transform duration-500 group-hover:scale-105"
              />
              <!-- Subtle gradient overlay -->
              <div class="absolute inset-0 bg-gradient-to-t from-deep-espresso/15 via-transparent to-transparent pointer-events-none" />
              <!-- Zoom hint badge -->
              <div class="absolute bottom-2 right-2 bg-deep-espresso/60 backdrop-blur-xs text-warm-cream text-[10px] uppercase tracking-wider px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                Zoom
              </div>
            </div>

            <!-- Handwritten style story entry -->
            <div class="mt-4 space-y-2 text-deep-espresso text-left select-text">
              <div class="flex items-center justify-between border-b border-amber-gold/20 pb-1.5">
                <span class="font-display-cormorant text-2xl sm:text-3xl font-bold text-deep-terracotta">
                  {{ item.title }}
                </span>
                <span class="font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase">
                  {{ item.label }}
                </span>
              </div>
              <p class="font-body text-base sm:text-lg text-deep-espresso/85 leading-relaxed italic">
                "{{ item.description }}"
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
