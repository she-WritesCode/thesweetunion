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

const appUrl = (config.public as any).appUrl || "https://thesweetunion.com";
const ogImageUrl = computed(() => `${appUrl}/api/pass/og-image/${passId.value}`);

useSeoMeta({
  title: () => `Wedding Pass: ${guestName.value} · ${hashtag.value}`,
  ogTitle: () => `🎟️ Official Wedding Pass: ${guestName.value}`,
  description: () =>
    `Official digital wedding pass for ${guestName.value} celebrating ${coupleName.value}. Kindly present this pass at the entrance.`,
  ogDescription: () =>
    `Official digital wedding pass for ${guestName.value} celebrating ${coupleName.value}. Kindly present this pass at the entrance.`,
  ogImage: () => ogImageUrl.value,
  ogType: "website",
  twitterCard: "summary_large_image",
  twitterTitle: () => `🎟️ Wedding Pass: ${guestName.value}`,
  twitterDescription: () => `Digital wedding pass for ${coupleName.value}'s wedding celebration.`,
  twitterImage: () => ogImageUrl.value,
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
  <div class="min-h-screen bg-[#1F151B] text-[#FAF5F8] flex flex-col justify-between selection:bg-[#D4AF37] selection:text-[#30222A]">
    <!-- Background glow elements -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div class="absolute -top-40 -left-40 w-96 h-96 bg-[#865172]/20 rounded-full blur-3xl" />
      <div class="absolute top-1/2 -right-40 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl" />
      <div class="absolute -bottom-40 left-1/3 w-96 h-96 bg-[#865172]/20 rounded-full blur-3xl" />
    </div>

    <!-- Header Navigation -->
    <header class="relative z-10 border-b border-[#D4AF37]/20 bg-[#30222A]/60 backdrop-blur-md px-4 py-4">
      <div class="max-w-4xl mx-auto flex items-center justify-between">
        <NuxtLink to="/" class="flex items-center gap-2 text-decoration-none group">
          <span class="font-serif text-lg md:text-xl font-bold tracking-widest bg-gradient-to-r from-[#FCE8B3] via-[#D4AF37] to-[#B48A1E] bg-clip-text text-transparent group-hover:opacity-90 transition">
            {{ coupleName }}
          </span>
          <span class="text-xs uppercase tracking-widest text-[#D4AF37]/70 font-mono hidden sm:inline">
            {{ hashtag }}
          </span>
        </NuxtLink>

        <NuxtLink
          to="/wishlist"
          class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 text-xs font-semibold tracking-wider text-[#FCE8B3] hover:bg-[#D4AF37]/20 hover:border-[#D4AF37] transition"
        >
          <span>🎁</span>
          <span>Gift Registry</span>
        </NuxtLink>
      </div>
    </header>

    <!-- Main Content Container -->
    <main class="relative z-10 flex-1 max-w-3xl w-full mx-auto px-4 py-8 md:py-12 flex flex-col items-center">
      <!-- Loading State -->
      <div v-if="pending" class="py-24 flex flex-col items-center justify-center gap-4 text-center">
        <div class="w-12 h-12 border-3 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
        <p class="text-sm tracking-widest uppercase text-[#D4AF37]">Preparing your digital pass…</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error || !pass" class="py-20 text-center max-w-md mx-auto">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-900/30 border border-red-500/40 flex items-center justify-center text-2xl">
          🎟️
        </div>
        <h1 class="text-2xl font-serif font-bold text-[#FCE8B3] mb-2">Pass Not Found</h1>
        <p class="text-sm text-[#FAF5F8]/70 mb-6">
          We couldn't locate this invitation pass code. Please verify the link received or reach out to the couple.
        </p>
        <NuxtLink
          to="/"
          class="inline-block px-6 py-2.5 rounded-lg bg-[#865172] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#653853] transition"
        >
          Return Home
        </NuxtLink>
      </div>

      <!-- Loaded Pass View -->
      <div v-else class="w-full flex flex-col items-center">
        <!-- Top Title -->
        <div class="text-center mb-6">
          <p class="text-xs uppercase font-semibold tracking-[0.25em] text-[#D4AF37] mb-1">
            Official Wedding Pass
          </p>
          <h1 class="text-2xl sm:text-3xl font-serif font-semibold text-[#FAF5F8] tracking-wide">
            {{ guestName }}
          </h1>
          <p class="text-xs text-[#FAF5F8]/60 mt-1">
            Pass Code: <span class="font-mono font-bold text-[#FCE8B3] tracking-wider">{{ pass.id.toUpperCase() }}</span>
          </p>
        </div>

        <!-- Luxury Access Card Canvas -->
        <div class="w-full flex justify-center mb-8">
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
        <div class="w-full max-w-md flex flex-col sm:flex-row gap-3 mb-10">
          <!-- Download Image Button -->
          <button
            type="button"
            :disabled="downloading"
            class="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#FCE8B3] via-[#D4AF37] to-[#B48A1E] text-[#30222A] font-bold text-xs uppercase tracking-widest shadow-lg shadow-[#D4AF37]/20 hover:brightness-105 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
            @click="handleDownload"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>{{ downloading ? "Saving Pass…" : "Save Pass to Photos" }}</span>
          </button>

          <!-- Wishlist Link -->
          <NuxtLink
            to="/wishlist"
            class="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-[#D4AF37]/50 bg-[#30222A]/80 text-[#FCE8B3] font-semibold text-xs uppercase tracking-widest hover:bg-[#D4AF37]/15 hover:border-[#D4AF37] active:scale-[0.98] transition text-center"
          >
            <span>🎁</span>
            <span>View Wishlist</span>
          </NuxtLink>
        </div>

        <!-- Event Details & Itinerary -->
        <div class="w-full max-w-xl bg-[#30222A]/70 border border-[#D4AF37]/30 rounded-2xl p-6 md:p-8 backdrop-blur-md shadow-xl mb-8">
          <div class="flex items-center gap-3 mb-6 pb-4 border-b border-[#D4AF37]/20">
            <span class="text-xl">📍</span>
            <div>
              <h2 class="font-serif text-lg font-bold text-[#FCE8B3]">Celebration Schedule & Venues</h2>
              <p class="text-xs text-[#FAF5F8]/60">Present your pass QR code upon arrival at the entrance.</p>
            </div>
          </div>

          <div v-if="pass.events && pass.events.length" class="space-y-6">
            <div
              v-for="(ev, idx) in pass.events"
              :key="ev.id || idx"
              class="relative pl-6 border-l-2 border-[#D4AF37]/40 space-y-2"
            >
              <div class="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-[#D4AF37] ring-4 ring-[#30222A]" />

              <div class="flex items-baseline justify-between flex-wrap gap-2">
                <h3 class="font-serif text-base font-semibold text-[#FAF5F8]">{{ ev.name }}</h3>
                <span v-if="ev.dressCode" class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#865172]/40 text-[#FCE8B3] border border-[#865172]">
                  {{ ev.dressCode }}
                </span>
              </div>

              <p v-if="ev.date" class="text-xs font-mono text-[#D4AF37]">
                📅 {{ formatDate(ev.date) }}
              </p>

              <div v-if="ev.venueName" class="text-xs text-[#FAF5F8]/80 leading-relaxed">
                <p class="font-semibold text-[#FAF5F8]">{{ ev.venueName }}</p>
                <p v-if="ev.venueAddress" class="text-[#FAF5F8]/60">{{ ev.venueAddress }}</p>
              </div>

              <div class="pt-2 flex items-center gap-3 flex-wrap">
                <!-- Add to Google Calendar -->
                <a
                  :href="getGoogleCalendarUrl(ev)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#FCE8B3] hover:text-white underline underline-offset-4 decoration-[#D4AF37]/60"
                >
                  <span>📅 Add to Google Calendar</span>
                </a>

                <!-- Google Maps Directions -->
                <a
                  v-if="ev.venueName || ev.venueAddress"
                  :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((ev.venueName || '') + ' ' + (ev.venueAddress || ''))}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#FCE8B3] hover:text-white underline underline-offset-4 decoration-[#D4AF37]/60"
                >
                  <span>🗺️ Open in Maps</span>
                </a>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-4 text-xs text-[#FAF5F8]/60 italic">
            Event itinerary details will be announced shortly.
          </div>
        </div>

        <!-- Note to Guests -->
        <div class="w-full max-w-xl text-center space-y-2 px-4">
          <p class="text-xs font-serif italic text-[#FAF5F8]/70">
            "Your love, presence, and prayers are the greatest gifts of all."
          </p>
          <p class="text-[11px] font-mono tracking-widest text-[#D4AF37]/80 uppercase">
            {{ hashtag }} · {{ weddingDateText }}
          </p>
        </div>
      </div>
    </main>

    <!-- Simple Footer -->
    <footer class="relative z-10 border-t border-[#D4AF37]/20 py-6 text-center text-xs text-[#FAF5F8]/50">
      <p>{{ coupleName }} · {{ weddingDateText }}</p>
    </footer>
  </div>
</template>
