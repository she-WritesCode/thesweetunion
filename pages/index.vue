<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import { siteConfig as fallbackConfig } from "~/config/site";
import { createClient } from "@dyrected/sdk";
import { useAsyncData, useRuntimeConfig } from "#app";

const runtimeConfig = useRuntimeConfig();
const client = createClient({
  baseUrl: runtimeConfig.public.dyrectedUrl,
  apiKey: runtimeConfig.public.dyrectedApiKey,
});

const { data: siteSettings } = await useAsyncData("site-settings", () => client.global("site_settings").get());

const config = computed(() => {
  const db = siteSettings.value as any;
  if (!db) return fallbackConfig;

  return {
    couple: {
      person1: db.partnerOneName || fallbackConfig.couple.person1,
      person2: db.partnerTwoName || fallbackConfig.couple.person2,
      hashtag: db.hashtag || fallbackConfig.couple.hashtag,
    },
    weddingDate: db.weddingDate ? `${db.weddingDate}T${db.weddingTime || "13:00:00"}` : fallbackConfig.weddingDate,
    rsvpCutoffDate: db.rsvpCutoffDate
      ? `${db.rsvpCutoffDate}T${db.rsvpCutoffTime || "23:59:59"}`
      : fallbackConfig.rsvpCutoffDate,
    story:
      db.storyPhotos && db.storyPhotos.length > 0
        ? db.storyPhotos.map((p: any, i: number) => ({
            key: p.id || `story-${i}`,
            label: p.caption || `Chapter ${i + 1}`,
            title: p.caption || `Memory ${i + 1}`,
            description: p.caption || "",
            imageUrl: p.photo?.url || fallbackConfig.story[i % fallbackConfig.story.length].imageUrl,
          }))
        : fallbackConfig.story,
    events:
      db.schedule && db.schedule.length > 0
        ? [
            {
              key: "white-ceremony",
              name: db.venueName || fallbackConfig.events[0].name,
              date: db.weddingDate
                ? new Date(db.weddingDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : fallbackConfig.events[0].date,
              venue: {
                name: db.venueName || fallbackConfig.events[0].venue?.name,
                address: db.venueAddress || fallbackConfig.events[0].venue?.address,
                googleMapsDirectionsUrl: db.venueMapUrl || fallbackConfig.events[0].venue?.googleMapsDirectionsUrl,
                googleMapsEmbedUrl: db.venueMapUrl || fallbackConfig.events[0].venue?.googleMapsEmbedUrl,
              },
              dressCode: "Strictly Formal",
              schedule: db.schedule.map((s: any) => ({
                time: s.time,
                title: s.event,
                description: s.description,
              })),
              imageUrl: db.heroImage?.url || fallbackConfig.events[0].imageUrl,
              rsvpTeaser: fallbackConfig.events[0].rsvpTeaser,
              rsvpLink: fallbackConfig.events[0].rsvpLink,
            },
          ]
        : fallbackConfig.events,
    faqs:
      db.faqs && db.faqs.length > 0
        ? db.faqs.map((f: any, i: number) => ({
            key: `faq-${i}`,
            question: f.question,
            answer: f.answer,
          }))
        : fallbackConfig.faqs,
    wishlistTeaser: fallbackConfig.wishlistTeaser,
  };
});

const lightboxImage = ref<string | null>(null);

const setLightboxImage = (src: string | null) => {
  lightboxImage.value = src;
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === "Escape") {
    setLightboxImage(null);
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
});
</script>

