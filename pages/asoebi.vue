<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useCachedDyrectedGlobal } from "~/composables/useCachedData";
import { publicPageTransition } from "~/composables/useMotion";
import Navigation from "~/components/Navigation.vue";

definePageMeta({
  pageTransition: publicPageTransition,
});

const route = useRoute();

// Global settings
const { data: asoebiSettings } = useCachedDyrectedGlobal("asoebi_settings", { depth: 2 });
const { data: siteSettings } = useCachedDyrectedGlobal("site_settings", { depth: 2 });
const couplesPhoto = computed(() => (siteSettings.value as any)?.footerImage?.url || null);

const fabricPhotos = computed<string[]>(() => {
  const images = (asoebiSettings.value as any)?.fabricImages;
  if (!images || !Array.isArray(images)) return [];
  return images
    .map((img: any) => (typeof img === "object" && img?.url ? img.url : null))
    .filter((url): url is string => Boolean(url));
});

const lightboxImage = ref<string | null>(null);
function setLightboxImage(url: string | null) {
  lightboxImage.value = url;
}

const pricePerYard = computed(() => (asoebiSettings.value as any)?.pricePerYard || 10000);
const asoOkeMalePrice = computed(() => (asoebiSettings.value as any)?.asoOkeMalePrice || 15000);
const asoOkeFemalePrice = computed(() => (asoebiSettings.value as any)?.asoOkeFemalePrice || 25000);
const bankName = computed(() => (asoebiSettings.value as any)?.bankName || "Access Bank");
const accountNumber = computed(() => (asoebiSettings.value as any)?.accountNumber || "0123456789");
const accountName = computed(() => (asoebiSettings.value as any)?.accountName || "Adun & Uche Union");
const whatsAppContact = computed(() => (asoebiSettings.value as any)?.whatsAppContact || "+234 913 697 6965");

// State
const lookupQuery = ref("");
const lookupLoading = ref(false);
const lookupMessage = ref("");
const lookupSuccess = ref(false);

const recordId = ref<string | null>(null);
const editToken = ref<string | null>(null);
const leadName = ref("");
const leadEmail = ref("");
const leadPhone = ref("");
const attending = ref<boolean | undefined>(undefined);

const wantsAsoebi = ref(false);
const asoebiYards = ref("3");
const wantsAsoOke = ref(false);
const asoOkeMaleQty = ref(0);
const asoOkeFemaleQty = ref(0);
const message = ref("");

const submitting = ref(false);
const submitError = ref("");
const submitSuccess = ref(false);
const isUpdate = ref(false);
const copiedBank = ref(false);

// Pricing Calculation
const fabricCost = computed(() => {
  if (!wantsAsoebi.value || !asoebiYards.value) return 0;
  const y = parseInt(asoebiYards.value, 10);
  return isNaN(y) ? 0 : y * pricePerYard.value;
});

const asoOkeMaleCost = computed(() => (wantsAsoOke.value ? asoOkeMaleQty.value * asoOkeMalePrice.value : 0));
const asoOkeFemaleCost = computed(() => (wantsAsoOke.value ? asoOkeFemaleQty.value * asoOkeFemalePrice.value : 0));

const totalCost = computed(() => fabricCost.value + asoOkeMaleCost.value + asoOkeFemaleCost.value);

// Helper functions for options
function selectFabricYards(yards: string) {
  if (!yards) {
    wantsAsoebi.value = false;
    asoebiYards.value = "";
  } else {
    wantsAsoebi.value = true;
    asoebiYards.value = yards;
  }
}

function incMaleAsoOke() {
  wantsAsoOke.value = true;
  asoOkeMaleQty.value = Math.min(asoOkeMaleQty.value + 1, 10);
}

function decMaleAsoOke() {
  if (asoOkeMaleQty.value > 0) {
    asoOkeMaleQty.value -= 1;
  }
  if (asoOkeMaleQty.value === 0 && asoOkeFemaleQty.value === 0) {
    wantsAsoOke.value = false;
  }
}

function incFemaleAsoOke() {
  wantsAsoOke.value = true;
  asoOkeFemaleQty.value = Math.min(asoOkeFemaleQty.value + 1, 10);
}

function decFemaleAsoOke() {
  if (asoOkeFemaleQty.value > 0) {
    asoOkeFemaleQty.value -= 1;
  }
  if (asoOkeMaleQty.value === 0 && asoOkeFemaleQty.value === 0) {
    wantsAsoOke.value = false;
  }
}

