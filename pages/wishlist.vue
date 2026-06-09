<script setup lang="ts">
import { ref, computed } from "vue";
import { useDyrectedClient, useDyrectedCollection, useDyrectedGlobal } from "#imports";
import PhoneInput from "~/components/PhoneInput.vue";

const SUGGESTED_AMOUNTS = [5000, 10000, 25000, 50000, 100000];
const MIN_CONTRIBUTION = 5000;

interface WishlistItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  link?: string;
  price: number;
  maxQuantity: number;
  reservedCount: number;
  category: string;
  fundingType?: "fixed" | "crowdfund";
  amountRaised?: number;
  contributorCount?: number;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    note?: string;
  };
}

const { data: wishlistData, refresh } = await useDyrectedCollection("wishlist_items", { limit: 100 });
const { data: siteSettings } = await useDyrectedGlobal("site_settings");
const client = useDyrectedClient();

const couplesPhoto = computed(() => siteSettings.value?.rsvpTeaserImage?.url || null);

if (process.env.NODE_ENV !== "production" || (import.meta as any).client) {
  console.log("[wishlist] data:", JSON.stringify(wishlistData.value, null, 2));
}

const mapCategory = (cat: string) => {
  if (!cat) return "Other";
  if (cat === "kitchen") return "Kitchen";
  if (cat === "travel") return "Travel";
  if (cat === "home") return "Home Essentials";
  if (cat === "cash-fund") return "Cash Fund";
  return cat.charAt(0).toUpperCase() + cat.slice(1);
};

const localItems = ref<WishlistItem[]>([]);

const items = computed(() => {
  const visibleDocs = (wishlistData.value?.docs || []).filter((doc: any) => !doc.isHidden);
  if (visibleDocs.length > 0) {
    return visibleDocs.map((doc: any) => ({
      id: doc.id,
      name: doc.name,
      description: doc.description,
      imageUrl: doc.image?.url || "/images/placeholder.png",
      link: doc.link,
      price: doc.price,
      maxQuantity: doc.maxQuantity,
      reservedCount: doc.reservedCount || 0,
      category: mapCategory(doc.category),
      fundingType: doc.fundingType || "fixed",
      amountRaised: doc.amountRaised || 0,
      contributorCount: doc.contributorCount || 0,
      bankDetails:
        doc.fundingType === "crowdfund"
          ? {
              bankName: (siteSettings.value as any)?.bankName || "Guaranty Trust Bank (GTBank)",
              accountNumber: (siteSettings.value as any)?.accountNumber || "0123456789",
              accountName: (siteSettings.value as any)?.accountName || "Uche & Adun Wedding Account",
              note: "Please transfer your contribution directly using your banking app, then confirm details below.",
            }
          : undefined,
    }));
  }
  return localItems.value;
});

const selectedCategory = ref<string>("All");
const priceSort = ref<"none" | "low-to-high" | "high-to-low">("none");

// Modal Reservation State
const activeItem = ref<WishlistItem | null>(null);
const modalStep = ref<1 | 2 | 3>(1);
const isAnonymous = ref(false);
const guestName = ref("");
const guestEmail = ref("");
const guestPhone = ref("");
const guestMessage = ref("");
const successItem = ref<WishlistItem | null>(null);
const successContributionAmount = ref<number>(0);

// Crowdfund amount selection
const selectedAmount = ref<number>(SUGGESTED_AMOUNTS[0]);
const useCustomAmount = ref(false);
const customAmount = ref<string>("");

const effectiveAmount = computed(() => {
  if (useCustomAmount.value) {
    return parseInt(customAmount.value) || 0;
  }
  return selectedAmount.value;
});

const isAmountValid = computed(() => {
  if (!activeItem.value?.fundingType || activeItem.value.fundingType !== "crowdfund") return true;
  return effectiveAmount.value >= MIN_CONTRIBUTION;
});

const isContactValid = computed(() => {
  return guestPhone.value.trim() !== "" || guestEmail.value.trim() !== "";
});

const nextStep = () => {
  if (modalStep.value === 1) {
    if (isAnonymous.value) {
      modalStep.value = 3;
    } else {
      modalStep.value = 2;
    }
  } else if (modalStep.value === 2) {
    modalStep.value = 3;
  }
};

const prevStep = () => {
  if (modalStep.value === 3) {
    modalStep.value = isAnonymous.value ? 1 : 2;
  } else if (modalStep.value === 2) {
    modalStep.value = 1;
  }
};

