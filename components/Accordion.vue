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
  <div class="accordion-container">
    <div v-for="item in items" :key="item.key" class="accordion-item linen-card motion-lift">
      <button
        @click="toggle(item.key)"
        :aria-expanded="openKey === item.key"
        class="accordion-trigger"
      >
        <span>{{ item.question }}</span>
        <svg
          class="accordion-icon"
          :class="{ 'accordion-icon--open': openKey === item.key }"
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
        class="accordion-content"
        :class="openKey === item.key ? 'accordion-content--open' : 'accordion-content--closed'"
      >
        <div class="accordion-body">
          {{ item.answer }}
        </div>
      </div>
    </div>
  </div>
</template>
