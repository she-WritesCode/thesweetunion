<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import { siteConfig as fallbackConfig } from "~/config/site";
import { useDyrectedCollection, useDyrectedGlobal } from "#imports";

const { data: siteSettings } = await useDyrectedGlobal("site_settings", { depth: 2 });
const { data: eventsResult } = await useDyrectedCollection("events", { limit: 100, depth: 2 });

const config = computed(() => {
  const db = siteSettings.value as any;

  return {
    couple: {
      person1: db?.partnerOneName || fallbackConfig.couple.person1,
      person2: db?.partnerTwoName || fallbackConfig.couple.person2,
      hashtag: db?.hashtag || fallbackConfig.couple.hashtag,
    },
    weddingDate: db?.weddingDate || fallbackConfig.weddingDate,
    weddingDateText: db?.weddingDateText || fallbackConfig.weddingDateText,
    weddingLocation: db?.weddingLocation || fallbackConfig.weddingLocation,
    rsvpCutoffDate: db?.rsvpCutoffDate
      ? `${db.rsvpCutoffDate}T${db.rsvpCutoffTime || "23:59:59"}`
      : fallbackConfig.rsvpCutoffDate,
    storySubtitle: db?.storySubtitle || fallbackConfig.storySubtitle,
    storyTitle: db?.storyTitle || fallbackConfig.storyTitle,
    storyDescription: db?.storyDescription || fallbackConfig.storyDescription,
    story:
      db?.storyPhotos && db.storyPhotos.length > 0
        ? db.storyPhotos.map((p: any, i: number) => ({
            key: p.id || `story-${i}`,
            label: p.label || `Chapter ${i + 1}`,
            title: p.title || `Memory ${i + 1}`,
            description: p.description || "",
            // Only use the DB image — no local fallback
            imageUrl: p.photo?.url || null,
          }))
        : fallbackConfig.story.map((s) => ({ ...s, imageUrl: null })),
    events: ((eventsResult.value as any)?.docs && (eventsResult.value as any).docs.length > 0
      ? (eventsResult.value as any).docs.map((e: any) => ({
          key: e.id,
          order: e.order ?? 999,
          name: e.name,
          date: e.date
            ? new Date(e.date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "numeric",
                hour12: true,
              })
            : "",
          venue: {
            name: e.venueName,
            address: e.venueAddress,
          },
          dressCode: e.dressCode || "Strictly Formal",
          schedule: (e.schedule || []).map((s: any) => ({
            time: s.time,
            title: s.title,
            description: s.description,
          })),
          // Only use the DB image — no local fallback
          imageUrl: e.photo?.url || null,
          collectsRsvp: e.collectsRsvp !== false,
          rsvpTeaser:
            e.collectsRsvp !== false
              ? fallbackConfig.events.find((fe: any) => fe.name === e.name)?.rsvpTeaser || {
                  title: e.name + " RSVP",
                  description: "Please confirm your attendance for the " + e.name + ".",
                }
              : undefined,
          rsvpLink: e.collectsRsvp !== false ? "/rsvp" : undefined,
        }))
      : fallbackConfig.events.map((e) => ({ ...e, imageUrl: null }))
    ).sort((a: any, b: any) => (a.order ?? 999) - (b.order ?? 999)) as any[],
    faqs:
      db?.faqs && db.faqs.length > 0
        ? db.faqs.map((f: any, i: number) => ({
            key: `faq-${i}`,
            question: f.question,
            answer: f.answer,
          }))
        : fallbackConfig.faqs,
    wishlistTeaser: {
      title: db?.wishlistTeaserTitle || fallbackConfig.wishlistTeaser.title,
      description: db?.wishlistTeaserDescription || fallbackConfig.wishlistTeaser.description,
      // Only use the DB image — no local fallback
      imageUrl: db?.wishlistTeaserImage?.url || null,
    },
    rsvpTeaser: {
      imageUrl: db?.rsvpTeaserImage?.url || null,
    },
    countdownPhotos: Array.isArray(db?.countdownPhotos)
      ? db.countdownPhotos.map((p: any) => p?.url || null).filter(Boolean)
      : [],
    footerImage: db?.footerImage?.url || null,
    heroImage: db?.heroImage?.url || null,
    heroSubtitle: db?.heroSubtitle || "Celebrate Our Sweet Union",
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
    <!--
      TODO: Replace background-image with a proper <img fetchpriority="high"> for LCP
      optimisation (better Core Web Vitals, alt text, srcset support). The current
      background-image approach is used as a quick fix for landscape images on portrait
      mobile viewports where h-full on <img> was not resolving correctly.
    -->
    <section
      id="hero"
      class="min-h-screen w-full flex items-center justify-center relative overflow-hidden pt-16"
      :style="
        config.heroImage
          ? {
              backgroundImage: `url('${config.heroImage}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }
          : {}
      "
    >
      <!-- Gradient overlay -->
      <div class="absolute inset-0 z-0 bg-linear-to-t from-deep-espresso/50 via-deep-espresso/25 to-deep-espresso/15" />

      <!-- Text Overlay -->
      <div class="relative z-10 text-center px-4 max-w-4xl mx-auto mt-auto mb-24 text-warm-cream space-y-6!">
        <p class="text-xs sm:text-sm uppercase tracking-[0.25em] font-semibold text-white mb-3 drop-shadow">
          {{ config.heroSubtitle }}
        </p>
        <h1 class="heading1 mb-5 drop-shadow-md font-display-cinzel">
          {{ config.couple.person1 }} & {{ config.couple.person2 }}
        </h1>
        <p class="text-base sm:text-lg md:text-xl font-light tracking-widest text-warm-cream/90 drop-shadow-sm">
          {{ config.weddingDateText }} · {{ config.weddingLocation }}
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
          <div class="text-center lg:text-left space-y-6!">
            <span class="font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase block mb-1">
              Saving the Date
            </span>
            <h2 class="heading2-big font-bold text-deep-espresso leading-tight font-display-cinzel">
              Counting Down the Days
            </h2>
            <p class="text-deep-espresso/70 max-w-md mx-auto lg:mx-0 font-body text-lg">
              We've known each other for a long time. Now, we are counting down the days until our wedding day.
            </p>
            <Countdown :target-date="config.weddingDate" />
          </div>

          <!-- Right Column: Scrapbook Photo Collage -->
          <div class="relative h-[320px] sm:h-[400px] w-full flex items-center justify-center select-none">
            <!-- Photo 1 -->
            <div
              v-if="config.countdownPhotos[0]"
              class="absolute left-[10%] top-[5%] w-[180px] sm:w-[220px] aspect-3/4 bg-white p-2.5 pb-6 rounded shadow-lg border border-deep-espresso/5 -rotate-6 hover:rotate-0 hover:z-20 transition-all duration-300 cursor-zoom-in"
              @click="setLightboxImage(config.countdownPhotos[0])"
            >
              <div class="washi-tape washi-tape-terracotta top-[-10px] left-10" />
              <div class="relative w-full h-full overflow-hidden bg-deep-espresso/5 rounded-sm">
                <img :src="config.countdownPhotos[0]" alt="Countdown photo" class="img-fill countdown-aspect" />
              </div>
            </div>
            <!-- Photo 2 -->
            <div
              v-if="config.countdownPhotos[1]"
              class="absolute right-[10%] bottom-[5%] w-[180px] sm:w-[220px] aspect-3/4 bg-white p-2.5 pb-6 rounded shadow-lg border border-deep-espresso/5 rotate-[4deg] hover:rotate-0 hover:z-20 transition-all duration-300 cursor-zoom-in"
              @click="setLightboxImage(config.countdownPhotos[1])"
            >
              <div class="washi-tape washi-tape-gold top-[-10px] right-10" />
              <div class="relative w-full h-full overflow-hidden bg-deep-espresso/5 rounded-sm">
                <img :src="config.countdownPhotos[1]" alt="Countdown photo" class="img-fill countdown-aspect" />
              </div>
            </div>
          </div>
        </div>
      </FadeInSection>
    </section>

    <!-- Our Story Section -->
    <section
      id="story"
      class="paper-texture w-full flex items-center justify-center p-6 py-24 border-b border-amber-gold/10"
    >
      <div class="w-full max-w-6xl mx-auto flex flex-col justify-center">
        <FadeInSection>
          <div class="text-center mb-16 space-y-6!">
            <span class="font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase block mb-1">
              {{ config.storySubtitle }}
            </span>
            <h2 class="heading2-big font-bold text-deep-espresso font-display-cinzel">{{ config.storyTitle }}</h2>
            <div class="flex flex-col justify-center items-center">
              <p class="text-deep-espresso/70 max-w-lg mx-auto mt-4 font-body text-lg">
                {{ config.storyDescription }}
              </p>
            </div>
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
          <div class="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12! lg:gap-20! items-center">
            <!-- Left: Event details -->
            <div class="space-y-10!" :class="index % 2 === 0 ? 'order-1' : 'order-1 lg:order-2'">
              <!-- Event number + name + date -->
              <div class="space-y-4!">
                <span class="font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase block">
                  Wedding Event {{ index + 1 }}
                </span>
                <h2 class="heading2-big font-bold text-deep-espresso font-display-cinzel leading-tight">
                  {{ event.name }}
                </h2>
                <div class="flex items-center gap-3">
                  <div class="w-6 h-px bg-amber-gold/60" />
                  <p class="font-body text-deep-espresso/70 text-sm sm:text-base">
                    {{ event.date }}
                  </p>
                </div>
              </div>

              <!-- Venue + Dress Code — two-column detail panel -->
              <div v-if="event.venue" class="linen-card rounded-2xl border border-amber-gold/15 overflow-hidden">
                <div class="grid grid-cols-2">
                  <div class="p-5 sm:p-6 border-r border-amber-gold/10">
                    <p class="font-heading text-xs font-semibold uppercase tracking-wider text-amber-gold mb-2">
                      Venue
                    </p>
                    <p class="font-heading text-sm sm:text-base font-bold text-deep-espresso leading-snug">
                      {{ event.venue.name }}
                    </p>
                    <p class="font-body text-xs sm:text-sm text-deep-espresso/60 mt-1 leading-relaxed">
                      {{ event.venue.address }}
                    </p>
                  </div>
                  <div class="p-5 sm:p-6">
                    <p class="font-heading text-xs font-semibold uppercase tracking-wider text-amber-gold mb-2">
                      Dress Code
                    </p>
                    <p class="font-heading text-sm sm:text-base font-bold text-deep-espresso leading-snug">
                      {{ event.dressCode }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- RSVP invitation prompt -->
              <div
                v-if="event.collectsRsvp !== false && event.rsvpTeaser && event.rsvpLink"
                class="p-7 sm:p-8 rounded-2xl text-center space-y-4! bg-deep-terracotta border border-deep-terracotta"
              >
                <p class="font-heading text-xs font-semibold text-white tracking-widest uppercase">You're invited</p>
                <h4 class="font-display-cinzel text-xl sm:text-2xl font-bold text-white leading-snug">
                  {{ event.rsvpTeaser.title }}
                </h4>
                <p class="font-body text-sm text-white/90 leading-relaxed">
                  {{ event.rsvpTeaser.description }}
                </p>
                <NuxtLink :to="event.rsvpLink" class="btn-contrast w-full block"> RSVP Now </NuxtLink>
              </div>
            </div>

            <!-- Right: Polaroid photo -->
            <div
              v-if="event.imageUrl"
              class="flex flex-col items-center justify-center select-none relative"
              :class="index % 2 === 0 ? 'order-2' : 'order-2 lg:order-1'"
            >
              <div class="washi-tape washi-tape-gold top-[-10px] left-1/2 ml-[-55px] rotate-2" />
              <div
                class="bg-white p-4 pb-10 rounded shadow-2xl border border-deep-espresso/5 -rotate-2 max-w-sm sm:max-w-md w-full transition-transform duration-300 hover:rotate-0 cursor-zoom-in"
                @click="setLightboxImage(event.imageUrl)"
              >
                <div class="relative aspect-[3/4] w-full overflow-hidden bg-deep-espresso/5 rounded-sm">
                  <img :src="event.imageUrl" alt="Event Photo" class="img-fill" />
                </div>
                <div class="mt-4 text-center">
                  <span class="font-display-cormorant text-xl font-semibold text-deep-espresso">
                    {{ event.name }}
                  </span>
                </div>
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
          <!-- Left Column: Polaroid Home Couple Photo — only shown when image is available -->
          <div
            v-if="config.wishlistTeaser.imageUrl"
            class="flex justify-center select-none relative order-2 lg:order-1"
          >
            <div class="washi-tape washi-tape-gold top-[-10px] left-1/2 ml-[-55px] rotate-[-4deg]" />
            <div
              class="bg-white p-4 pb-8 rounded shadow-xl border border-deep-espresso/5 rotate-3 max-w-sm sm:max-w-md w-full transition-transform duration-300 hover:rotate-0 cursor-zoom-in"
              @click="setLightboxImage(config.wishlistTeaser.imageUrl)"
            >
              <div class="relative aspect-auto w-full overflow-hidden bg-deep-espresso/5 rounded-sm">
                <img :src="config.wishlistTeaser.imageUrl" alt="Building our home" class="img-fill" />
              </div>
              <div class="mt-4 text-center">
                <span class="font-display-cormorant text-lg font-semibold text-deep-espresso">
                  {{ config.couple.hashtag }}
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
              <h3 class="heading2-small text-deep-espresso mb-3 font-display-cinzel">
                {{ config.wishlistTeaser.title }}
              </h3>
              <p class="font-body text-deep-espresso/80 text-base sm:text-lg leading-relaxed">
                {{ config.wishlistTeaser.description }}
              </p>
            </div>
            <NuxtLink to="/wishlist" class="btn-primary"> Browse Wishlist </NuxtLink>
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
          <!-- Left Column: Polaroid Playful Couple Photo — only shown when image is available -->
          <div v-if="config.rsvpTeaser?.imageUrl" class="flex justify-center select-none relative order-2 lg:order-1">
            <div class="washi-tape washi-tape-gold top-[-10px] left-1/2 ml-[-55px] rotate-[4deg]" />
            <div
              class="bg-white p-4 pb-8 rounded shadow-xl border border-deep-espresso/5 rotate-[-4deg] max-w-sm sm:max-w-md w-full transition-transform duration-300 hover:rotate-0 cursor-zoom-in"
              @click="setLightboxImage(config.rsvpTeaser.imageUrl)"
            >
              <div class="relative aspect-auto w-full overflow-hidden bg-deep-espresso/5 rounded-sm">
                <img :src="config.rsvpTeaser.imageUrl" alt="Adun and Uche" class="img-fill" />
              </div>
              <div class="mt-4 text-center">
                <span class="font-display-cormorant text-lg font-semibold text-deep-espresso">
                  {{ config.couple.hashtag }}
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
              <h2 class="heading2-small font-bold text-deep-espresso font-display-cinzel">Frequently Asked</h2>
            </div>
            <Accordion :items="config.faqs" />
          </div>
        </div>
      </FadeInSection>
    </section>

    <!-- Footer Slide -->
    <Footer
      :on-image-click="setLightboxImage"
      :couples-photo="config.footerImage"
      :hashtag="config.couple.hashtag"
      :person1="config.couple.person1"
      :person2="config.couple.person2"
    />

    <!-- Lightbox Modal -->
    <div
      v-if="lightboxImage"
      class="fixed inset-0 bg-black/95 z-50 flex items-center justify-center cursor-zoom-out p-4 md:p-8 animate-fade-in animate-duration-300"
      @click="setLightboxImage(null)"
    >
      <div class="relative flex items-center justify-center max-w-5xl max-h-[90vh] w-full h-full">
        <img
          :src="lightboxImage"
          alt="Enlarged scrapbook photo"
          class="max-w-full max-h-[90vh] w-auto h-auto object-contain"
        />
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
