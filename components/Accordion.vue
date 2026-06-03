<script setup lang="ts">
import { ref } from 'vue'

interface AccordionItem {
  key: string;
  question: string;
  answer: string;
}

interface AccordionProps {
  items: AccordionItem[];
}

defineProps<AccordionProps>()

const openKey = ref<string | null>(null)

const toggle = (key: string) => {
  openKey.value = openKey.value === key ? null : key
}
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-4">
    <div
      v-for="item in items"
      :key="item.key"
      class="linen-card rounded-2xl overflow-hidden transition-all duration-300 border border-amber-gold/15"
    >
      <button
        @click="toggle(item.key)"
        :aria-expanded="openKey === item.key"
        class="w-full text-left px-6 py-5 flex items-center justify-between gap-4 font-heading text-lg font-bold text-deep-espresso hover:text-deep-terracotta transition-colors duration-300 focus:outline-none"
      >
        <span>{{ item.question }}</span>
        <svg
          class="w-5 h-5 text-amber-gold transition-transform duration-300 shrink-0"
          :class="{ 'rotate-180 text-deep-terracotta': openKey === item.key }"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      <div
        class="transition-all duration-300 ease-in-out overflow-hidden"
        :class="openKey === item.key ? 'max-h-[300px] border-t border-amber-gold/10' : 'max-h-0'"
      >
        <div class="px-6 py-5 font-body text-base text-deep-espresso/80 leading-relaxed bg-warm-cream/30">
          {{ item.answer }}
        </div>
      </div>
    </div>
  </div>
</template>
