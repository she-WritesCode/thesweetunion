<script setup lang="ts">
import { ref, computed } from "vue";
import { useDyrectedCollection, useDyrectedGlobal } from "#imports";
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

const couplesPhoto = computed(() => siteSettings.value?.rsvpTeaserImage?.url || null);

const mapCategory = (cat: string) => {
  if (!cat) return "Other";
  if (cat === "kitchen") return "Kitchen";
  if (cat === "travel") return "Travel";
  if (cat === "home") return "Home Essentials";
  if (cat === "cash-fund") return "Cash Fund";
  return cat.charAt(0).toUpperCase() + cat.slice(1);
};

const localItems = ref<WishlistItem[]>([]);

const items = computed<WishlistItem[]>(() => {
  const visibleDocs = (wishlistData.value?.docs || []).filter((doc: any) => !doc.isHidden);
  if (visibleDocs.length > 0) {
    return visibleDocs.map((doc: any) => {
      // Check if localItems has updated stats for this item
      const local = localItems.value.find((li) => li.id === doc.id);
      return {
        id: doc.id,
        name: doc.name,
        description: doc.description,
        imageUrl: doc.image?.url || "/images/placeholder.png",
        link: doc.link,
        price: doc.price,
        maxQuantity: doc.maxQuantity,
        reservedCount: (local?.reservedCount ?? doc.reservedCount) || 0,
        category: mapCategory(doc.category),
        fundingType: doc.fundingType || "fixed",
        amountRaised: (local?.amountRaised ?? doc.amountRaised) || 0,
        contributorCount: (local?.contributorCount ?? doc.contributorCount) || 0,
        bankDetails:
          doc.fundingType === "crowdfund"
            ? {
                bankName: (siteSettings.value as any)?.bankName || "Guaranty Trust Bank (GTBank)",
                accountNumber: (siteSettings.value as any)?.accountNumber || "0123456789",
                accountName: (siteSettings.value as any)?.accountName || "Uche & Adun Wedding Account",
                note: "Please transfer your contribution directly using your banking app, then confirm details below.",
              }
            : undefined,
      };
    });
  }
  return localItems.value;
});

const selectedCategory = ref<string>("All");
const priceSort = ref<"none" | "low-to-high" | "high-to-low">("none");

// Modal Reservation State
const activeItem = ref<WishlistItem | null>(null);
const modalStep = ref<number>(1);
const isAnonymous = ref(false);
const guestName = ref("");
const guestEmail = ref("");
const guestPhone = ref("");
const guestMessage = ref("");
const senderName = ref("");
const successItem = ref<WishlistItem | null>(null);
const successContributionAmount = ref<number>(0);

// Copy to Clipboard Utility
const isCopied = ref(false);
const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(() => {
    isCopied.value = true;
    setTimeout(() => {
      isCopied.value = false;
    }, 2000);
  });
};

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
  if (activeItem.value?.fundingType === "crowdfund") {
    if (modalStep.value < 3) modalStep.value++;
  } else {
    if (modalStep.value < 2) modalStep.value++;
  }
};

const prevStep = () => {
  if (modalStep.value > 1) modalStep.value--;
};

const isCrowdfundGoalReached = computed(() => {
  if (!activeItem.value) return false;
  return (
    activeItem.value.fundingType === "crowdfund" &&
    activeItem.value.price > 0 &&
    (activeItem.value.amountRaised ?? 0) >= activeItem.value.price
  );
});

const categories = computed<string[]>(() => {
  return ["All", ...(Array.from(new Set(items.value.map((item: WishlistItem) => item.category))) as string[])];
});

const handleReserveClick = (item: WishlistItem) => {
  activeItem.value = item;
  modalStep.value = 1;
  isAnonymous.value = false;
  guestName.value = "";
  guestEmail.value = "";
  guestPhone.value = "";
  guestMessage.value = "";
  senderName.value = "";
  selectedAmount.value = SUGGESTED_AMOUNTS[0];
  useCustomAmount.value = false;
  customAmount.value = "";
};

