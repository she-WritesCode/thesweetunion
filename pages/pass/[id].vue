<script setup lang="ts">
import { ref, computed } from "vue";

const route = useRoute();
const config = useRuntimeConfig();
const passId = computed(() => String(route.params.id || ""));

const { data: pass, pending, error } = await useAsyncData(
  `wedding-pass-${passId.value}`,
  () => $fetch<any>(`/api/pass/${passId.value}`),
);

const cardRef = ref<any>(null);
const downloading = ref(false);

const guestName = computed(() => pass.value?.guestName || "Honoured Guest");
const coupleName = computed(() => pass.value?.siteSettings?.coupleName || "Adun & Uche");
const hashtag = computed(() => pass.value?.siteSettings?.hashtag || "#TheSweetUnion");
const weddingDateText = computed(() => pass.value?.siteSettings?.weddingDateText || "October 22 & 24, 2026");
const eventNames = computed(() => (pass.value?.events || []).map((e: any) => e.name));

const requestUrl = useRequestURL();
const baseUrl = computed(() => {
  if (requestUrl?.origin && !requestUrl.origin.includes("localhost")) {
    return requestUrl.origin;
  }
  return (config.public as any).appUrl || "https://thesweetunion.com";
});
const ogImageUrl = computed(() => `${baseUrl.value}/api/pass/og-image/${passId.value}.png`);
const pageUrl = computed(() => `${baseUrl.value}/pass/${passId.value}`);

useSeoMeta({
  title: () => `Wedding Pass: ${guestName.value} · ${hashtag.value}`,
  ogTitle: () => `Official Wedding Pass: ${guestName.value}`,
  description: () =>
    `Official digital wedding pass for ${guestName.value} celebrating ${coupleName.value}. Kindly present this pass at the entrance.`,
  ogDescription: () =>
    `Official digital wedding pass for ${guestName.value} celebrating ${coupleName.value}. Kindly present this pass at the entrance.`,
  ogImage: () => ogImageUrl.value,
  ogImageType: "image/png",
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageAlt: () => `Wedding Access Pass for ${guestName.value}`,
  ogUrl: () => pageUrl.value,
  ogType: "website",
  twitterCard: "summary_large_image",
  twitterTitle: () => `Wedding Pass: ${guestName.value}`,
  twitterDescription: () => `Digital wedding pass for ${coupleName.value}'s wedding celebration.`,
  twitterImage: () => ogImageUrl.value,
});