const isCrowdfundGoalReached = computed(() => {
  if (!activeItem.value) return false;
  return activeItem.value.fundingType === "crowdfund" && activeItem.value.price > 0 && (activeItem.value.amountRaised ?? 0) >= activeItem.value.price;
});

const categories = computed(() => {
  return ["All", ...Array.from(new Set(items.value.map((item: WishlistItem) => item.category)))];
});

const handleReserveClick = (item: WishlistItem) => {
  activeItem.value = item;
  modalStep.value = 1;
  isAnonymous.value = false;
  guestName.value = "";
  guestEmail.value = "";
  guestPhone.value = "";
  guestMessage.value = "";
  selectedAmount.value = SUGGESTED_AMOUNTS[0];
  useCustomAmount.value = false;
  customAmount.value = "";
};

const handleConfirmReservation = async () => {
  if (!activeItem.value) return;

  try {
    const isDbItem = wishlistData.value?.docs?.some((d: any) => d.id === activeItem.value?.id);
    if (isDbItem) {
      const payload: any = {
        item: activeItem.value.id,
        guestName: isAnonymous.value ? "Anonymous" : guestName.value,
        guestEmail: guestEmail.value,
        guestPhone: guestPhone.value,
        message: guestMessage.value,
      };

      if (activeItem.value.fundingType === "crowdfund") {
        payload.contributionAmount = effectiveAmount.value;
      }

      await client.collection("reservations").create(payload);
      successContributionAmount.value = effectiveAmount.value;
      await refresh();
    } else {
      localItems.value = localItems.value.map((item) => {
        if (item.id === activeItem.value?.id && item.reservedCount < item.maxQuantity) {
          return { ...item, reservedCount: item.reservedCount + 1 };
        }
        return item;
      });
    }

    successItem.value = activeItem.value;
    activeItem.value = null;
    modalStep.value = 1;
  } catch (err: any) {
    alert(err.message || "An error occurred while confirming reservation.");
  }
};

const filteredAndSortedItems = computed(() => {
  let list = [...items.value].filter(
    (item) => selectedCategory.value === "All" || item.category === selectedCategory.value,
  );

  if (priceSort.value === "low-to-high") {
    list.sort((a, b) => a.price - b.price);
  } else if (priceSort.value === "high-to-low") {
    list.sort((a, b) => b.price - a.price);
  }

  return list;
});

const progressPercent = (item: WishlistItem) => {
  if (item.fundingType !== "crowdfund" || item.price <= 0) return 0;
  return Math.min(100, Math.round(((item.amountRaised ?? 0) / item.price) * 100));
};
</script>