const handleConfirmReservation = async () => {
  if (!activeItem.value) return;

  try {
    const isDbItem = wishlistData.value?.docs?.some((d: any) => d.id === activeItem.value?.id);
    if (isDbItem) {
      const formattedMessage =
        guestMessage.value.trim() +
        (senderName.value.trim() ? `\n\n(Transfer sender name: ${senderName.value.trim()})` : "");

      const result: any = await $fetch("/api/reservations/create", {
        method: "POST",
        body: {
          itemId: activeItem.value.id,
          guestName: guestName.value.trim() || "Anonymous Guest",
          guestEmail: guestEmail.value.trim(),
          guestPhone: guestPhone.value.trim(),
          message: formattedMessage,
          contributionAmount: activeItem.value.fundingType === "crowdfund" ? effectiveAmount.value : undefined,
          isAnonymous: isAnonymous.value,
        },
      });
      successContributionAmount.value = effectiveAmount.value;

      // Update local items with fresh stats from backend
      if (result?.stats) {
        localItems.value = localItems.value.map((item) => {
          if (item.id === activeItem.value?.id) {
            return {
              ...item,
              amountRaised: result.stats.amountRaised,
              contributorCount: result.stats.contributorCount,
              reservedCount: result.stats.reservedCount,
            };
          }
          return item;
        });
      }

      await refresh();
    } else {
      localItems.value = localItems.value.map((item) => {
        if (item.id === activeItem.value?.id && item.reservedCount < item.maxQuantity) {
          return { ...item, reservedCount: item.reservedCount + 1 };
        }
        return item;
      });
    }

    if (activeItem.value?.link) {
      window.open(activeItem.value.link, "_blank", "noopener,noreferrer");
    }

    successItem.value = activeItem.value;
    activeItem.value = null;
    modalStep.value = 1;
  } catch (err: any) {
    const msg = err.data?.message || err.message || "An error occurred while confirming reservation.";
    alert(msg);
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
                      :class="item.price > 0 && (item.amountRaised ?? 0) >= item.price ? 'bg-emerald-600' : 'bg-amber-gold'"
                      :style="{ width: `${progressPercent(item)}%` }"
                    />
                  </div>
                  <p class="text-xs text-deep-espresso/60 font-body">
                    <template v-if="item.price > 0">
                      ₦{{ (item.amountRaised ?? 0).toLocaleString("en-US") }} of ₦{{
                        item.price.toLocaleString("en-US")
                      }}
                      raised
                    </template>
                    <template v-else> ₦{{ (item.amountRaised ?? 0).toLocaleString("en-US") }} raised </template>
                    · {{ item.contributorCount ?? 0 }}
                    {{ (item.contributorCount ?? 0) === 1 ? "contributor" : "contributors" }}
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
        <div class="modal-step-indicator">
          <template v-for="s in activeItem.fundingType === 'crowdfund' ? [1, 2, 3] : [1, 2]" :key="s">
            <div class="modal-step-dot" :class="modalStep >= s ? 'modal-step-dot--active' : 'modal-step-dot--inactive'">
              {{ s }}
            </div>
            <div
              v-if="s < (activeItem.fundingType === 'crowdfund' ? 3 : 2)"
              class="modal-step-line"
              :class="modalStep > s ? 'modal-step-line--active' : 'modal-step-line--inactive'"
            />
          </template>
        </div>

        <div class="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <!-- ═══════════════ CROWDFUND STEP 1: Amount & Anonymity ═══════════════ -->
          <div v-show="activeItem.fundingType === 'crowdfund' && modalStep === 1" class="modal-step">
            <div class="modal-item-header">
              <span class="font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase block">
                Contribute to Cash Fund
              </span>
              <h3 class="font-heading text-xl font-bold text-deep-espresso leading-snug">
                {{ activeItem.name }}
              </h3>
              <p class="font-body text-xs text-deep-espresso/60">
                Funding Goal: ₦{{ activeItem.price.toLocaleString("en-US") }} · {{ activeItem.category }}
              </p>
            </div>

            <!-- Crowdfund Progress Bar -->
            <div class="space-y-2 mb-4">
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
                ₦{{ (activeItem.amountRaised ?? 0).toLocaleString("en-US") }} of ₦{{
                  activeItem.price.toLocaleString("en-US")
                }}
                raised · {{ activeItem.contributorCount ?? 0 }}
                {{ (activeItem.contributorCount ?? 0) === 1 ? "contributor" : "contributors" }}
              </p>
            </div>

            <!-- Crowdfund Amount Selector -->
            <div class="space-y-2 mb-4">
              <label class="input-label"
                >How much would you love to contribute? (Min ₦{{ MIN_CONTRIBUTION.toLocaleString() }})</label
              >
              <div class="modal-amount-grid">
                <button
                  v-for="amount in SUGGESTED_AMOUNTS"
                  :key="amount"
                  type="button"
                  @click="
                    selectedAmount = amount;
                    useCustomAmount = false;
                  "
                  class="modal-amount-btn"
                  :class="
                    !useCustomAmount && selectedAmount === amount
                      ? 'modal-amount-btn--active'
                      : 'modal-amount-btn--inactive'
                  "
                >
                  ₦{{ amount.toLocaleString("en-US") }}
                </button>
              </div>
              <div class="modal-custom-row">
                <button
                  type="button"
                  @click="useCustomAmount = true"
                  class="modal-amount-btn"
                  :class="useCustomAmount ? 'modal-amount-btn--active' : 'modal-amount-btn--inactive'"
                >
                  Custom Amount
                </button>
                <input
                  v-if="useCustomAmount"
                  v-model="customAmount"
                  type="number"
                  :min="MIN_CONTRIBUTION"
                  class="input-field flex-1"
                  placeholder="How much would you love to contribute?"
                />
              </div>
              <p v-if="!isAmountValid" class="modal-validation">
                Minimum contribution is ₦{{ MIN_CONTRIBUTION.toLocaleString() }}
              </p>
            </div>

            <!-- Anonymous Toggle -->
            <div class="flex items-center justify-center">
              <button
                type="button"
                @click="isAnonymous = !isAnonymous"
                class="modal-anon-btn"
                :class="isAnonymous ? 'modal-anon-btn--active' : 'modal-anon-btn--inactive'"
              >
                {{ isAnonymous ? "✓ Send Anonymously" : "Send Anonymously" }}
              </button>
            </div>

            <button @click="nextStep" class="w-full btn-primary mt-4" :disabled="!isAmountValid">Continue →</button>
          </div>

          <!-- ═══════════════ PERSONAL DETAILS (Step 2 for Crowdfund, Step 1 for Fixed) ═══════════════ -->
          <div
            v-show="
              (activeItem.fundingType === 'crowdfund' && modalStep === 2) ||
              (activeItem.fundingType !== 'crowdfund' && modalStep === 1)
            "
            class="modal-step"
          >
            <div class="modal-item-header">
              <span class="font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase block">
                {{ activeItem.fundingType === "crowdfund" ? "Your Details" : "Gifting: " + activeItem.name }}
              </span>
              <p class="font-body text-xs text-deep-espresso/60" v-if="activeItem.fundingType !== 'crowdfund'">
                Please tell us who is reserving this gift so we can say thank you.
              </p>
            </div>

            <!-- Responsive Two-Column Grid for Inputs -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="input-label">What should we call you? (Required)</label>
                <input type="text" v-model="guestName" class="input-field" placeholder="Enter your name" />
              </div>

              <div class="space-y-1">
                <PhoneInput v-model="guestPhone" placeholder="What's your WhatsApp number?" label="WhatsApp Number" />
              </div>

              <div class="space-y-1 md:col-span-2">
                <label class="input-label">Where should we send your confirmation email?</label>
                <input type="email" v-model="guestEmail" class="input-field" placeholder="name@example.com" />
              </div>

              <div class="space-y-1 md:col-span-2">
                <label class="input-label">Would you like to leave a message for us?</label>
                <textarea
                  v-model="guestMessage"
                  rows="3"
                  class="input-field resize-none"
                  placeholder="Leave a lovely note..."
                />
              </div>


            </div>

            <p v-if="!isContactValid" class="modal-validation text-center">
              Please provide at least a phone number or email address.
            </p>

            <div class="modal-nav-row mt-4">
              <button v-if="modalStep > 1" @click="prevStep" class="modal-nav-back">← Back</button>
              <button @click="nextStep" class="flex-1 btn-primary" :disabled="!isContactValid || !guestName.trim()">
                Continue →
              </button>
            </div>
          </div>

          <!-- ═══════════════ REVIEW & CONFIRM (Step 3 for Crowdfund, Step 2 for Fixed) ═══════════════ -->
          <div
            v-show="
              (activeItem.fundingType === 'crowdfund' && modalStep === 3) ||
              (activeItem.fundingType !== 'crowdfund' && modalStep === 2)
            "
            class="modal-step"
          >
            <div class="modal-item-header">
              <span class="font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase block">
                Review & Confirm
              </span>
            </div>

            <!-- Responsive Two-Column Grid for Review Details -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Left side: Summary details -->
              <div class="space-y-4">
                <div class="modal-summary-card">
                  <div class="modal-summary-row">
                    <span class="modal-summary-label">Gift</span>
                    <span class="font-semibold text-right">{{ activeItem.name }}</span>
                  </div>
                  <div v-if="activeItem.fundingType === 'crowdfund'" class="modal-summary-row">
                    <span class="modal-summary-label">Contribution</span>
                    <span class="font-bold text-deep-terracotta">₦{{ effectiveAmount.toLocaleString("en-US") }}</span>
                  </div>
                  <div class="modal-summary-row">
                    <span class="modal-summary-label">From</span>
                    <span class="font-semibold">{{ isAnonymous ? "Anonymous" : guestName }}</span>
                  </div>
                </div>

                <!-- Store Purchase Instructions -->
                <div v-if="activeItem.fundingType !== 'crowdfund' && activeItem.link" class="p-4 rounded-xl border border-amber-gold/15 bg-amber-gold/5 space-y-2 text-left">
                  <p class="font-semibold text-deep-terracotta text-xs uppercase tracking-wider">Store Purchase Instructions</p>
                  <p class="font-body text-xs text-deep-espresso/80 leading-relaxed">
                    Please buy this gift from the online store. Click the button below to buy, then confirm below to lock the reservation.
                  </p>
                  <a :href="activeItem.link" target="_blank" rel="noopener noreferrer" class="btn-secondary w-full block text-center py-2 font-bold uppercase tracking-wider text-[11px] mt-2">
                    Buy from Store ↗
                  </a>
                </div>

                <!-- Drop-off instructions for Fixed/Physical gifts -->
                <div
                  v-if="activeItem.fundingType !== 'crowdfund'"
                  class="p-4 rounded-xl border border-amber-gold/15 bg-soft-pearl/50 space-y-2 text-center md:text-left"
                >
                  <p class="font-semibold text-deep-terracotta text-xs uppercase tracking-wider">Drop-off & Delivery</p>
                  <p class="font-body text-xs text-deep-espresso/80 leading-relaxed">
                    You can bring this gift with you to the wedding, drop it off, or coordinate with us directly. Since
                    we're all family and friends here, just let us know what works best for you!
                  </p>
                </div>

                <!-- Sender Name field to match bank alerts -->
                <div v-if="activeItem.fundingType === 'crowdfund'" class="space-y-1">
                  <label class="input-label text-[11px]">What name will appear on the transfer alert? (Optional)</label>
                  <input type="text" v-model="senderName" class="input-field" placeholder="Sender Account Name" />
                </div>
              </div>

              <!-- Right side: Payment / Transfer info (only for Crowdfund) -->
              <div v-if="activeItem.fundingType === 'crowdfund'" class="space-y-4">
                <div v-if="activeItem.bankDetails" class="bank-details-card">
                  <p class="font-semibold text-deep-terracotta uppercase tracking-wide">
                    Please make your bank transfer to:
                  </p>
                  <div class="grid grid-cols-3 gap-y-1.5 font-body">
                    <span class="text-deep-espresso/60 text-xs">Bank:</span>
                    <span class="col-span-2 font-semibold text-xs">{{ activeItem.bankDetails.bankName }}</span>

                    <span class="text-deep-espresso/60 text-xs">Account #:</span>
                    <span class="col-span-2 font-mono font-bold text-sm text-deep-terracotta flex items-center gap-2">
                      <span class="select-all">{{ activeItem.bankDetails.accountNumber }}</span>
                      <button
                        type="button"
                        @click="copyToClipboard(activeItem.bankDetails.accountNumber)"
                        class="px-2 py-0.5 text-[9px] uppercase bg-deep-terracotta/10 text-deep-terracotta hover:bg-deep-terracotta hover:text-white rounded-md transition-all font-sans cursor-pointer"
                      >
                        {{ isCopied ? "Copied!" : "Copy" }}
                      </button>
                    </span>

                    <span class="text-deep-espresso/60 text-xs">Name:</span>
                    <span class="col-span-2 font-semibold text-xs">{{ activeItem.bankDetails.accountName }}</span>
                  </div>
                  <p
                    v-if="activeItem.bankDetails.note"
                    class="text-[10px] text-deep-espresso/70 italic pt-1 border-t border-amber-gold/5"
                  >
                    {{ activeItem.bankDetails.note }}
                  </p>
                </div>
              </div>
            </div>

            <div class="modal-nav-row mt-6">
              <button @click="prevStep" class="modal-nav-back">← Back</button>
              <button
                @click="handleConfirmReservation"
                class="flex-1 btn-primary"
                :disabled="activeItem.fundingType === 'crowdfund' && !isAmountValid"
              >
                {{ activeItem.fundingType === "crowdfund" ? `I've made the transfer!` : "I'm gifting this!" }}
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
            You have successfully contributed
            <strong>₦{{ successContributionAmount.toLocaleString("en-US") }}</strong> to the
            <strong>{{ successItem.name }}</strong>. We will look out for the transfer.<span v-if="guestEmail"> We have sent the details of the account number to your email.</span>
          </template>
          <template v-else>
            You have successfully reserved the <strong>{{ successItem.name }}</strong> registry gift item.<span v-if="guestEmail"> We have sent a confirmation details card to your email.</span>
            <div v-if="successItem.link" class="mt-4 p-4 rounded-xl border border-amber-gold/15 bg-amber-gold/5 text-center">
              <p class="text-xs text-deep-espresso/80 mb-2 font-body">If you haven't bought it yet, please purchase the item from the store using the link below:</p>
              <a :href="successItem.link" target="_blank" rel="noopener noreferrer" class="btn-secondary w-full block text-center py-2 font-bold uppercase tracking-wider text-[11px]">
                Buy from Store ↗
              </a>
            </div>
          </template>
        </p>
        <button @click="successItem = null" class="btn-primary">Back to Registry</button>
      </div>
    </div>
  </div>
</template>
