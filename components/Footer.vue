<script setup lang="ts">
import { siteConfig } from '~/config/site'

interface FooterProps {
  onImageClick?: (src: string) => void;
  couplesPhoto?: string | null;
  hashtag?: string;
  person1?: string;
  person2?: string;
}

const props = withDefaults(defineProps<FooterProps>(), {
  hashtag: siteConfig.couple.hashtag,
  person1: siteConfig.couple.person1,
  person2: siteConfig.couple.person2,
})
</script>

<template>
  <footer class="bg-linen-white min-h-screen w-full flex flex-col items-center justify-center p-6 border-t border-amber-gold/15 text-center relative">
    <FadeInSection>
      <div class="max-w-md mx-auto space-y-4">
        <p class="text-4xl text-deep-espresso font-semibold font-display-cinzel">
          {{ hashtag }}
        </p>
        <p class="font-body text-base text-deep-espresso/80">
          Thank you for being part of our story. We can't wait to celebrate our union with you.
        </p>
        <div
          class="relative w-[150px] aspect-square mx-auto bg-white p-2 pb-6 rounded shadow border border-deep-espresso/5 rotate-3 scale-90 select-none"
          :class="onImageClick && couplesPhoto ? 'cursor-zoom-in' : ''"
          @click="couplesPhoto && onImageClick?.(couplesPhoto)"
        >
          <div class="relative w-full h-full overflow-hidden bg-deep-espresso/5 rounded-sm">
            <img
              v-if="couplesPhoto"
              :src="couplesPhoto"
              alt="Memory"
              class="img-fill"
            />
          </div>
        </div>
        <p class="font-body text-xs text-deep-espresso/60 pt-4">
          © 2026 {{ person1 }} & {{ person2 }}. Handcrafted with love.
        </p>
      </div>
    </FadeInSection>
  </footer>
</template>
