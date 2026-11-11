<script setup lang="ts">
import { ref, computed } from "vue";

const route = useRoute();
const config = useRuntimeConfig();
const passId = computed(() => String(route.params.id || "").trim());

const { data: pass, pending, error } = await useAsyncData(
  () => `wedding-pass-${passId.value.toLowerCase()}`,
  () => $fetch<any>(`/api/pass/${encodeURIComponent(passId.value)}`),
);

const cardRef = ref<any>(null);
const downloading = ref(false);

const guestName = computed(() => pass.value?.guestName || "Honoured Guest");
const coupleName = computed(() => pass.value?.siteSettings?.coupleName || "Adun & Uche");
const hashtag = computed(() => pass.value?.siteSettings?.hashtag || "#TheSweetUnion");
const weddingDateText = computed(() => pass.value?.siteSettings?.weddingDateText || "Saturday, November 21, 2026");
const eventNames = computed(() => (pass.value?.events || []).map((e: any) => e.name));

const requestUrl = useRequestURL();
const baseUrl = computed(() => {
  if (requestUrl?.origin && !requestUrl.origin.includes("localhost") && !requestUrl.origin.includes("thesweetunion.com")) {
    return requestUrl.origin;
  }
  return "https://thesweetunion.vercel.app";
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

// Venue details are intentionally hardcoded here (same as the invitation email)
// so they stay out of the public events collection.
const itinerary = [
  {
    key: "ceremony",
    label: "Church Ceremony",
    whenText: "Saturday, Nov 21, 2026 @ 09:00 AM",
    start: "2026-11-21T09:00:00+01:00",
    venueName: "RCCG Victory Center",
    venueAddress: "No 58 Iju Road, Agege, Lagos",
    note: "Open to all friends & family",
    passRequired: false,
  },
  {
    key: "reception",
    label: "Reception",
    whenText: "Saturday, Nov 21, 2026 @ 01:00 PM",
    start: "2026-11-21T13:00:00+01:00",
    venueName: "Ronnie Dee Event Centre",
    venueAddress: "67 Iju Rd, Pen Cinema Zone, beside Eterna Petrol Station, Agege, Lagos 101232, Lagos",
    note: "Strictly by digital access card or pass code",
    passRequired: true,
  },
];

function getGoogleCalendarUrl(ev: (typeof itinerary)[number]) {
  const title = encodeURIComponent(`${ev.label} · ${coupleName.value}'s Wedding`);
  const details = encodeURIComponent(
    `Official wedding celebration for ${coupleName.value} (${hashtag.value}).\nVenue: ${ev.venueName}, ${ev.venueAddress}\nDress Code: Mauve & Gold\nPass Code: ${passId.value.toUpperCase()}`,
  );
  const location = encodeURIComponent(`${ev.venueName}, ${ev.venueAddress}`);
  const start = new Date(ev.start);
  const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${fmt(start)}/${fmt(end)}`;
}
</script>

<template>
  <div class="min-h-screen bg-[#140C12] text-[#FAF5F8] flex flex-col justify-between selection:bg-[#D4AF37] selection:text-[#30222A]">
    <!-- Ambient subtle background glow -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div class="absolute top-1/4 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] bg-[#865172]/15 rounded-full blur-[140px]" />
    </div>

    <!-- Minimalist Header Navigation -->
    <header class="relative z-10 border-b border-[#D4AF37]/15 bg-[#1C111A]/70 backdrop-blur-md px-4 sm:px-6 py-3.5">
      <div class="max-w-3xl mx-auto flex items-center justify-between">
        <NuxtLink to="/" class="flex items-center gap-2 text-decoration-none group">
          <span class="font-cinzel text-base sm:text-lg font-bold tracking-[0.16em] bg-gradient-to-r from-[#FCE8B3] via-[#D4AF37] to-[#B48A1E] bg-clip-text text-transparent group-hover:brightness-110 transition">
            {{ coupleName }}
          </span>
          <span class="text-[9px] uppercase tracking-[0.25em] text-[#D4AF37]/50 font-mono hidden sm:inline pt-0.5">
            {{ hashtag }}
          </span>
        </NuxtLink>

        <NuxtLink
          to="/wishlist"
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[11px] font-semibold tracking-wider text-[#FCE8B3] hover:bg-[#D4AF37]/20 hover:border-[#D4AF37] active:scale-95 transition"
        >
          <svg class="w-3 h-3 text-[#D4AF37]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="8" width="18" height="4" rx="1"/>
            <path d="M12 8v13"/>
            <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/>
            <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>
          </svg>
          <span>Registry</span>
        </NuxtLink>
      </div>
    </header>

    <!-- Main Content Container -->
    <main class="relative z-10 flex-1 max-w-xl w-full mx-auto px-4 py-6 sm:py-8 flex flex-col items-center">
      <!-- Loading State -->
      <div v-if="pending" class="py-24 flex flex-col items-center justify-center gap-3 text-center">
        <div class="w-8 h-8 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
        <p class="text-[11px] tracking-[0.2em] uppercase text-[#D4AF37] font-semibold">Loading pass…</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error || !pass" class="py-16 text-center max-w-sm mx-auto">
        <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-red-900/30 border border-red-500/40 flex items-center justify-center text-[#FCE8B3]">
          <svg class="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <h1 class="text-xl font-cinzel font-bold text-[#FCE8B3] mb-1.5">Pass Not Found</h1>
        <p class="text-xs text-[#FAF5F8]/70 mb-5 leading-relaxed">
          We couldn't locate this pass code. Please verify the URL link or contact the wedding party.
        </p>
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#865172] text-white text-[11px] font-semibold uppercase tracking-widest hover:bg-[#653853] transition"
        >
          Return Home
        </NuxtLink>
      </div>

      <!-- Loaded Pass View -->
      <div v-else class="w-full flex flex-col items-center">
        <!-- Hero Luxury Access Card Canvas -->
        <div class="w-full flex flex-col items-center mb-5">
          <div class="mb-2 text-center">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[11px] font-mono font-bold tracking-[0.2em] text-[#FCE8B3] uppercase">
              PASS CODE: {{ pass.passCode || pass.id }}
            </span>
          </div>

          <AccessCard
            ref="cardRef"
            :rsvp-id="pass.passCode || pass.id"
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

        <!-- Sleek Action Buttons (2-Column Grid) -->
        <div class="w-full max-w-[340px] grid grid-cols-2 gap-2.5 mb-8">
          <!-- Download Image Button -->
          <button
            type="button"
            :disabled="downloading"
            class="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#FCE8B3] via-[#D4AF37] to-[#B48A1E] text-[#30222A] font-bold text-[11px] uppercase tracking-wider shadow-md hover:brightness-105 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
            @click="handleDownload"
          >
            <svg class="w-3.5 h-3.5 text-[#30222A]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>{{ downloading ? "Saving…" : "Save Pass" }}</span>
          </button>

          <!-- Wishlist Link -->
          <NuxtLink
            to="/wishlist"
            class="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-[#D4AF37]/35 bg-[#251620]/80 text-[#FCE8B3] font-semibold text-[11px] uppercase tracking-wider hover:bg-[#D4AF37]/15 hover:border-[#D4AF37] active:scale-[0.98] transition text-center"
          >
            <svg class="w-3.5 h-3.5 text-[#D4AF37]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="8" width="18" height="4" rx="1"/>
              <path d="M12 8v13"/>
              <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/>
              <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>
            </svg>
            <span>Wishlist</span>
          </NuxtLink>
        </div>

        <!-- Reception table (shown once the couple's planner has assigned one) -->
        <div
          v-if="pass.tableNumber"
          class="w-full max-w-md mb-6 p-4 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#865172]/20 border border-[#D4AF37]/40 text-center"
        >
          <p class="text-[10px] font-bold uppercase tracking-[0.25em] text-[#D4AF37] mb-1">Your Reception Table</p>
          <p class="font-cinzel text-4xl font-bold text-[#FCE8B3] leading-none">Table {{ pass.tableNumber }}</p>
          <p v-if="pass.tableLabel" class="mt-1.5 text-xs text-[#FAF5F8]/75">{{ pass.tableLabel }}</p>
        </div>

        <!-- Important Reception Access Alert -->
        <div class="w-full max-w-md p-3.5 mb-6 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-start gap-3 text-left">
          <div class="p-1 rounded-md bg-[#D4AF37]/20 text-[#FCE8B3] shrink-0 mt-0.5">
            <svg class="w-4 h-4 text-[#D4AF37]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-[#FCE8B3] mb-0.5">Reception Entry Requirement</h4>
            <p class="text-[11px] text-[#FAF5F8]/80 leading-relaxed">
              This digital pass code (<span class="font-mono font-bold text-[#FCE8B3]">{{ pass.passCode || pass.id }}</span>) is strictly required for admission at the <strong>Wedding Reception</strong>. Please keep it open or save the image to your phone to present to the ushers at the entrance.
            </p>
          </div>
        </div>

        <!-- Venue Itinerary & Entry Guidelines -->
        <div class="w-full max-w-md border-t border-[#D4AF37]/15 pt-6 mb-6">
          <div class="text-center mb-5">
            <span class="text-[10px] font-bold uppercase tracking-[0.25em] text-[#D4AF37]">
              Venue Details
            </span>
          </div>

          <div class="space-y-4">
            <div
              v-for="ev in itinerary"
              :key="ev.key"
              class="p-4 rounded-xl bg-[#20121B]/60 border border-[#D4AF37]/15 space-y-2 text-left"
            >
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <h3 class="font-cinzel text-sm font-bold text-[#FAF5F8] tracking-wide uppercase">{{ ev.label }}</h3>
                <span
                  v-if="ev.passRequired"
                  class="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#D4AF37]/20 text-[#FCE8B3] border border-[#D4AF37]/40"
                >
                  Pass Required
                </span>
                <span
                  v-else
                  class="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-500/30"
                >
                  Open to All
                </span>
              </div>

              <p class="text-[12px] font-mono text-[#D4AF37]">{{ ev.whenText }}</p>

              <div class="text-[12px] text-[#FAF5F8]/80 leading-relaxed">
                <span class="font-semibold text-[#FAF5F8]">{{ ev.venueName }}</span>
                <span class="text-[#FAF5F8]/60">, {{ ev.venueAddress }}</span>
              </div>
              <p class="text-[11px] italic text-[#FAF5F8]/55">({{ ev.note }})</p>

              <div class="pt-1 flex items-center gap-4 text-[10px]">
                <a
                  :href="getGoogleCalendarUrl(ev)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1 text-[#FCE8B3] hover:text-white transition font-medium underline underline-offset-2 decoration-[#D4AF37]/40"
                >
                  <span>Add to Calendar</span>
                </a>
                <a
                  :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.venueName + ' ' + ev.venueAddress)}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1 text-[#FCE8B3] hover:text-white transition font-medium underline underline-offset-2 decoration-[#D4AF37]/40"
                >
                  <span>Directions (Maps) ↗</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- Attire & Dress Code Card -->
        <div class="w-full max-w-md p-4 mb-6 rounded-xl bg-[#20121B]/60 border border-[#D4AF37]/15 text-left space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">Dress Code</span>
            <div class="flex items-center gap-1.5">
              <span class="w-3 h-3 rounded-full bg-[#865172] border border-white/20" title="Mauve" />
              <span class="w-3 h-3 rounded-full bg-[#D4AF37] border border-white/20" title="Gold" />
            </div>
          </div>
          <p class="text-xs font-semibold text-[#FAF5F8]">Mauve &amp; Gold</p>
        </div>

        <!-- Note to Guests -->
        <div class="w-full max-w-md text-center space-y-1 px-4 pt-2 mb-4 border-t border-[#D4AF37]/10">
          <p class="text-[11px] font-serif italic text-[#FAF5F8]/60">
            "Your love, presence, and prayers are our greatest gifts."
          </p>
          <p class="text-[9px] font-mono tracking-[0.2em] text-[#D4AF37]/60 uppercase">
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