function copyAccount() {
  if (!accountNumber.value) return;
  navigator.clipboard.writeText(accountNumber.value);
  copiedBank.value = true;
  setTimeout(() => {
    copiedBank.value = false;
  }, 2500);
}

// Populate record data into form
function populateRecord(record: any) {
  recordId.value = record.id;
  editToken.value = record.editToken || null;
  leadName.value = record.leadName || "";
  leadEmail.value = record.leadEmail || "";
  leadPhone.value = record.leadPhone || "";
  attending.value = record.attending;

  wantsAsoebi.value = Boolean(record.wantsAsoebi);
  asoebiYards.value = record.asoebiYards || "3";
  wantsAsoOke.value = Boolean(record.wantsAsoOke);
  asoOkeMaleQty.value = Number(record.asoOkeMaleQty || 0);
  asoOkeFemaleQty.value = Number(record.asoOkeFemaleQty || 0);
  message.value = record.message || "";
}

// Lookup functionality
async function performLookup() {
  if (!lookupQuery.value.trim()) return;
  lookupLoading.value = true;
  lookupMessage.value = "";
  lookupSuccess.value = false;

  try {
    const res = await $fetch<{ found: boolean; record?: any; message?: string }>("/api/asoebi/lookup", {
      method: "POST",
      body: { identifier: lookupQuery.value.trim() },
    });

    if (res.found && res.record) {
      populateRecord(res.record);
      lookupSuccess.value = true;
      isUpdate.value = true;
      if (res.record.attending) {
        lookupMessage.value = `✓ RSVP Confirmed for ${res.record.leadName}! Your seat is secure and your current Aso Ebi selection has been pre-filled below.`;
      } else {
        lookupMessage.value = `Record found for ${res.record.leadName}! Your current selection has been pre-filled below.`;
      }
    } else {
      lookupSuccess.value = false;
      lookupMessage.value = res.message || "No record found. You can place a new order below.";
    }
  } catch (err: any) {
    lookupSuccess.value = false;
    lookupMessage.value = err.data?.message || err.message || "Failed to search. Please try again.";
  } finally {
    lookupLoading.value = false;
  }
}

// Submit Order / Update
async function submitAsoebiForm() {
  submitError.value = "";
  if (!leadEmail.value.trim() || !leadPhone.value.trim()) {
    submitError.value = "Please provide your email address and WhatsApp number.";
    return;
  }
  if (!recordId.value && !leadName.value.trim()) {
    submitError.value = "Please provide your full name for the order.";
    return;
  }
  if (!wantsAsoebi.value && !wantsAsoOke.value) {
    submitError.value = "Please select at least fabric yards or Aso Oke headwear to proceed.";
    return;
  }

  submitting.value = true;

  try {
    const res = await $fetch<{ success: boolean; isNew?: boolean; record?: any }>("/api/asoebi/save", {
      method: "POST",
      body: {
        editToken: editToken.value,
        id: recordId.value,
        leadName: leadName.value.trim(),
        leadEmail: leadEmail.value.trim(),
        leadPhone: leadPhone.value.trim(),
        wantsAsoebi: wantsAsoebi.value,
        asoebiYards: wantsAsoebi.value ? asoebiYards.value : "",
        wantsAsoOke: wantsAsoOke.value,
        asoOkeMaleQty: wantsAsoOke.value ? asoOkeMaleQty.value : 0,
        asoOkeFemaleQty: wantsAsoOke.value ? asoOkeFemaleQty.value : 0,
        message: message.value.trim(),
        attending: attending.value,
      },
    });

    if (res.success && res.record) {
      populateRecord(res.record);
      isUpdate.value = true;
      submitSuccess.value = true;
    }
  } catch (err: any) {
    submitError.value = err.data?.message || err.message || "Failed to save selection. Please try again.";
  } finally {
    submitting.value = false;
  }
}

// Auto-lookup if query param or token exists
onMounted(async () => {
  const token = route.query.token as string;
  const email = route.query.email as string;
  const phone = route.query.phone as string;

  if (token) {
    try {
      const rec = await $fetch<any>(`/api/rsvp/record?token=${token}`);
      if (rec) {
        populateRecord(rec);
        isUpdate.value = true;
        lookupSuccess.value = true;
        lookupMessage.value = `Welcome back ${rec.leadName}! Your selection is pre-filled below.`;
      }
    } catch {
      // Ignore fallback
    }
  } else if (email || phone) {
    lookupQuery.value = email || phone;
    performLookup();
  }
});

