<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { siteConfig } from "~/config/site";
import { useCachedDyrectedGlobal } from "~/composables/useCachedData";
import Navigation from "~/components/Navigation.vue";

const route = useRoute();

// Global settings
const { data: asoebiSettings } = useCachedDyrectedGlobal("asoebi_settings");

const pricePerYard = computed(() => (asoebiSettings.value as any)?.pricePerYard || 10000);
const asoOkeMalePrice = computed(() => (asoebiSettings.value as any)?.asoOkeMalePrice || 15000);
const asoOkeFemalePrice = computed(() => (asoebiSettings.value as any)?.asoOkeFemalePrice || 25000);
const bankName = computed(() => (asoebiSettings.value as any)?.bankName || "Access Bank");
const accountNumber = computed(() => (asoebiSettings.value as any)?.accountNumber || "0123456789");
const accountName = computed(() => (asoebiSettings.value as any)?.accountName || "Adun & Uche Union");
const whatsAppContact = computed(() => (asoebiSettings.value as any)?.whatsAppContact || "+2348000000000");

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

// Helper functions for counters
function selectYards(yards: string) {
  wantsAsoebi.value = true;
  asoebiYards.value = yards;
}

function toggleAsoebi() {
  wantsAsoebi.value = !wantsAsoebi.value;
}