useHead({
  meta: [
    { property: "og:image", content: ogImageUrl.value },
    { property: "og:image:secure_url", content: ogImageUrl.value },
    { property: "og:image:type", content: "image/png" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { name: "thumbnail", content: ogImageUrl.value },
  ],
  link: [{ rel: "image_src", href: ogImageUrl.value }],
});

async function handleDownload() {
  if (!cardRef.value?.downloadCard || downloading.value) return;
  downloading.value = true;
  try {
    await cardRef.value.downloadCard();
  } catch (err) {
    console.error("Failed to download card:", err);
  } finally {
    downloading.value = false;
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getGoogleCalendarUrl(event: any) {
  const title = encodeURIComponent(`${event.name} · ${coupleName.value}'s Wedding`);
  const details = encodeURIComponent(
    `Official wedding celebration for ${coupleName.value} (${hashtag.value}).\nVenue: ${event.venueName}, ${event.venueAddress}\nDress Code: ${event.dressCode || "Formal"}\nPass Code: ${passId.value.toUpperCase()}`,
  );
  const location = encodeURIComponent(`${event.venueName}, ${event.venueAddress}`);

  let datesParam = "";
  if (event.date) {
    const start = new Date(event.date);
    const end = new Date(start.getTime() + 4 * 60 * 60 * 1000); // 4 hours duration
    const formatIso = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");
    datesParam = `&dates=${formatIso(start)}/${formatIso(end)}`;
  }

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}${datesParam}`;
}
</script>

<template>
  <div class="pass-page-root min-h-screen bg-[#170E14] text-[#FAF5F8] flex flex-col justify-between selection:bg-[#D4AF37] selection:text-[#30222A]">
    <!-- Ambient glowing backgrounds -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div class="absolute -top-40 -left-40 w-96 h-96 bg-[#865172]/20 rounded-full blur-[100px]" />
      <div class="absolute top-1/3 -right-40 w-[30rem] h-[30rem] bg-[#D4AF37]/10 rounded-full blur-[120px]" />
      <div class="absolute -bottom-40 left-1/3 w-96 h-96 bg-[#865172]/20 rounded-full blur-[100px]" />
    </div>

    <!-- Header Navigation -->
    <header class="relative z-10 border-b border-[#D4AF37]/20 bg-[#24151F]/80 backdrop-blur-md px-4 sm:px-6 py-3.5">
      <div class="max-w-4xl mx-auto flex items-center justify-between">
        <NuxtLink to="/" class="flex items-center gap-2.5 text-decoration-none group">
          <span class="font-cinzel text-lg sm:text-xl font-bold tracking-[0.18em] bg-gradient-to-r from-[#FCE8B3] via-[#D4AF37] to-[#B48A1E] bg-clip-text text-transparent group-hover:brightness-110 transition">
            {{ coupleName }}
          </span>
          <span class="text-[10px] uppercase tracking-[0.25em] text-[#D4AF37]/60 font-mono hidden sm:inline pt-0.5">
            {{ hashtag }}
          </span>
        </NuxtLink>

        <NuxtLink
          to="/wishlist"
          class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 text-xs font-semibold tracking-wider text-[#FCE8B3] hover:bg-[#D4AF37]/20 hover:border-[#D4AF37] active:scale-95 transition shadow-sm"
        >
          <!-- Gift Icon SVG -->
          <svg class="w-3.5 h-3.5 text-[#D4AF37]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="8" width="18" height="4" rx="1"/>
            <path d="M12 8v13"/>
            <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/>
            <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>
          </svg>
          <span>Gift Registry</span>
        </NuxtLink>
      </div>
    </header>

    <!-- Main Content Container -->
    <main class="relative z-10 flex-1 max-w-3xl w-full mx-auto px-4 py-6 sm:py-10 flex flex-col items-center">
      <!-- Loading State -->
      <div v-if="pending" class="py-24 flex flex-col items-center justify-center gap-4 text-center">
        <div class="w-10 h-10 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
        <p class="text-xs tracking-[0.2em] uppercase text-[#D4AF37] font-semibold">Preparing your digital pass…</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error || !pass" class="py-20 text-center max-w-md mx-auto">
        <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-red-900/30 border border-red-500/40 flex items-center justify-center text-[#FCE8B3]">
          <svg class="w-6 h-6 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <h1 class="text-2xl font-cinzel font-bold text-[#FCE8B3] mb-2">Pass Not Found</h1>
        <p class="text-xs text-[#FAF5F8]/70 mb-6 leading-relaxed">
          We couldn't locate this invitation pass code. Please check the URL link or contact the wedding party.
        </p>
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#865172] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#653853] transition"
        >
          Return Home
        </NuxtLink>
      </div>

      <!-- Loaded Pass View -->
      <div v-else class="w-full flex flex-col items-center">
        <!-- Top Pass Title Header -->
        <div class="text-center mb-5 sm:mb-6">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 mb-2.5">
            <span class="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
            <span class="text-[10px] uppercase font-bold tracking-[0.25em] text-[#FCE8B3]">
              Official Wedding Pass
            </span>
          </div>

          <h1 class="text-2xl sm:text-3xl font-cinzel font-bold text-[#FAF5F8] tracking-wide">
            {{ guestName }}
          </h1>
          <p class="text-xs text-[#FAF5F8]/60 mt-1">
            Pass Code: <span class="font-mono font-bold text-[#FCE8B3] tracking-widest">{{ pass.id.toUpperCase() }}</span>
          </p>
        </div>

        <!-- Luxury Access Card Canvas -->
        <div class="w-full flex justify-center mb-6 sm:mb-8">
          <AccessCard
            ref="cardRef"
            :rsvp-id="pass.id"
            :guest-name="pass.guestName"
            :has-spouse="pass.hasSpouse"
            :spouse-name="pass.spouseName"
            :group-name="pass.groupName"
            :event-names="eventNames"
            :couple-name="coupleName"
            :hashtag="hashtag"
            :wedding-date-text="weddingDateText"
          />
        </div>

        <!-- Primary Action Buttons -->
        <div class="w-full max-w-sm sm:max-w-md flex flex-col gap-2.5 mb-8 sm:mb-10">
          <!-- Download Image Button -->
          <button
            type="button"
            :disabled="downloading"
            class="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-gradient-to-r from-[#FCE8B3] via-[#D4AF37] to-[#B48A1E] text-[#30222A] font-bold text-xs uppercase tracking-[0.15em] shadow-lg shadow-[#D4AF37]/20 hover:brightness-105 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
            @click="handleDownload"
          >
            <svg class="w-4 h-4 text-[#30222A]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>{{ downloading ? "Saving Pass…" : "Save Pass to Photos" }}</span>
          </button>

          <!-- Wishlist Link -->
          <NuxtLink
            to="/wishlist"
            class="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl border border-[#D4AF37]/40 bg-[#30222A]/80 text-[#FCE8B3] font-semibold text-xs uppercase tracking-[0.15em] hover:bg-[#D4AF37]/15 hover:border-[#D4AF37] active:scale-[0.98] transition text-center"
          >
            <svg class="w-3.5 h-3.5 text-[#D4AF37]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="8" width="18" height="4" rx="1"/>
              <path d="M12 8v13"/>
              <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/>
              <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>
            </svg>
            <span>View Wishlist</span>
          </NuxtLink>
        </div>

        <!-- Event Details & Itinerary -->
        <div class="w-full max-w-xl bg-[#24151F]/80 border border-[#D4AF37]/25 rounded-2xl p-5 sm:p-8 backdrop-blur-md shadow-xl mb-8">
          <div class="flex items-center gap-3 mb-5 pb-4 border-b border-[#D4AF37]/20">
            <div class="w-8 h-8 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] flex-shrink-0">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div>
              <h2 class="font-cinzel text-base sm:text-lg font-bold text-[#FCE8B3] tracking-wide">Celebration Schedule &amp; Venues</h2>
              <p class="text-[11px] text-[#FAF5F8]/60">Present your pass QR code upon arrival at the entrance.</p>
            </div>
          </div>

          <div v-if="pass.events && pass.events.length" class="space-y-6">
            <div
              v-for="(ev, idx) in pass.events"
              :key="ev.id || idx"
              class="relative pl-6 border-l-2 border-[#D4AF37]/40 space-y-2"
            >
              <div class="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-[#D4AF37] ring-4 ring-[#24151F]" />

              <div class="flex items-baseline justify-between flex-wrap gap-2">
                <h3 class="font-cinzel text-sm sm:text-base font-bold text-[#FAF5F8] tracking-wide">{{ ev.name }}</h3>
                <span v-if="ev.dressCode" class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#865172]/40 text-[#FCE8B3] border border-[#865172]/60">
                  {{ ev.dressCode }}
                </span>
              </div>

              <p v-if="ev.date" class="text-xs font-mono text-[#D4AF37] flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-[#D4AF37]/80 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span>{{ formatDate(ev.date) }}</span>
              </p>

              <div v-if="ev.venueName" class="text-xs text-[#FAF5F8]/80 leading-relaxed">
                <p class="font-semibold text-[#FAF5F8]">{{ ev.venueName }}</p>
                <p v-if="ev.venueAddress" class="text-[#FAF5F8]/60">{{ ev.venueAddress }}</p>
              </div>

              <div class="pt-1.5 flex items-center gap-4 flex-wrap">
                <!-- Add to Google Calendar -->
                <a
                  :href="getGoogleCalendarUrl(ev)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#FCE8B3] hover:text-white underline underline-offset-4 decoration-[#D4AF37]/50 transition"
                >
                  <svg class="w-3 h-3 text-[#D4AF37]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span>Add to Calendar</span>
                </a>

                <!-- Google Maps Directions -->
                <a
                  v-if="ev.venueName || ev.venueAddress"
                  :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((ev.venueName || '') + ' ' + (ev.venueAddress || ''))}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#FCE8B3] hover:text-white underline underline-offset-4 decoration-[#D4AF37]/50 transition"
                >
                  <svg class="w-3 h-3 text-[#D4AF37]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                  </svg>
                  <span>Open in Maps</span>
                </a>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-4 text-xs text-[#FAF5F8]/60 italic">
            Event itinerary details will be announced shortly.
          </div>
        </div>

        <!-- Note to Guests -->
        <div class="w-full max-w-xl text-center space-y-1.5 px-4 mb-4">
          <p class="text-xs font-serif italic text-[#FAF5F8]/70">
            "Your love, presence, and prayers are the greatest gifts of all."
          </p>
          <p class="text-[10px] font-mono tracking-[0.2em] text-[#D4AF37]/75 uppercase">
            {{ hashtag }} · {{ weddingDateText }}
          </p>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.font-cinzel {
  font-family: "Cinzel Decorative", "Cinzel", "Times New Roman", serif;
}
</style>