// Clean WhatsApp URL for payment confirmation
const waPaymentLink = computed(() => {
  const num = whatsAppContact.value.replace(/\D/g, "");
  const text = `Hi, I have made payment for my Aso Ebi order (${leadName.value || "Guest"}). Here is my proof of payment.`;
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
});
</script>

<template>
  <div class="min-h-screen bg-warm-cream text-deep-espresso flex flex-col relative select-text pb-20">
    <Navigation />

    <!-- Hero Header -->
    <header class="pt-28 pb-8 px-6 text-center max-w-4xl mx-auto">
      <p class="text-xs uppercase tracking-widest text-deep-terracotta mb-2 font-sans font-bold">
        #TheSweetUnion Celebration
      </p>
      <h1 class="text-3xl md:text-5xl font-bold font-display-cinzel text-deep-espresso mb-4">
        Aso Ebi & Headwear Selection
      </h1>
      <p class="text-base md:text-lg text-deep-espresso/70 max-w-2xl mx-auto font-light leading-relaxed mb-6">
        Join us in celebrating our traditional union in style! Look up your current selection, make updates, or place a
        new Aso Ebi order below.
      </p>

      <!-- Disclaimer Banner -->
      <div
        class="bg-amber-50/90 border border-amber-gold/40 text-amber-950 rounded-2xl p-4 md:p-5 max-w-2xl mx-auto flex items-start gap-3.5 font-sans text-xs md:text-sm text-left shadow-sm"
      >
        <svg class="w-5 h-5 text-amber-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div class="space-y-2">
          <p class="font-bold uppercase tracking-wider text-xs text-amber-900 mb-0.5">Important Notice</p>
          <p class="leading-relaxed text-xs md:text-sm text-amber-950">
            <strong>Buying Aso Ebi does not mean you have RSVP'd:</strong> Booking fabric alone does not count as a
            wedding seat reservation. If you haven't submitted an RSVP yet, please request your official invitation link
            from the bride or groom and submit your RSVP.
          </p>
          <p class="leading-relaxed text-xs md:text-sm text-amber-950">
            <strong>Already submitted your RSVP form?</strong> You have nothing to worry about—your seat is secure! You
            can use this page to view or update your Aso Ebi fabric choices anytime.
          </p>
        </div>
      </div>
    </header>

    <main class="max-w-4xl mx-auto px-4 md:px-6 space-y-10">
      <!-- Fabric Showcase Gallery (1 to 4 images) -->
      <section v-if="fabricPhotos.length > 0" class="space-y-4 text-center">
        <!-- Dynamic Grid depending on photo count -->
        <div
          class="grid gap-6 justify-center items-center select-none pt-2"
          :class="{
            'grid-cols-1 max-w-md mx-auto': fabricPhotos.length === 1,
            'grid-cols-2 sm:grid-cols-2 max-w-2xl mx-auto': fabricPhotos.length === 2,
            'grid-cols-2 sm:grid-cols-3 max-w-4xl mx-auto': fabricPhotos.length === 3,
            'grid-cols-2 sm:grid-cols-4 max-w-4xl mx-auto': fabricPhotos.length === 4,
            'grid-cols-2 sm:grid-cols-3 md:grid-cols-5 max-w-5xl mx-auto': fabricPhotos.length === 5,
            'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 max-w-5xl mx-auto': fabricPhotos.length >= 6,
          }"
        >
          <div
            v-for="(photo, idx) in fabricPhotos"
            :key="idx"
            class="bg-white p-3 pb-6 rounded-xl shadow-md border border-deep-espresso/5 transition-all duration-300 hover:rotate-0 hover:scale-105 cursor-zoom-in motion-lift relative group"
            :class="idx % 2 === 0 ? '-rotate-2' : 'rotate-2'"
            @click="setLightboxImage(photo)"
          >
            <div class="relative aspect-4/3 sm:aspect-square w-full overflow-hidden bg-deep-espresso/5 rounded-md">
              <DyrectedMedia :media="photo" alt="Aso Ebi Fabric & Headwear" class="img-fill object-cover" />
            </div>
            <div class="mt-3 text-center flex items-center justify-center gap-1 text-deep-espresso/80">
              <span class="font-display-cormorant text-sm font-semibold">#TheSweetUnion</span>
              <svg class="w-3.5 h-3.5 text-amber-gold inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                />
              </svg>
            </div>
          </div>
        </div>
      </section>

      <!-- Live Pricing & Bank Info Banner -->
      <section class="bg-white/80 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-amber-gold/20 shadow-md">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 class="text-xl font-bold font-display-cinzel text-deep-espresso mb-4 flex items-center gap-2">
              <svg class="w-5 h-5 text-amber-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>
              <span>Pricing & Packages</span>
            </h2>
            <ul class="space-y-3 text-sm text-deep-espresso/80 font-sans">
              <li class="flex justify-between items-center pb-2 border-b border-warm-cream">
                <span class="font-medium">Aso Ebi Fabric (per yard)</span>
                <span class="font-semibold text-deep-terracotta">₦{{ pricePerYard.toLocaleString() }}</span>
              </li>
              <li class="flex justify-between items-center pb-2 border-b border-warm-cream">
                <span class="font-medium">Male Aso Oke (Fila / Cap)</span>
                <span class="font-semibold text-deep-terracotta">₦{{ asoOkeMalePrice.toLocaleString() }}</span>
              </li>
              <li class="flex justify-between items-center pb-2 border-b border-warm-cream">
                <span class="font-medium">Female Aso Oke (Gele / Ipele)</span>
                <span class="font-semibold text-deep-terracotta">₦{{ asoOkeFemalePrice.toLocaleString() }}</span>
              </li>
            </ul>
          </div>

          <!-- Bank Account Box -->
          <div class="bg-warm-cream/60 rounded-xl p-5 border border-amber-gold/30 flex flex-col justify-between">
            <div>
              <p class="text-xs uppercase tracking-wider text-deep-espresso/60 font-sans font-bold mb-2">
                Bank Transfer Details
              </p>
              <p class="text-sm font-semibold text-deep-espresso">{{ bankName }}</p>
              <div class="flex items-center gap-3 my-1">
                <span class="text-2xl font-mono font-bold tracking-wider text-deep-terracotta">
                  {{ accountNumber }}
                </span>
                <button
                  type="button"
                  @click="copyAccount"
                  class="text-xs px-2.5 py-1 bg-white hover:bg-amber-gold/10 border border-amber-gold/40 rounded text-deep-espresso font-sans transition-colors cursor-pointer"
                >
                  {{ copiedBank ? "Copied! ✓" : "Copy" }}
                </button>
              </div>
              <p class="text-xs text-deep-espresso/70 font-sans">{{ accountName }}</p>
            </div>
            <p class="text-xs text-deep-espresso/70 font-sans mt-3 italic">
              Proof of payment can be sent on WhatsApp to
              <a
                :href="waPaymentLink"
                target="_blank"
                rel="noopener noreferrer"
                class="font-semibold text-deep-terracotta underline hover:text-deep-terracotta/80 cursor-pointer"
              >
                {{ whatsAppContact }} ↗ </a
              >.
            </p>
          </div>
        </div>
      </section>

      <!-- Quick Lookup Bar -->
      <section class="bg-white/90 rounded-2xl p-6 md:p-8 border border-amber-gold/20 shadow-md">
        <div class="max-w-2xl mx-auto text-center">
          <h2 class="text-lg md:text-xl font-display-cinzel text-deep-espresso font-bold mb-2">
            Already RSVP'd or Ordered Aso Ebi?
          </h2>
          <p class="text-xs md:text-sm text-deep-espresso/70 font-sans mb-6">
            Enter your Email or WhatsApp Phone Number to view your existing choices and update them anytime.
          </p>

          <form @submit.prevent="performLookup" class="flex flex-col sm:flex-row gap-3 justify-center">
            <input
              v-model="lookupQuery"
              type="text"
              placeholder="Enter your email or phone number"
              class="flex-1 px-4 py-3 bg-warm-cream/50 border border-amber-gold/30 rounded-xl text-sm font-sans focus:outline-none focus:border-deep-terracotta"
            />
            <button
              type="submit"
              :disabled="lookupLoading || !lookupQuery.trim()"
              class="px-6 py-3 bg-deep-espresso text-warm-cream font-sans text-xs uppercase tracking-wider font-semibold rounded-xl hover:bg-deep-espresso/90 disabled:opacity-50 transition-all cursor-pointer"
            >
              {{ lookupLoading ? "Searching..." : "Find My Order" }}
            </button>
          </form>

          <Transition name="dialog-pop">
            <p
              v-if="lookupMessage"
              class="mt-4 text-xs md:text-sm font-sans font-medium px-4 py-2 rounded-lg"
              :class="
                lookupSuccess
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border border-amber-200'
              "
            >
              {{ lookupMessage }}
            </p>
          </Transition>
        </div>
      </section>

      <!-- Order & Selection Form -->
      <section class="bg-white rounded-2xl p-6 md:p-10 border border-amber-gold/20 shadow-lg">
        <form @submit.prevent="submitAsoebiForm" class="space-y-8">
          <div class="border-b border-amber-gold/15 pb-4">
            <h2 class="text-2xl font-display-cinzel text-deep-espresso font-bold">
              {{ isUpdate ? "Update Your Aso Ebi Order" : "Place Aso Ebi Order" }}
            </h2>
            <p class="text-xs text-deep-espresso/60 font-sans mt-1">
              Select your fabric yards and headwear quantities below.
            </p>
          </div>

          <!-- Guest Contact Info -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label class="block text-xs uppercase tracking-wider text-deep-espresso/70 font-sans font-semibold mb-2">
                Full Name *
              </label>
              <input
                v-model="leadName"
                type="text"
                required
                placeholder="e.g. Bukola Bello"
                class="w-full px-4 py-3 bg-warm-cream/30 border border-amber-gold/30 rounded-xl text-sm font-sans focus:outline-none focus:border-deep-terracotta"
              />
            </div>

            <div>
              <label class="block text-xs uppercase tracking-wider text-deep-espresso/70 font-sans font-semibold mb-2">
                Email Address *
              </label>
              <input
                v-model="leadEmail"
                type="email"
                required
                placeholder="e.g. bukola@example.com"
                class="w-full px-4 py-3 bg-warm-cream/30 border border-amber-gold/30 rounded-xl text-sm font-sans focus:outline-none focus:border-deep-terracotta"
              />
            </div>

            <div>
              <label class="block text-xs uppercase tracking-wider text-deep-espresso/70 font-sans font-semibold mb-2">
                WhatsApp Phone Number *
              </label>
              <input
                v-model="leadPhone"
                type="tel"
                required
                placeholder="e.g. 08012345678"
                class="w-full px-4 py-3 bg-warm-cream/30 border border-amber-gold/30 rounded-xl text-sm font-sans focus:outline-none focus:border-deep-terracotta"
              />
            </div>
          </div>

          <!-- Fabric Selection Section (Exact RSVP Form UI) -->
          <div class="p-5 rounded-2xl bg-warm-cream/40 border border-amber-gold/20 space-y-3 font-sans">
            <div>
              <label class="block text-sm font-bold text-deep-espresso">Asoebi Fabric</label>
              <div class="text-xs text-deep-terracotta font-medium mt-0.5">
                ₦{{ pricePerYard.toLocaleString() }} per yard
              </div>
            </div>

            <div class="fabric-pills">
              <button
                type="button"
                class="fabric-pill"
                :class="{ 'fabric-pill--selected': !wantsAsoebi || !asoebiYards }"
                @click="selectFabricYards('')"
              >
                <span class="fabric-pill__title">No fabric</span>
              </button>

              <button
                v-for="y in ['2', '3', '4', '5', '6']"
                :key="y"
                type="button"
                class="fabric-pill"
                :class="{ 'fabric-pill--selected': wantsAsoebi && asoebiYards === y }"
                @click="selectFabricYards(y)"
              >
                <span class="fabric-pill__title">{{ y }} Yards</span>
                <span class="fabric-pill__price">₦{{ (parseInt(y, 10) * pricePerYard).toLocaleString() }}</span>
              </button>
            </div>
          </div>

          <!-- Aso Oke Headwear Section (Exact RSVP Form UI) -->
          <div class="p-5 rounded-2xl bg-warm-cream/40 border border-amber-gold/20 space-y-4 font-sans">
            <label class="block text-sm font-bold text-deep-espresso">Aso Oke (Headwear / Cap)</label>

            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="font-semibold text-sm text-deep-espresso">Male Aso Oke (Fila / Cap)</div>
                <div class="text-xs text-deep-terracotta font-medium">₦{{ asoOkeMalePrice.toLocaleString() }}</div>
              </div>
              <div class="stepper-box">
                <button
                  type="button"
                  class="stepper-btn"
                  :disabled="asoOkeMaleQty <= 0"
                  @click="decMaleAsoOke"
                  aria-label="Decrease male Aso Oke quantity"
                >
                  −
                </button>
                <span class="stepper-val">{{ asoOkeMaleQty }}</span>
                <button
                  type="button"
                  class="stepper-btn"
                  :disabled="asoOkeMaleQty >= 10"
                  @click="incMaleAsoOke"
                  aria-label="Increase male Aso Oke quantity"
                >
                  +
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between gap-3 border-t border-amber-gold/15 pt-3">
              <div>
                <div class="font-semibold text-sm text-deep-espresso">Female Aso Oke (Gele / Ipele)</div>
                <div class="text-xs text-deep-terracotta font-medium">₦{{ asoOkeFemalePrice.toLocaleString() }}</div>
              </div>
              <div class="stepper-box">
                <button
                  type="button"
                  class="stepper-btn"
                  :disabled="asoOkeFemaleQty <= 0"
                  @click="decFemaleAsoOke"
                  aria-label="Decrease female Aso Oke quantity"
                >
                  −
                </button>
                <span class="stepper-val">{{ asoOkeFemaleQty }}</span>
                <button
                  type="button"
                  class="stepper-btn"
                  :disabled="asoOkeFemaleQty >= 10"
                  @click="incFemaleAsoOke"
                  aria-label="Increase female Aso Oke quantity"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <!-- Order Summary Breakdown Card (Exact RSVP Form UI) -->
          <Transition name="dialog-pop">
            <div
              v-if="totalCost > 0"
              class="p-5 rounded-2xl bg-warm-cream/60 border border-amber-gold/30 text-sm font-sans space-y-2"
            >
              <h4 class="font-bold text-sm text-deep-espresso">Order Summary</h4>
              <div class="space-y-1.5 text-xs md:text-sm text-deep-espresso">
                <div v-if="wantsAsoebi && asoebiYards" class="flex justify-between">
                  <span>Asoebi Fabric ({{ asoebiYards }} Yards)</span>
                  <span class="font-semibold font-mono"
                    >₦{{ (parseInt(asoebiYards, 10) * pricePerYard).toLocaleString() }}</span
                  >
                </div>
                <div v-if="wantsAsoOke && asoOkeMaleQty > 0" class="flex justify-between">
                  <span>Male Aso Oke ({{ asoOkeMaleQty }} set{{ asoOkeMaleQty > 1 ? "s" : "" }})</span>
                  <span class="font-semibold font-mono">₦{{ (asoOkeMaleQty * asoOkeMalePrice).toLocaleString() }}</span>
                </div>
                <div v-if="wantsAsoOke && asoOkeFemaleQty > 0" class="flex justify-between">
                  <span>Female Aso Oke ({{ asoOkeFemaleQty }} set{{ asoOkeFemaleQty > 1 ? "s" : "" }})</span>
                  <span class="font-semibold font-mono"
                    >₦{{ (asoOkeFemaleQty * asoOkeFemalePrice).toLocaleString() }}</span
                  >
                </div>
                <div
                  class="flex justify-between font-bold text-sm md:text-base border-t border-amber-gold/20 pt-2 text-deep-terracotta"
                >
                  <span>Estimated Total</span>
                  <span class="font-mono">₦{{ totalCost.toLocaleString() }}</span>
                </div>
              </div>
              <p class="text-[11px] text-deep-espresso/60 pt-1">
                * A full breakdown and payment instructions will be sent to your email.
              </p>
            </div>
          </Transition>

          <!-- Question / Notes Textarea -->
          <div>
            <label class="block text-xs uppercase tracking-wider text-deep-espresso/70 font-sans font-semibold mb-2">
              Questions or Delivery Notes (Optional)
            </label>
            <textarea
              v-model="message"
              rows="3"
              placeholder="Any questions for the couple or preferences for pickup/delivery?"
              class="w-full px-4 py-3 bg-warm-cream/30 border border-amber-gold/30 rounded-xl text-sm font-sans focus:outline-none focus:border-deep-terracotta resize-none"
            ></textarea>
          </div>

          <!-- Submit Action -->
          <div class="pt-2">
            <Transition name="dialog-pop">
              <p
                v-if="submitError"
                class="mb-4 text-xs font-sans text-rose-700 bg-rose-50 p-3 rounded-lg border border-rose-200"
              >
                {{ submitError }}
              </p>
            </Transition>

            <button
              type="submit"
              :disabled="submitting || totalCost === 0"
              class="w-full py-4 bg-deep-terracotta text-white font-sans text-sm uppercase tracking-widest font-bold rounded-xl hover:bg-deep-terracotta/90 disabled:opacity-50 shadow-md transition-all cursor-pointer"
            >
              {{
                submitting
                  ? "Saving Selection..."
                  : isUpdate
                    ? "Update Selection & Send Receipt"
                    : "Confirm Aso Ebi Order"
              }}
            </button>
          </div>
        </form>
      </section>

      <!-- Wishlist Registry Upsell Section -->
      <section
        class="bg-white/90 backdrop-blur-md rounded-2xl p-6 md:p-10 border border-amber-gold/20 shadow-md flex flex-col md:flex-row items-center justify-between gap-6 mb-12"
      >
        <div class="space-y-2 text-center md:text-left">
          <span
            class="text-xs uppercase tracking-widest text-deep-terracotta font-sans font-bold flex items-center justify-center md:justify-start gap-1.5"
          >
            <svg class="w-4 h-4 text-deep-terracotta" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V6a2 2 0 10-2 2h2zm9 2H3v11a2 2 0 002 2h14a2 2 0 002-2V10z"
              />
            </svg>
            <span>Wedding Registry</span>
          </span>
          <h2 class="text-xl md:text-2xl font-display-cinzel text-deep-espresso font-bold">
            Bless Our Home & New Journey
          </h2>
          <p class="text-xs md:text-sm text-deep-espresso/70 font-sans max-w-xl leading-relaxed">
            Your love, presence, and prayers mean everything to us! If you'd like to help us build our home as we begin
            our life together, check out our wedding registry for curated gifts and cash funds.
          </p>
        </div>
        <NuxtLink
          to="/wishlist"
          class="shrink-0 px-6 py-3.5 bg-deep-espresso text-warm-cream font-sans text-xs uppercase tracking-widest font-bold rounded-xl hover:bg-deep-espresso/90 shadow transition-all cursor-pointer inline-flex items-center gap-2"
        >
          <span>Browse Registry</span>
          <span>→</span>
        </NuxtLink>
      </section>
    </main>

    <!-- Footer Component -->
    <Footer :couples-photo="couplesPhoto" />

    <!-- Success Confirmation Modal -->
    <Transition name="overlay-fade">
      <div
        v-if="submitSuccess"
        class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        @click.self="submitSuccess = false"
      >
        <Transition name="dialog-pop" appear>
          <div
            v-if="submitSuccess"
            class="bg-white rounded-2xl max-w-lg w-full p-6 md:p-8 border border-amber-gold/30 shadow-2xl space-y-6"
          >
            <div class="text-center">
              <div
                class="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl font-bold"
              >
                <svg class="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 class="text-2xl font-display-cinzel text-deep-espresso font-bold">
                {{ isUpdate ? "Selection Updated!" : "Order Recorded!" }}
              </h3>
              <p class="text-sm text-deep-espresso/70 font-sans mt-1">
                Thank you, {{ leadName }}. We have sent a confirmation email to <strong>{{ leadEmail }}</strong
                >.
              </p>
            </div>

            <div class="bg-warm-cream/60 p-4 md:p-5 rounded-xl border border-amber-gold/30 text-sm font-sans space-y-3">
              <div class="flex justify-between items-center pb-2 border-b border-amber-gold/15">
                <span class="text-deep-espresso/70 font-medium">Grand Total</span>
                <span class="font-bold font-mono text-lg text-deep-terracotta">₦{{ totalCost.toLocaleString() }}</span>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-semibold text-deep-espresso/60 uppercase tracking-wider">
                  Bank Transfer Details
                </p>
                <p class="font-semibold text-deep-espresso text-sm">{{ bankName }}</p>
                <div
                  class="flex items-center justify-between bg-white px-3 py-2.5 rounded-lg border border-amber-gold/30 my-1"
                >
                  <span class="font-mono font-bold text-lg text-deep-terracotta tracking-wider">{{
                    accountNumber
                  }}</span>
                  <button
                    type="button"
                    @click="copyAccount"
                    class="text-xs px-3 py-1.5 bg-warm-cream hover:bg-amber-gold/20 border border-amber-gold/40 rounded-md text-deep-espresso font-sans transition-colors cursor-pointer font-semibold inline-flex items-center gap-1"
                  >
                    <span>{{ copiedBank ? "Copied!" : "Copy Account" }}</span>
                    <svg
                      v-if="copiedBank"
                      class="w-3.5 h-3.5 text-emerald-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                </div>
                <p class="text-xs text-deep-espresso/70 font-medium">{{ accountName }}</p>
              </div>
            </div>

            <!-- Gentle Wishlist Upsell in Modal -->
            <div class="bg-amber-50/70 p-3.5 rounded-xl border border-amber-gold/25 text-center text-xs font-sans">
              <p class="text-deep-espresso/80 inline-flex items-center justify-center gap-1 flex-wrap">
                <svg class="w-4 h-4 text-deep-terracotta inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V6a2 2 0 10-2 2h2zm9 2H3v11a2 2 0 002 2h14a2 2 0 002-2V10z"
                  />
                </svg>
                <span>Want to bless the couple further?</span>
                <NuxtLink
                  to="/wishlist"
                  class="font-bold text-deep-terracotta underline hover:text-deep-terracotta/80 ml-1"
                >
                  Browse Wedding Registry
                </NuxtLink>
              </p>
            </div>

            <div class="space-y-3">
              <a
                :href="waPaymentLink"
                target="_blank"
                rel="noopener noreferrer"
                class="w-full py-3 bg-emerald-600 text-white font-sans text-xs uppercase tracking-wider font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all cursor-pointer"
              >
                <span>Send Proof of Payment on WhatsApp</span>
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99 0-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"
                  />
                </svg>
              </a>

              <button
                type="button"
                @click="submitSuccess = false"
                class="w-full py-3 bg-warm-cream text-deep-espresso font-sans text-xs uppercase tracking-wider font-semibold rounded-xl hover:bg-warm-cream/80 transition-colors cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- Lightbox Modal -->
    <Transition name="overlay-fade">
      <div
        v-if="lightboxImage"
        class="fixed inset-0 bg-black/95 z-50 flex items-center justify-center cursor-zoom-out p-4 md:p-8"
        @click="setLightboxImage(null)"
      >
        <Transition name="dialog-pop" appear>
          <div
            v-if="lightboxImage"
            class="relative flex items-center justify-center max-w-5xl max-h-[90vh] w-full h-full"
          >
            <DyrectedMedia
              :media="lightboxImage"
              alt="Enlarged fabric photo"
              class="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
            />
          </div>
        </Transition>
        <button
          @click="setLightboxImage(null)"
          class="absolute top-6 right-6 text-white/70 hover:text-white transition-colors text-3xl font-sans focus:outline-none cursor-pointer"
          aria-label="Close lightbox"
        >
          ✕
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.stepper-box {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #ffffff;
  border: 1px solid #d9c9c4;
  border-radius: 8px;
  padding: 4px 8px;
  box-shadow: 0 1px 3px rgba(134, 81, 114, 0.06);
}

