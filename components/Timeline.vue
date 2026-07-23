<script setup lang="ts">
import { ref } from "vue";

interface TimelineItem {
  key: string;
  label: string;
  title: string;
  description: string;
  imageUrl: string;
}

interface TimelineProps {
  items: TimelineItem[];
  fontClass: string;
}

defineProps<TimelineProps>();

const hoveredIndex = ref<number | null>(null);
</script>

<template>
  <div class="relative border-l border-amber-gold/30 ml-4 md:ml-[50%] md:border-l-0 py-8 select-text">
    <!-- Visual centerline for desktop -->
    <div class="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-amber-gold/30" />

    <div
      v-for="(item, index) in items"
      :key="item.key"
      class="relative mb-16 last:mb-0 md:flex md:w-full items-center"
      :class="index % 2 === 0 ? 'md:justify-start' : 'md:justify-end'"
      @mouseenter="hoveredIndex = index"
      @mouseleave="hoveredIndex = null"
    >
      <!-- Timeline node/marker -->
      <div
        class="absolute left-[-21px] md:left-1/2 md:ml-[-10px] w-5 h-5 rounded-full border-2 border-amber-gold bg-warm-cream flex items-center justify-center transition-all duration-500 z-20"
        :class="{ 'scale-125 border-deep-terracotta bg-linen-white': hoveredIndex === index }"
      >
        <div
          class="w-2 h-2 rounded-full bg-amber-gold transition-colors duration-500"
          :class="{ 'bg-deep-terracotta': hoveredIndex === index }"
        />
      </div>

      <!-- Timeline content card (Polaroid-style) -->
      <div
        class="w-full pl-6 md:pl-0 md:w-[45%] transition-all duration-500"
        :class="[
          index % 2 === 0 ? 'md:pr-12 text-left md:text-right' : 'md:pl-12 text-left',
          hoveredIndex === index ? 'translate-y-[-4px]' : '',
        ]"
      >
        <div
          class="linen-card overflow-hidden rounded-2xl border border-amber-gold/20 transition-all duration-500 hover:shadow-xl hover:border-amber-gold/45 bg-linen-white"
        >
          <!-- Polaroid Image Wrapper -->
          <div class="relative w-full aspect-4/3 overflow-hidden bg-deep-espresso/5 border-b border-amber-gold/10">
            <img
              :src="item.imageUrl"
              :alt="item.title"
              class="w-full h-full object-cover transition-transform duration-700 ease-out"
              :class="hoveredIndex === index ? 'scale-105' : 'scale-100'"
            />
            <!-- Soft paper grain overlay inside the photo -->
            <div
              class="absolute inset-0 bg-gradient-to-t from-deep-espresso/30 to-transparent pointer-events-none mix-blend-multiply"
            />
          </div>

          <!-- Card Text Content -->
          <div class="p-6 sm:p-8">
            <span
              class="inline-block font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase mb-2"
            >
              {{ item.label }}
            </span>

            <h3 class="text-2xl font-bold text-deep-espresso mb-3 transition-colors duration-300" :class="fontClass">
              {{ item.title }}
            </h3>

            <p class="font-body text-base sm:text-lg text-deep-espresso/80 leading-relaxed">
              {{ item.description }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