function toggleAsoOke() {
  wantsAsoOke.value = !wantsAsoOke.value;
  if (wantsAsoOke.value && asoOkeMaleQty.value === 0 && asoOkeFemaleQty.value === 0) {
    asoOkeMaleQty.value = 1;
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
      lookupMessage.value = `Record found for ${res.record.leadName}! Your current selection has been pre-filled below.`;
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
  <div class="min-h-screen bg-warm-cream font-serif text-deep-espresso pb-20">
    <Navigation />

    <!-- Hero Header -->
    <header class="pt-28 pb-8 px-6 text-center max-w-4xl mx-auto">
      <p class="text-xs uppercase tracking-widest text-deep-terracotta mb-2 font-sans font-semibold">
        #TheSweetUnion Celebration
      </p>
      <h1 class="text-3xl md:text-5xl font-display-cinzel text-deep-espresso mb-4">
        Aso Ebi & Headwear Selection
      </h1>
      <p class="text-base md:text-lg text-deep-espresso/70 max-w-2xl mx-auto font-light leading-relaxed mb-6">
        Join us in celebrating our traditional union in style! Look up your current selection, make updates, or place a new Aso Ebi order below.
      </p>

      <!-- Disclaimer Banner -->
      <div class="bg-amber-50/90 border border-amber-gold/40 text-amber-950 rounded-2xl p-4 md:p-5 max-w-2xl mx-auto flex items-start gap-3.5 font-sans text-xs md:text-sm text-left shadow-sm">
        <span class="text-xl shrink-0">⚠️</span>
        <div>
          <p class="font-bold uppercase tracking-wider text-[11px] text-amber-900 mb-0.5">Important Disclaimer</p>
          <p class="leading-relaxed">
            Buying or booking Aso Ebi does <strong>not</strong> automatically mean you have RSVP'd for the wedding. Please request your official RSVP invitation link from the bride or groom and submit your RSVP to reserve your seat.
          </p>
        </div>
      </div>
    </header>

    <main class="max-w-4xl mx-auto px-4 md:px-6 space-y-10">

      <!-- Live Pricing & Bank Info Banner -->
      <section class="bg-white/80 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-amber-gold/20 shadow-md">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 class="text-xl font-display-cinzel text-deep-espresso mb-4 flex items-center gap-2">
              <span>✨</span> Pricing & Packages
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
            <p class="text-xs text-deep-espresso/60 font-sans mt-3 italic">
              Proof of payment can be sent on WhatsApp to {{ whatsAppContact }}.
            </p>
          </div>
        </div>
      </section>

      <!-- Quick Lookup Bar -->
      <section class="bg-white/90 rounded-2xl p-6 md:p-8 border border-amber-gold/20 shadow-md">
        <div class="max-w-2xl mx-auto text-center">
          <h2 class="text-lg md:text-xl font-display-cinzel text-deep-espresso mb-2">
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

          <p
            v-if="lookupMessage"
            class="mt-4 text-xs md:text-sm font-sans font-medium px-4 py-2 rounded-lg"
            :class="lookupSuccess ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200'"
          >
            {{ lookupMessage }}
          </p>
        </div>
      </section>

      <!-- Order & Selection Form -->
      <section class="bg-white rounded-2xl p-6 md:p-10 border border-amber-gold/20 shadow-lg">
        <form @submit.prevent="submitAsoebiForm" class="space-y-8">
          <div class="border-b border-amber-gold/15 pb-4">
            <h2 class="text-2xl font-display-cinzel text-deep-espresso">
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

          <!-- Fabric Selection Section -->
          <div class="bg-warm-cream/30 rounded-xl p-6 border border-amber-gold/20 space-y-4">
            <div class="flex items-center justify-between cursor-pointer" @click="toggleAsoebi">
              <div>
                <h3 class="text-base font-semibold text-deep-espresso font-display-cinzel">
                  Aso Ebi Fabric
                </h3>
                <p class="text-xs text-deep-espresso/60 font-sans">
                  High quality lace fabric (₦{{ pricePerYard.toLocaleString() }} per yard)
                </p>
              </div>
              <input
                type="checkbox"
                :checked="wantsAsoebi"
                @change="toggleAsoebi"
                class="w-5 h-5 accent-deep-terracotta cursor-pointer"
              />
            </div>

            <div v-if="wantsAsoebi" class="pt-3 border-t border-amber-gold/10 space-y-3">
              <label class="block text-xs font-sans font-semibold text-deep-espresso/70 uppercase tracking-wider">
                Select Yards
              </label>
              <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <button
                  v-for="y in ['2', '3', '4', '5', '6']"
                  :key="y"
                  type="button"
                  @click="selectYards(y)"
                  class="py-3 px-4 rounded-xl border text-sm font-sans font-medium transition-all text-center cursor-pointer"
                  :class="asoebiYards === y ? 'bg-deep-terracotta text-white border-deep-terracotta shadow' : 'bg-white text-deep-espresso border-amber-gold/30 hover:border-amber-gold'"
                >
                  <div class="font-bold text-base">{{ y }} Yards</div>
                  <div class="text-xs opacity-90">₦{{ (parseInt(y, 10) * pricePerYard).toLocaleString() }}</div>
                </button>
              </div>
            </div>
          </div>

          <!-- Aso Oke Headwear Section -->
          <div class="bg-warm-cream/30 rounded-xl p-6 border border-amber-gold/20 space-y-4">
            <div class="flex items-center justify-between cursor-pointer" @click="toggleAsoOke">
              <div>
                <h3 class="text-base font-semibold text-deep-espresso font-display-cinzel">
                  Aso Oke (Fila & Gele)
                </h3>
                <p class="text-xs text-deep-espresso/60 font-sans">
                  Matching traditional caps for men and autogele/ipele for women
                </p>
              </div>
              <input
                type="checkbox"
                :checked="wantsAsoOke"
                @change="toggleAsoOke"
                class="w-5 h-5 accent-deep-terracotta cursor-pointer"
              />
            </div>

            <div v-if="wantsAsoOke" class="pt-4 border-t border-amber-gold/10 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <!-- Male Cap Counter -->
              <div class="bg-white p-4 rounded-xl border border-amber-gold/20 flex items-center justify-between">
                <div>
                  <p class="text-sm font-semibold text-deep-espresso font-sans">Male Fila (Cap)</p>
                  <p class="text-xs text-deep-terracotta font-semibold font-sans">₦{{ asoOkeMalePrice.toLocaleString() }} each</p>
                </div>
                <div class="flex items-center gap-3">
                  <button
                    type="button"
                    @click="decMaleAsoOke"
                    class="w-8 h-8 rounded-lg bg-warm-cream text-deep-espresso font-bold flex items-center justify-center hover:bg-amber-gold/20 cursor-pointer"
                  >
                    -
                  </button>
                  <span class="w-6 text-center font-bold font-sans text-sm">{{ asoOkeMaleQty }}</span>
                  <button
                    type="button"
                    @click="incMaleAsoOke"
                    class="w-8 h-8 rounded-lg bg-warm-cream text-deep-espresso font-bold flex items-center justify-center hover:bg-amber-gold/20 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <!-- Female Gele Counter -->
              <div class="bg-white p-4 rounded-xl border border-amber-gold/20 flex items-center justify-between">
                <div>
                  <p class="text-sm font-semibold text-deep-espresso font-sans">Female Gele & Ipele</p>
                  <p class="text-xs text-deep-terracotta font-semibold font-sans">₦{{ asoOkeFemalePrice.toLocaleString() }} each</p>
                </div>
                <div class="flex items-center gap-3">
                  <button
                    type="button"
                    @click="decFemaleAsoOke"
                    class="w-8 h-8 rounded-lg bg-warm-cream text-deep-espresso font-bold flex items-center justify-center hover:bg-amber-gold/20 cursor-pointer"
                  >
                    -
                  </button>
                  <span class="w-6 text-center font-bold font-sans text-sm">{{ asoOkeFemaleQty }}</span>
                  <button
                    type="button"
                    @click="incFemaleAsoOke"
                    class="w-8 h-8 rounded-lg bg-warm-cream text-deep-espresso font-bold flex items-center justify-center hover:bg-amber-gold/20 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Total Calculation Card -->
          <div class="bg-deep-espresso text-warm-cream p-6 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <p class="text-xs uppercase tracking-widest font-sans font-medium text-warm-cream/70">
                Order Grand Total
              </p>
              <p class="text-2xl sm:text-3xl font-bold font-mono text-amber-gold">
                ₦{{ totalCost.toLocaleString() }}
              </p>
            </div>
            <div class="text-xs text-right text-warm-cream/70 font-sans">
              <span v-if="wantsAsoebi">{{ asoebiYards }} Yards Fabric</span>
              <span v-if="wantsAsoebi && wantsAsoOke"> + </span>
              <span v-if="wantsAsoOke">
                {{ asoOkeMaleQty > 0 ? `${asoOkeMaleQty} Fila` : '' }}
                {{ asoOkeMaleQty > 0 && asoOkeFemaleQty > 0 ? ', ' : '' }}
                {{ asoOkeFemaleQty > 0 ? `${asoOkeFemaleQty} Gele` : '' }}
              </span>
            </div>
          </div>

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
            <p v-if="submitError" class="mb-4 text-xs font-sans text-rose-700 bg-rose-50 p-3 rounded-lg border border-rose-200">
              {{ submitError }}
            </p>

            <button
              type="submit"
              :disabled="submitting || totalCost === 0"
              class="w-full py-4 bg-deep-terracotta text-white font-sans text-sm uppercase tracking-widest font-bold rounded-xl hover:bg-deep-terracotta/90 disabled:opacity-50 shadow-md transition-all cursor-pointer"
            >
              {{ submitting ? "Saving Selection..." : isUpdate ? "Update Selection & Send Receipt" : "Confirm Aso Ebi Order" }}
            </button>
          </div>
        </form>
      </section>
    </main>

    <!-- Success Confirmation Modal -->
    <div
      v-if="submitSuccess"
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div class="bg-white rounded-2xl max-w-lg w-full p-6 md:p-8 border border-amber-gold/30 shadow-2xl space-y-6">
        <div class="text-center">
          <div class="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl font-bold">
            ✓
          </div>
          <h3 class="text-2xl font-display-cinzel text-deep-espresso">
            {{ isUpdate ? "Selection Updated!" : "Order Recorded!" }}
          </h3>
          <p class="text-sm text-deep-espresso/70 font-sans mt-1">
            Thank you, {{ leadName }}. We have sent a confirmation email to <strong>{{ leadEmail }}</strong>.
          </p>
        </div>

        <div class="bg-warm-cream/50 p-4 rounded-xl border border-amber-gold/20 text-sm font-sans space-y-2">
          <div class="flex justify-between">
            <span class="text-deep-espresso/70">Total Amount:</span>
            <span class="font-bold font-mono text-deep-terracotta">₦{{ totalCost.toLocaleString() }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-deep-espresso/70">Bank:</span>
            <span class="font-semibold">{{ bankName }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-deep-espresso/70">Account Number:</span>
            <span class="font-mono font-semibold">{{ accountNumber }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-deep-espresso/70">Account Name:</span>
            <span class="font-semibold">{{ accountName }}</span>
          </div>
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
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99 0-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
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
    </div>
  </div>
</template>