.stepper-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 6px;
  border: 1px solid #865172;
  background: #faf7f5;
  color: #865172;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 150ms ease;
  user-select: none;
  line-height: 1;
}

.stepper-btn:hover:not(:disabled) {
  background: #865172;
  color: #ffffff;
}

.stepper-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  border-color: #d9c9c4;
  color: #999999;
  background: #ffffff;
}

.stepper-val {
  min-width: 36px;
  text-align: center;
  font-weight: 700;
  font-size: 0.95rem;
  color: #462137;
}

.fabric-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.fabric-pill {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid #d9c9c4;
  background: #ffffff;
  color: #462137;
  cursor: pointer;
  transition: all 150ms ease;
  flex: 1 1 90px;
  min-width: 80px;
}

.fabric-pill:hover:not(.fabric-pill--selected) {
  border-color: #865172;
  background: #faf7f5;
}

.fabric-pill--selected {
  background: #865172 !important;
  border-color: #865172 !important;
  color: #ffffff !important;
  box-shadow: 0 2px 8px rgba(134, 81, 114, 0.25);
}

.fabric-pill__title {
  font-size: 0.85rem;
  font-weight: 700;
  line-height: 1.2;
}

.fabric-pill__price {
  font-size: 0.72rem;
  opacity: 0.85;
  margin-top: 2px;
}

.fabric-pill--selected .fabric-pill__price {
  color: #ffffff;
  opacity: 0.9;
}
</style>
