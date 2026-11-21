<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import { useCachedDyrectedGlobal } from "~/composables/useCachedData";
import { publicPageTransition } from "~/composables/useMotion";

definePageMeta({
  pageTransition: publicPageTransition,
});

useHead({ title: "Order of Program | #TheSweetUnion" });

// Drop the PDF into /public/program/ with this exact name.
const PROGRAM_PDF_URL = "/program/order-of-program.pdf";

const { data: siteSettings } = useCachedDyrectedGlobal("site_settings", { depth: 2 });
const couplesPhoto = computed(() => (siteSettings.value as any)?.footerImage?.url || null);

// The page shows "coming soon" until the PDF actually exists.
// Checked in the browser: static files on Vercel are served by the CDN and
// are not visible to the server-side render.
const pdfAvailable = ref(false);
const pending = ref(true);

onMounted(async () => {
  try {
    const res = await fetch(PROGRAM_PDF_URL, { method: "HEAD", cache: "no-store" });
    pdfAvailable.value = res.ok && (res.headers.get("content-type") || "").includes("pdf");
  } catch {
    pdfAvailable.value = false;
  } finally {
    pending.value = false;
  }
});
</script>

<template>
  <div class="min-h-screen bg-warm-cream text-deep-espresso flex flex-col relative select-text">
    <Navigation />

    <section class="pt-32 pb-16 px-6 paper-texture border-b border-amber-gold/10 text-center relative overflow-hidden">
      <FadeInSection :distance="22">
        <div class="max-w-3xl mx-auto space-y-4! motion-stagger">
          <span class="font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase block">
            The Day
          </span>
          <h1 class="heading2-big md:text-6xl font-bold text-deep-espresso font-display-cinzel">Order of Program</h1>
          <p class="font-body text-deep-espresso/70 text-lg leading-relaxed max-w-xl mx-auto">
            Follow along with how the day will unfold. Download a copy to keep on your phone.
          </p>
        </div>
      </FadeInSection>
    </section>

    <main class="flex-1 paper-texture py-12 px-6">
      <div class="max-w-4xl mx-auto space-y-8">
        <div v-if="pending" class="text-center text-deep-espresso/50 font-body">Loading…</div>

        <template v-else-if="pdfAvailable">
          <div class="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              :href="PROGRAM_PDF_URL"
              download="Order-of-Program-TheSweetUnion.pdf"
              class="inline-flex items-center justify-center gap-2 px-8 py-3 min-h-11 rounded-full bg-deep-terracotta text-white font-heading text-sm font-semibold tracking-wider uppercase hover:opacity-90 transition-opacity"
            >
              Download PDF
            </a>
            <a
              :href="PROGRAM_PDF_URL"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center justify-center gap-2 px-8 py-3 min-h-11 rounded-full border border-amber-gold/40 text-deep-espresso font-heading text-sm font-semibold tracking-wider uppercase hover:bg-amber-gold/10 transition-colors"
            >
              Open in New Tab
            </a>
          </div>

          <!-- Inline preview (hidden on small screens, where mobile browsers can't embed PDFs well) -->
          <div class="hidden md:block rounded-2xl overflow-hidden border border-amber-gold/20 shadow-lg bg-white">
            <iframe :src="`${PROGRAM_PDF_URL}#view=FitH`" title="Order of Program" class="w-full h-[80vh]" />
          </div>
        </template>

        <div v-else class="text-center py-16 space-y-3">
          <p class="font-display-cinzel text-2xl font-bold">Coming soon</p>
          <p class="font-body text-deep-espresso/70 max-w-md mx-auto">
            The order of program isn't ready yet. Please check back closer to the day.
          </p>
        </div>
      </div>
    </main>

    <Footer :couples-photo="couplesPhoto" />
  </div>
</template>