<template>
  <div class="min-h-screen bg-warm-cream text-deep-espresso flex flex-col relative select-text">
    <!-- Navigation Bar -->
    <Navigation />

    <!-- Hero Header -->
    <section class="pt-32 pb-16 px-6 paper-texture border-b border-amber-gold/10 text-center relative overflow-hidden">
      <div class="max-w-3xl mx-auto space-y-4!">
        <span class="font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase block">
          Gift Registry
        </span>
        <h1 class="heading2-big md:text-6xl font-bold text-deep-espresso font-display-cinzel">Support Our Union</h1>
        <div class="flex flex-col items-center">
          <p class="font-body text-deep-espresso/70 text-lg leading-relaxed max-w-xl mx-auto">
            Your presence, love, and prayers are all we could ask for. If you wish to bless our home as we build our
            life together in Lagos, here is our registry.
          </p>
        </div>
      </div>
    </section>

    <!-- Grid, Filters and Controls -->
    <main class="flex-1 paper-texture py-12 px-6">
      <div class="max-w-7xl mx-auto space-y-8">
        <!-- Controls Panel -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-amber-gold/10 pb-6">
          <!-- Filter buttons -->
          <div class="flex flex-wrap gap-2 justify-center">
            <button
              v-for="cat in categories"
              :key="cat"
              @click="selectedCategory = cat"
              class="filter-badge"
              :class="selectedCategory === cat ? 'filter-badge--active' : 'filter-badge--inactive'"
            >
              {{ cat }}
            </button>
          </div>

          <!-- Sorting controls -->
          <div class="flex items-center gap-2">
            <span class="text-xs uppercase tracking-wider font-semibold text-deep-espresso/60"> Sort Price: </span>
            <select v-model="priceSort" class="select-dropdown">
              <option value="none">Default</option>
              <option value="low-to-high">Low to High</option>
              <option value="high-to-low">High to Low</option>
            </select>
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-if="filteredAndSortedItems.length === 0"
          class="linen-card col-span-full py-24 px-8 rounded-2xl border border-amber-gold/15 text-center space-y-4"
        >
          <div class="text-5xl mb-2">🎁</div>
          <h3 class="text-xl font-bold text-deep-espresso font-display-cinzel">Registry Coming Soon</h3>
          <p class="font-body text-deep-espresso/60 text-sm max-w-sm mx-auto leading-relaxed">
            Our gift registry is being curated with love. Check back soon — we can't wait to share it with you!
          </p>
        </div>

        <!-- Registry Item Cards Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div
            v-for="item in filteredAndSortedItems"
            :key="item.id"
            class="linen-card rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-md group"
            :class="
              item.fundingType === 'crowdfund'
                ? 'hover:-translate-y-1 hover:shadow-lg border-amber-gold/15'
                : item.maxQuantity - item.reservedCount > 0
                  ? 'hover:-translate-y-1 hover:shadow-lg border-amber-gold/15'
                  : 'opacity-75 border-amber-gold/10 grayscale-15'
            "
          >
            <!-- Item Image -->
            <div
              class="relative aspect-[4/3] w-full bg-deep-espresso/5 border-b border-amber-gold/10 overflow-hidden select-none"
            >
              <img
                v-if="item.imageUrl && item.imageUrl !== '/images/placeholder.png'"
                :src="item.imageUrl"
                :alt="item.name"
                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div
                v-else
                class="absolute inset-0 flex items-center justify-center text-deep-espresso/20 text-xs font-semibold tracking-wider font-display-cinzel"
              >
                No Image Placeholder
              </div>
              <!-- Badge Indicator -->
              <div class="absolute top-4 right-4 z-10">
                <span
                  v-if="item.fundingType === 'crowdfund' && item.price > 0 && (item.amountRaised ?? 0) >= item.price"
                  class="bg-emerald-950/80 border border-emerald-500/30 text-emerald-200 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full backdrop-blur-xs"
                >
                  Fund Fully Raised
                </span>
                <span
                  v-else-if="item.fundingType === 'crowdfund'"
                  class="bg-amber-950/80 border border-amber-500/30 text-amber-200 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full backdrop-blur-xs"
                >
                  {{ item.price > 0 ? "Crowdfund" : "Open Fund" }}
                </span>
                <span
                  v-else-if="item.maxQuantity - item.reservedCount <= 0"
                  class="bg-red-950/80 border border-red-500/30 text-red-200 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full backdrop-blur-xs"
                >
                  Fully Claimed
                </span>
                <span
                  v-else-if="item.reservedCount > 0"
                  class="bg-amber-950/80 border border-amber-500/30 text-amber-200 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full backdrop-blur-xs"
                >
                  {{ item.maxQuantity - item.reservedCount }} Left
                </span>
                <span
                  v-else
                  class="bg-emerald-950/80 border border-emerald-500/30 text-emerald-200 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full backdrop-blur-xs"
                >
                  Available
                </span>
              </div>
            </div>

            <!-- Body Content -->
            <div class="p-6 flex-1 flex flex-col justify-between gap-4">
              <div class="space-y-2">
                <div class="flex items-start justify-between gap-2">
                  <span class="text-[10px] uppercase tracking-wider font-semibold text-amber-gold/80 block">
                    {{ item.category }}
                  </span>
                  <span class="text-sm font-bold text-deep-espresso font-body">
                    {{ item.fundingType === "crowdfund" && item.price > 0 ? "Goal: " : "" }}₦{{
                      item.price.toLocaleString("en-US")
                    }}
                  </span>
                </div>
                <h3
                  class="font-heading text-lg font-bold text-deep-espresso leading-snug group-hover:text-deep-terracotta transition-colors"
                >
                  {{ item.name }}
                </h3>
                <p class="font-body text-sm text-deep-espresso/70 leading-relaxed">
                  {{ item.description }}
                </p>

                <!-- Crowdfund Progress -->
                <div v-if="item.fundingType === 'crowdfund'" class="space-y-1.5">
                  <div class="w-full h-2 bg-deep-espresso/10 rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all duration-500"
                      :class="
                        item.price > 0 && item.amountRaised >= item.price
                          ? 'bg-emerald-600'
                          : 'bg-amber-gold'
                      "
                      :style="{ width: `${progressPercent(item)}%` }"
                    />
                  </div>
                  <p class="text-xs text-deep-espresso/60 font-body">
                    <template v-if="item.price > 0">
                      ₦{{ (item.amountRaised ?? 0).toLocaleString("en-US") }} of ₦{{ item.price.toLocaleString("en-US") }}
                      raised
                    </template>
                    <template v-else>
                      ₦{{ (item.amountRaised ?? 0).toLocaleString("en-US") }} raised
                    </template>
                    · {{ item.contributorCount ?? 0 }} {{ (item.contributorCount ?? 0) === 1 ? "contributor" : "contributors" }}
                  </p>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="flex items-center gap-3 pt-2">
                <button
                  v-if="item.fundingType === 'crowdfund' && item.price > 0 && (item.amountRaised ?? 0) >= item.price"
                  disabled
                  class="flex-1 px-4 py-2 rounded-xl bg-emerald-600/20 text-emerald-800 font-semibold text-xs uppercase tracking-wider text-center cursor-not-allowed"
                >
                  Fund Fully Raised
                </button>
                <button
                  v-else-if="item.fundingType === 'crowdfund'"
                  @click="handleReserveClick(item)"
                  class="flex-1 btn-secondary"
                >
                  Contribute to Fund
                </button>
                <button
                  v-else-if="item.maxQuantity - item.reservedCount > 0"
                  @click="handleReserveClick(item)"
                  class="flex-1 btn-primary"
                >
                  Reserve Gift
                </button>
                <button
                  v-else
                  disabled
                  class="flex-1 px-4 py-2 rounded-xl bg-deep-espresso/10 text-deep-espresso/40 font-semibold text-xs uppercase tracking-wider text-center cursor-not-allowed"
                >
                  Fully Reserved
                </button>
                <a
                  v-if="item.link"
                  :href="item.link"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="px-4 py-2 rounded-xl border border-amber-gold/20 text-deep-espresso font-semibold text-xs uppercase tracking-wider hover:bg-soft-pearl transition-all duration-300 text-center"
                >
                  View Link
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <Footer :couples-photo="couplesPhoto" />

    <!-- Reservation Form Modal -->
    <div v-if="activeItem" class="modal-overlay">
      <div class="modal-content-container linen-card">
        <!-- Close -->
        <button @click="activeItem = null" class="modal-close-btn">✕</button>

        <!-- Step Indicator -->
        <div class="flex items-center justify-center gap-2 mb-6">
          <div
            v-for="s in (isAnonymous ? [1, 3] : [1, 2, 3])"
            :key="s"
            class="flex items-center gap-2"
          >
            <div
              class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
              :class="
                modalStep >= s
                  ? 'bg-deep-terracotta text-white'
                  : 'bg-deep-espresso/10 text-deep-espresso/40'
              "
            >
              {{ s }}
            </div>
            <div
              v-if="s < 3 && !(isAnonymous && s === 1)"
              class="w-8 h-0.5 transition-all duration-300"
              :class="modalStep > s ? 'bg-deep-terracotta' : 'bg-deep-espresso/10'"
            />
          </div>
        </div>

        <div class="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <!-- ═══════════════ STEP 1: Amount & Item Info ═══════════════ -->
          <div v-show="modalStep === 1">
            <!-- Item Header -->
            <div class="text-center space-y-2 mb-4">
              <span class="font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase block">
                {{ activeItem.fundingType === "crowdfund" ? "Contribute to Fund" : "Commit to Gift" }}
              </span>
              <h3 class="font-heading text-xl font-bold text-deep-espresso leading-snug">
                {{ activeItem.name }}
              </h3>
              <p class="font-body text-xs text-deep-espresso/60">
                {{ activeItem.fundingType === "crowdfund" ? "Funding Goal:" : "Approximate Value:" }} ₦{{
                  activeItem.price.toLocaleString("en-US")
                }}
                · {{ activeItem.category }}
              </p>
            </div>

            <!-- Crowdfund Progress Bar -->
            <div v-if="activeItem.fundingType === 'crowdfund'" class="space-y-2 mb-4">
              <div class="w-full h-3 bg-deep-espresso/10 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="
                    activeItem.price > 0 && (activeItem.amountRaised ?? 0) >= activeItem.price
                      ? 'bg-emerald-600'
                      : 'bg-amber-gold'
                  "
                  :style="{ width: `${progressPercent(activeItem)}%` }"
                />
              </div>
              <p class="text-xs text-deep-espresso/60 font-body text-center">
                <template v-if="activeItem.price > 0">
                  ₦{{ (activeItem.amountRaised ?? 0).toLocaleString("en-US") }} of ₦{{
                    activeItem.price.toLocaleString("en-US")
                  }} raised
                </template>
                <template v-else>
                  ₦{{ (activeItem.amountRaised ?? 0).toLocaleString("en-US") }} raised
                </template>
                · {{ activeItem.contributorCount ?? 0 }}
                {{ (activeItem.contributorCount ?? 0) === 1 ? "contributor" : "contributors" }}
              </p>
            </div>

            <!-- Crowdfund Amount Selector -->
            <div v-if="activeItem.fundingType === 'crowdfund'" class="space-y-2 mb-4">
              <label class="input-label"> Amount (Min ₦{{ MIN_CONTRIBUTION.toLocaleString() }}) </label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="amount in SUGGESTED_AMOUNTS"
                  :key="amount"
                  type="button"
                  @click="selectedAmount = amount; useCustomAmount = false"
                  class="px-3 py-2 rounded-xl border text-sm font-semibold transition-all duration-200"
                  :class="
                    !useCustomAmount && selectedAmount === amount
                      ? 'bg-deep-terracotta text-white border-deep-terracotta'
                      : 'bg-white text-deep-espresso border-amber-gold/20 hover:border-amber-gold/40'
                  "
                >
                  ₦{{ amount.toLocaleString("en-US") }}
                </button>
              </div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  @click="useCustomAmount = true"
                  class="px-3 py-2 rounded-xl border text-sm font-semibold transition-all duration-200"
                  :class="
                    useCustomAmount
                      ? 'bg-deep-terracotta text-white border-deep-terracotta'
                      : 'bg-white text-deep-espresso border-amber-gold/20 hover:border-amber-gold/40'
                  "
                >
                  Custom
                </button>
                <input
                  v-if="useCustomAmount"
                  v-model="customAmount"
                  type="number"
                  :min="MIN_CONTRIBUTION"
                  class="input-field flex-1"
                  placeholder="Enter amount"
                />
              </div>
              <p v-if="!isAmountValid" class="text-xs text-red-600">
                Minimum contribution is ₦{{ MIN_CONTRIBUTION.toLocaleString() }}
              </p>
            </div>

            <!-- Anonymous Toggle -->
            <div class="flex items-center justify-center">
              <button
                type="button"
                @click="isAnonymous = !isAnonymous"
                class="px-4 py-2 rounded-full border text-xs font-semibold transition-all duration-200"
                :class="
                  isAnonymous
                    ? 'bg-deep-espresso text-white border-deep-espresso'
                    : 'bg-white text-deep-espresso/60 border-amber-gold/20 hover:border-amber-gold/40'
                "
              >
                {{ isAnonymous ? '✓ Anonymous' : 'Anonymously' }}
              </button>
            </div>

            <button
              @click="nextStep"
              class="w-full btn-primary mt-4"
              :disabled="activeItem.fundingType === 'crowdfund' && !isAmountValid"
            >
              Continue →
            </button>
          </div>

          <!-- ═══════════════ STEP 2: Personal Details ═══════════════ -->
          <div v-show="modalStep === 2" class="space-y-4">
            <div class="space-y-1">
              <label class="input-label"> Your Name (Required) </label>
              <input type="text" v-model="guestName" class="input-field" placeholder="Enter your name" />
            </div>

            <div class="space-y-1">
              <PhoneInput
                v-model="guestPhone"
                placeholder="Enter your phone number"
                label="Phone Number"
              />
            </div>

            <div class="space-y-1">
              <label class="input-label"> Email Address </label>
              <input type="email" v-model="guestEmail" class="input-field" placeholder="name@example.com" />
            </div>

            <p v-if="!isContactValid" class="text-xs text-red-600">
              Please provide at least a phone number or email address.
            </p>

            <div class="space-y-1">
              <label class="input-label"> Message to Couple (Optional) </label>
              <textarea
                v-model="guestMessage"
                rows="3"
                class="input-field resize-none"
                placeholder="Leave a lovely note..."
              />
            </div>

            <div class="flex gap-3 mt-4">
              <button @click="prevStep" class="flex-1 px-4 py-2.5 rounded-xl border border-amber-gold/20 text-deep-espresso font-bold text-xs uppercase tracking-wider hover:bg-soft-pearl transition-all duration-200">
                ← Back
              </button>
              <button
                @click="nextStep"
                class="flex-1 btn-primary"
                :disabled="!isContactValid || !guestName.trim()"
              >
                Continue →
              </button>
            </div>
          </div>

          <!-- ═══════════════ STEP 3: Review & Confirm ═══════════════ -->
          <div v-show="modalStep === 3" class="space-y-4">
            <!-- Summary Card -->
            <div class="bg-soft-pearl/80 p-4 rounded-xl border border-amber-gold/15 space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-deep-espresso/60">Item</span>
                <span class="font-semibold text-right">{{ activeItem.name }}</span>
              </div>
              <div v-if="activeItem.fundingType === 'crowdfund'" class="flex justify-between">
                <span class="text-deep-espresso/60">Amount</span>
                <span class="font-bold text-deep-terracotta">₦{{ effectiveAmount.toLocaleString("en-US") }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-deep-espresso/60">Contributor</span>
                <span class="font-semibold">{{ isAnonymous ? "Anonymous" : guestName }}</span>
              </div>
            </div>

            <!-- Bank Transfer Section -->
            <div v-if="activeItem.fundingType === 'crowdfund' && activeItem.bankDetails" class="bank-details-card">
              <p class="font-semibold text-deep-terracotta uppercase tracking-wide">Bank Transfer Details</p>
              <div class="grid grid-cols-3 gap-y-1 font-body">
                <span class="text-deep-espresso/60">Bank:</span>
                <span class="col-span-2 font-semibold">{{ activeItem.bankDetails.bankName }}</span>

                <span class="text-deep-espresso/60">Account #:</span>
                <span class="col-span-2 font-mono font-bold text-sm text-deep-terracotta select-all">{{
                  activeItem.bankDetails.accountNumber
                }}</span>

                <span class="text-deep-espresso/60">Name:</span>
                <span class="col-span-2 font-semibold">{{ activeItem.bankDetails.accountName }}</span>
              </div>
              <p
                v-if="activeItem.bankDetails.note"
                class="text-[10px] text-deep-espresso/70 italic pt-1 border-t border-amber-gold/5"
              >
                {{ activeItem.bankDetails.note }}
              </p>
            </div>

            <div class="flex gap-3 mt-4">
              <button @click="prevStep" class="flex-1 px-4 py-2.5 rounded-xl border border-amber-gold/20 text-deep-espresso font-bold text-xs uppercase tracking-wider hover:bg-soft-pearl transition-all duration-200">
                ← Back
              </button>
              <button
                @click="handleConfirmReservation"
                class="flex-1 btn-primary"
                :disabled="activeItem.fundingType === 'crowdfund' && !isAmountValid"
              >
                {{
                  activeItem.fundingType === "crowdfund"
                    ? `I have sent ₦${effectiveAmount.toLocaleString("en-US")}`
                    : "I have committed to this gift"
                }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Success Modal -->
    <div
      v-if="successItem"
      class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in animate-duration-200"
    >
      <div
        class="linen-card w-full max-w-md p-8 rounded-2xl border border-amber-gold/20 shadow-2xl text-center relative animate-scale-up animate-duration-200"
      >
        <div class="text-4xl mb-4">🎉</div>
        <h3 class="font-heading text-2xl font-bold text-deep-espresso mb-2">Thank You So Much!</h3>
        <p class="font-body text-deep-espresso/80 text-sm leading-relaxed mb-6">
          <template v-if="successItem.fundingType === 'crowdfund'">
            You have successfully contributed <strong>₦{{ successContributionAmount.toLocaleString("en-US") }}</strong> to
            the <strong>{{ successItem.name }}</strong
            >. Please ensure you complete the bank transfer using the details provided, and we will send a confirmation
            to your email.
          </template>
          <template v-else>
            You have successfully reserved the <strong>{{ successItem.name }}</strong> registry gift item. We have sent
            a confirmation details card to your email.
          </template>
        </p>
        <button @click="successItem = null" class="btn-primary">Back to Registry</button>
      </div>
    </div>
  </div>
</template>
