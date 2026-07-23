<script setup lang="ts">
import { siteConfig } from '~/config/site'

interface FooterProps {
  onImageClick?: (src: string) => void;
  couplesPhoto?: string | null;
  hashtag?: string;
  person1?: string;
  person2?: string;
  wishlistUrl?: string;
}

const props = withDefaults(defineProps<FooterProps>(), {
  hashtag: siteConfig.couple.hashtag,
  person1: siteConfig.couple.person1,
  person2: siteConfig.couple.person2,
  wishlistUrl: siteConfig.wishlistUrl,
})
</script>

<template>
  <footer class="bg-linen-white min-h-screen w-full flex flex-col items-center justify-center p-6 border-t border-amber-gold/15 text-center relative">
    <FadeInSection variant="scale-in" :distance="18">
      <div class="max-w-md mx-auto space-y-4 motion-stagger">
        <p class="text-4xl text-deep-espresso font-semibold font-display-cinzel">
          {{ hashtag }}
        </p>
        <p class="font-body text-base text-deep-espresso/80">
          Thank you for being part of our story. We can't wait to celebrate our union with you.
        </p>
        <div
          class="relative w-[150px] aspect-square mx-auto bg-white p-2 pb-6 rounded shadow border border-deep-espresso/5 rotate-3 scale-90 select-none motion-lift"
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
        <p v-if="wishlistUrl" class="font-body text-sm text-deep-espresso/70 pt-2">
          In case you were wondering what to gift us check this out →
          <a :href="wishlistUrl" target="_blank" rel="noopener noreferrer" class="text-amber-gold hover:underline ml-1">
            View Wishlist
          </a>
        </p>
      </div>
    </FadeInSection>
  </footer>
</template>