<template>
  <div class="min-h-screen bg-warm-cream text-deep-espresso flex flex-col relative select-text">
    <!-- Navigation Bar -->
    <Navigation />

    <!-- Hero Section -->
    <section id="hero" class="min-h-screen w-full flex items-center justify-center relative overflow-hidden pt-16">
      <!-- Full-bleed Photo -->
      <div class="absolute inset-0 z-0">
        <img src="/images/hero.png" alt="Adun & Uche" class="w-full h-full object-cover object-center scale-[1.01]" />
        <div class="absolute inset-0 bg-linear-to-t from-deep-espresso/80 via-deep-espresso/40 to-deep-espresso/25" />
      </div>

      <!-- Text Overlay -->
      <div class="relative z-10 text-center px-4 max-w-4xl mx-auto mt-auto mb-24 text-warm-cream">
        <p class="text-xs sm:text-sm uppercase tracking-[0.25em] font-semibold text-amber-gold mb-3 drop-shadow">
          Celebrate Our Sweet Union
        </p>
        <h1
          class="text-5xl sm:text-6xl md:text-8xl font-bold leading-none tracking-wide mb-5 drop-shadow-md font-display-cinzel"
        >
          {{ config.couple.person1 }} & {{ config.couple.person2 }}
        </h1>
        <p class="text-base sm:text-lg md:text-xl font-light tracking-widest text-warm-cream/90 drop-shadow-sm">
          October 14-15, 2026 · Oxfordshire
        </p>
      </div>
    </section>

    <!-- Countdown Timer Section -->
    <section
      class="min-h-screen paper-texture w-full flex items-center justify-center p-6 border-b border-amber-gold/10"
    >
      <FadeInSection>
        <div class="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <!-- Left Column: Countdown Details -->
          <div class="text-center lg:text-left space-y-6">
            <span class="font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase block mb-1">
              Saving the Date
            </span>
            <h2 class="text-4xl sm:text-5xl font-bold text-deep-espresso leading-tight font-display-cinzel">
              Counting Down the Days
            </h2>
            <p class="text-deep-espresso/70 max-w-md mx-auto lg:mx-0 font-body text-lg">
              We've known each other for a long time. Now, we are counting down the hours until our traditional
              celebration.
            </p>
            <Countdown :target-date="config.weddingDate" />
          </div>

          <!-- Right Column: Scrapbook Photo Collage -->
          <div class="relative h-[320px] sm:h-[400px] w-full flex items-center justify-center select-none">
            <!-- Photo 1 -->
            <div
              class="absolute left-[10%] top-[5%] w-[180px] sm:w-[220px] aspect-square bg-white p-2.5 pb-6 rounded shadow-lg border border-deep-espresso/5 -rotate-6 hover:rotate-0 hover:z-20 transition-all duration-300 cursor-zoom-in"
              @click="setLightboxImage('/images/story-2.png')"
            >
              <div class="washi-tape washi-tape-terracotta top-[-10px] left-10" />
              <div class="relative w-full h-full overflow-hidden bg-deep-espresso/5 rounded-sm">
                <img src="/images/story-2.png" alt="Road trip memory" class="w-full h-full object-cover" />
              </div>
            </div>
            <!-- Photo 2 -->
            <div
              class="absolute right-[10%] bottom-[5%] w-[180px] sm:w-[220px] aspect-square bg-white p-2.5 pb-6 rounded shadow-lg border border-deep-espresso/5 rotate-[4deg] hover:rotate-0 hover:z-20 transition-all duration-300 cursor-zoom-in"
              @click="setLightboxImage('/images/story-3.png')"
            >
              <div class="washi-tape washi-tape-gold top-[-10px] right-10" />
              <div class="relative w-full h-full overflow-hidden bg-deep-espresso/5 rounded-sm">
                <img src="/images/story-3.png" alt="Evening walk memory" class="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </FadeInSection>
    </section>

    <!-- Our Story Section -->
    <section
      id="story"
      class="min-h-screen paper-texture w-full flex items-center justify-center p-6 py-24 border-b border-amber-gold/10"
    >
      <div class="w-full max-w-6xl mx-auto flex flex-col justify-center">
        <FadeInSection>
          <div class="text-center mb-16">
            <span class="font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase block mb-1">
              Our Journey
            </span>
            <h2 class="text-4xl sm:text-5xl font-bold text-deep-espresso font-display-cinzel">
              The Friendship that Grew
            </h2>
            <p class="text-deep-espresso/70 max-w-lg mx-auto mt-4 font-body text-lg">
              We took our time, built a friendship that couldn't be broken, and ended up exactly where we belonged. Here
              is our story over the years.
            </p>
          </div>
          <ScrapbookTimeline :items="config.story" @image-click="setLightboxImage" />
        </FadeInSection>
      </div>
    </section>

    <!-- Dynamic Wedding Events Sections -->
    <div id="events">
      <section
        v-for="(event, index) in config.events"
        :key="event.key"
        class="min-h-screen paper-texture w-full flex items-center justify-center p-6 py-24 border-b border-amber-gold/10"
      >
        <FadeInSection>
          <div class="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <!-- Event text, details, schedule & RSVP -->
            <div class="space-y-8" :class="index % 2 === 0 ? 'order-1' : 'order-1 lg:order-2'">
              <div>
                <span class="font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase block mb-1">
                  Wedding Event {{ index + 1 }}
                </span>
                <h2 class="text-3xl sm:text-4xl font-bold text-deep-espresso mb-2 font-display-cinzel">
                  {{ event.name }}
                </h2>
                <p class="font-body text-deep-espresso/60 text-sm sm:text-base font-semibold">
                  {{ event.date }}
                </p>
              </div>

              <!-- Venue and Directions Card -->
              <div v-if="event.venue" class="linen-card p-6 rounded-2xl border border-amber-gold/15 space-y-4">
                <div>
                  <h4 class="font-heading text-xs font-semibold uppercase tracking-wider text-amber-gold mb-0.5">
                    Venue
                  </h4>
                  <p class="font-heading text-base sm:text-lg font-bold text-deep-espresso">
                    {{ event.venue.name }}
                  </p>
                  <p class="text-deep-espresso/80 text-sm">
                    {{ event.venue.address }}
                  </p>
                </div>

                <div class="border-t border-amber-gold/10 pt-3">
                  <h4 class="font-heading text-xs font-semibold uppercase tracking-wider text-amber-gold mb-0.5">
                    Dress Code
                  </h4>
                  <p class="font-body text-sm font-semibold text-deep-espresso">
                    {{ event.dressCode }}
                  </p>
                </div>

                <div v-if="event.venue.googleMapsDirectionsUrl" class="flex gap-4">
                  <a
                    :href="event.venue.googleMapsDirectionsUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-xl bg-deep-terracotta text-warm-cream font-semibold text-xs hover:bg-burnt-sienna transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none"
                  >
                    <span>Directions</span>
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </div>
              </div>

              <!-- Schedule for this specific event -->
              <div>
                <h4 class="font-heading text-xs font-semibold uppercase tracking-wider text-amber-gold mb-4">
                  The Schedule
                </h4>
                <div class="space-y-5 relative border-l border-amber-gold/20 pl-6 ml-2">
                  <div v-for="(item, scheduleIdx) in event.schedule" :key="scheduleIdx" class="relative group">
                    <div
                      class="absolute left-[-31px] top-1.5 w-3.5 h-3.5 rounded-full border border-amber-gold bg-warm-cream flex items-center justify-center transition-all duration-300"
                    >
                      <div class="w-1.5 h-1.5 rounded-full bg-amber-gold" />
                    </div>
                    <div>
                      <span class="font-heading text-xs font-semibold text-amber-gold tracking-wide">
                        {{ item.time }}
                      </span>
                      <h5 class="font-heading text-base font-bold text-deep-espresso mt-0.5">
                        {{ item.title }}
                      </h5>
                      <p class="font-body text-sm text-deep-espresso/70 mt-0.5">
                        {{ item.description }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Integrated RSVP Call to Action -->
              <div
                v-if="event.rsvpTeaser && event.rsvpLink"
                class="linen-card p-6 rounded-2xl border border-amber-gold/15 bg-linen-white/40 space-y-3"
              >
                <h4 class="font-heading text-base font-bold text-deep-espresso">
                  {{ event.rsvpTeaser.title }}
                </h4>
                <p class="font-body text-sm text-deep-espresso/80">
                  {{ event.rsvpTeaser.description }}
                </p>
                <NuxtLink
                  :to="event.rsvpLink"
                  class="inline-block px-5 py-2.5 rounded-xl bg-deep-terracotta text-warm-cream font-semibold text-xs uppercase tracking-wider hover:bg-burnt-sienna transition-all duration-300 shadow-md hover:shadow-lg text-center"
                >
                  RSVP For This Event
                </NuxtLink>
              </div>
            </div>

            <!-- Polaroid couple picture representing this specific event -->
            <div
              class="flex flex-col items-center justify-center select-none relative"
              :class="index % 2 === 0 ? 'order-2' : 'order-2 lg:order-1'"
            >
              <div class="washi-tape washi-tape-gold top-[-10px] left-1/2 ml-[-55px] rotate-2" />
              <div
                class="bg-white p-4 pb-10 rounded shadow-2xl border border-deep-espresso/5 -rotate-2 max-w-sm sm:max-w-md w-full transition-transform duration-300 hover:rotate-0 cursor-zoom-in"
                @click="setLightboxImage(event.imageUrl)"
              >
                <div class="relative aspect-[4/3] w-full overflow-hidden bg-deep-espresso/5 rounded-sm">
                  <img :src="event.imageUrl" alt="Event Photo" class="w-full h-full object-cover" />
                </div>
                <div class="mt-4 text-center">
                  <span class="font-display-cormorant text-xl font-semibold text-deep-espresso">
                    {{ event.name }}
                  </span>
                </div>
              </div>

              <!-- Small Google map iframe helper -->
              <div
                v-if="event.venue?.googleMapsEmbedUrl"
                class="w-full max-w-sm sm:max-w-md h-[180px] rounded-2xl overflow-hidden shadow-inner border border-amber-gold/15 mt-8 relative"
              >
                <iframe
                  :src="event.venue.googleMapsEmbedUrl"
                  width="100%"
                  height="100%"
                  style="border: 0"
                  allowfullscreen="true"
                  loading="lazy"
                  referrerpolicy="no-referrer-when-downgrade"
                  class="brightness-95 contrast-[1.02]"
                />
              </div>
            </div>
          </div>
        </FadeInSection>
      </section>
    </div>

    <!-- Registry Teaser Section -->
    <section
      id="wishlist"
      class="min-h-screen paper-texture w-full flex items-center justify-center p-6 border-b border-amber-gold/10"
    >
      <FadeInSection>
        <div class="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <!-- Left Column: Polaroid Home Couple Photo -->
          <div class="flex justify-center select-none relative order-2 lg:order-1">
            <div class="washi-tape washi-tape-gold top-[-10px] left-1/2 ml-[-55px] rotate-[-4deg]" />
            <div
              class="bg-white p-4 pb-8 rounded shadow-xl border border-deep-espresso/5 rotate-3 max-w-sm sm:max-w-md w-full transition-transform duration-300 hover:rotate-0 cursor-zoom-in"
              @click="setLightboxImage('/images/home_couple.png')"
            >
              <div class="relative aspect-[4/3] w-full overflow-hidden bg-deep-espresso/5 rounded-sm">
                <img src="/images/home_couple.png" alt="Building our home" class="w-full h-full object-cover" />
              </div>
              <div class="mt-4 text-center">
                <span class="font-display-cormorant text-lg font-semibold text-deep-espresso">
                  Setting up our kitchen · 2026
                </span>
              </div>
            </div>
          </div>

          <!-- Right Column: Registry Teaser -->
          <div
            class="linen-card p-8 sm:p-10 rounded-2xl flex flex-col justify-between items-start border border-amber-gold/15 transition-all duration-300 hover:shadow-lg order-1 lg:order-2"
          >
            <div class="mb-6">
              <span class="font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase block mb-2">
                Registry
              </span>
              <h3 class="text-3xl font-bold text-deep-espresso mb-3 font-display-cinzel">
                {{ config.wishlistTeaser.title }}
              </h3>
              <p class="font-body text-deep-espresso/80 text-base sm:text-lg leading-relaxed">
                {{ config.wishlistTeaser.description }}
              </p>
            </div>
            <NuxtLink
              to="/wishlist"
              class="px-5 py-2.5 rounded-xl bg-deep-terracotta text-warm-cream font-semibold text-sm hover:bg-burnt-sienna transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none cursor-pointer"
            >
              Browse Wishlist
            </NuxtLink>
          </div>
        </div>
      </FadeInSection>
    </section>

    <!-- FAQs & Playful Couple Photo -->
    <section
      id="faqs"
      class="min-h-screen paper-texture w-full flex items-center justify-center p-6 border-b border-amber-gold/10"
    >
      <FadeInSection>
        <div class="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <!-- Left Column: Polaroid Playful Couple Photo -->
          <div class="flex justify-center select-none relative order-2 lg:order-1">
            <div class="washi-tape washi-tape-gold top-[-10px] left-1/2 ml-[-55px] rotate-[4deg]" />
            <div
              class="bg-white p-4 pb-8 rounded shadow-xl border border-deep-espresso/5 rotate-[-4deg] max-w-sm sm:max-w-md w-full transition-transform duration-300 hover:rotate-0 cursor-zoom-in"
              @click="setLightboxImage('/images/playful_couple.png')"
            >
              <div class="relative aspect-[4/3] w-full overflow-hidden bg-deep-espresso/5 rounded-sm">
                <img src="/images/playful_couple.png" alt="Adun and Uche" class="w-full h-full object-cover" />
              </div>
              <div class="mt-4 text-center">
                <span class="font-display-cormorant text-lg font-semibold text-deep-espresso">
                  No serious questions allowed! · Oxfordshire 2026
                </span>
              </div>
            </div>
          </div>

          <!-- Right Column: FAQs Accordion -->
          <div class="order-1 lg:order-2 space-y-4 max-h-[85vh] overflow-y-auto pr-2">
            <div class="mb-4">
              <span class="font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase block mb-1">
                Help & Info
              </span>
              <h2 class="text-3xl sm:text-4xl font-bold text-deep-espresso font-display-cinzel">Frequently Asked</h2>
            </div>
            <Accordion :items="config.faqs" />
          </div>
        </div>
      </FadeInSection>
    </section>

    <!-- Footer Slide -->
    <Footer :on-image-click="setLightboxImage" />

    <!-- Lightbox Modal -->
    <div
      v-if="lightboxImage"
      class="fixed inset-0 bg-black/95 z-50 flex items-center justify-center cursor-zoom-out p-4 md:p-8 animate-fade-in animate-duration-300"
      @click="setLightboxImage(null)"
    >
      <div class="relative w-full h-full max-w-5xl max-h-[90vh]">
        <img :src="lightboxImage" alt="Enlarged scrapbook photo" class="w-full h-full object-contain" />
      </div>
      <!-- Close button -->
      <button
        @click="setLightboxImage(null)"
        class="absolute top-6 right-6 text-white/70 hover:text-white transition-colors text-3xl font-sans focus:outline-none cursor-pointer"
        aria-label="Close lightbox"
      >
        ✕
      </button>
    </div>
  </div>
</template>
