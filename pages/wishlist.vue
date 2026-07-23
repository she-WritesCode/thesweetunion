<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useDyrectedCollection, useDyrectedGlobal } from "#imports";

const SUGGESTED_AMOUNTS = [5000, 10000, 25000, 50000, 100000];
const MIN_CONTRIBUTION = 5000;

import type { Wishlist_items } from "~/dyrected-types";

interface WishlistItem extends Omit<
  Wishlist_items,
  | "image"
  | "link"
  | "category"
  | "description"
  | "reservedCount"
  | "amountRaised"
  | "contributorCount"
  | "createdAt"
  | "updatedAt"
> {
  imageUrl: string;
  image?: Wishlist_items["image"];
  link?: string;
  category: string;
  description: string;
  reservedCount: number;
  amountRaised: number;
  contributorCount: number;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    note?: string;
  };
}

const {
  data: wishlistData,
  pending: wishlistPending,
  refresh,
} = await useDyrectedCollection("wishlist_items", {
  limit: 100,
});
const { data: siteSettings, pending: siteSettingsPending } = await useDyrectedGlobal("site_settings");

onMounted(async () => {
  try {
    await refresh();
  } catch (e) {
    console.error("Failed to refresh wishlist items on mount:", e);
  }
});

const couplesPhoto = computed(() => {
  const img = siteSettings.value?.rsvpTeaserImage as any;
  return typeof img === "object" && img !== null ? img.url : img || null;
});

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
  const docs = wishlistData.value?.docs || [];
  if (docs.length === 0) return localItems.value;

  const bankDetailsObj = {
    bankName: (siteSettings.value as any)?.bankName || "Guaranty Trust Bank (GTBank)",
    accountNumber: (siteSettings.value as any)?.accountNumber || "0123456789",
    accountName: (siteSettings.value as any)?.accountName || "Uche & Adun Wedding Account",
    noteFixed: "Please transfer the equivalent amount or your support directly using your banking app.",
    noteCrowdfund: "Please transfer your contribution directly using your banking app, then confirm details below.",
  };

  const result: WishlistItem[] = [];
  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i] as any;
    if (doc.isHidden) continue;

    const local = localItems.value.find((li) => li.id === doc.id);
    const imgUrl =
      typeof doc.image === "object" && doc.image !== null
        ? doc.image.url
        : typeof doc.image === "string"
          ? doc.image
          : "/images/placeholder.png";
    const isCrowdfund = doc.fundingType === "crowdfund";

    result.push({
      id: doc.id,
      name: doc.name,
      description: doc.description || "",
      imageUrl: imgUrl,
      image: doc.image,
      link: typeof doc.link === "object" && doc.link !== null ? (doc.link as any).url : doc.link,
      price: doc.price,
      maxQuantity: doc.maxQuantity,
      reservedCount: (local?.reservedCount ?? doc.reservedCount) || 0,
      category: mapCategory(doc.category),
      fundingType: doc.fundingType || "fixed",
      amountRaised: (local?.amountRaised ?? doc.amountRaised) || 0,
      contributorCount: (local?.contributorCount ?? doc.contributorCount) || 0,
      bankDetails: {
        bankName: bankDetailsObj.bankName,
        accountNumber: bankDetailsObj.accountNumber,
        accountName: bankDetailsObj.accountName,
        note: isCrowdfund ? bankDetailsObj.noteCrowdfund : bankDetailsObj.noteFixed,
      },
    });
  }
  return result;
});

const isInitialLoading = computed(() => {
  return (wishlistPending.value || siteSettingsPending.value) && !wishlistData.value;
});

const selectedCategory = ref<string>("All");
const priceSort = ref<"none" | "low-to-high" | "high-to-low">("none");

// Modal Reservation State
const activeItem = ref<WishlistItem | null>(null);
const selectedDetailItem = ref<WishlistItem | null>(null);
const isSubmitting = ref(false);
const guestName = ref("");
const fulfillmentMode = ref<"sent_money" | "bring_to_wedding" | "remind_later" | null>(null);
const reminderDate = ref("");
const reminderChannel = ref<"whatsapp" | "email">("whatsapp");
const reminderContact = ref("");
const paymentOption = ref<"bank_transfer" | "purchase_link" | "bring_to_wedding" | null>(null);
const successItem = ref<WishlistItem | null>(null);
const successContributionAmount = ref<number>(0);
const successMode = ref<"reserve-now" | "reserve-later" | "contribute-now" | "remind-later" | null>(null);

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
  if (!activeItem.value || activeItem.value.fundingType !== "crowdfund" || fulfillmentMode.value !== "sent_money")
    return true;
  return effectiveAmount.value >= MIN_CONTRIBUTION;
});

const isFormValid = computed(() => {
  if (!activeItem.value || !fulfillmentMode.value) return false;
  if (!guestName.value.trim()) return false;
  if (fulfillmentMode.value === "sent_money" && activeItem.value.fundingType === "crowdfund" && !isAmountValid.value) {
    return false;
  }
  if (fulfillmentMode.value === "remind_later") {
    if (!reminderDate.value.trim() || !reminderContact.value.trim()) return false;
  }
  return true;
});

const todayIso = computed(() => new Date().toISOString().slice(0, 10));
const formattedReminderDate = computed(() => {
  if (!reminderDate.value) return "";
  return new Date(`${reminderDate.value}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
});

const activeAmountValue = computed(() => {
  if (!activeItem.value) return 0;
  return activeItem.value.fundingType === "crowdfund" ? effectiveAmount.value : activeItem.value.price;
});

const finalCtaLabel = computed(() => {
  if (isSubmitting.value) return "Processing...";
  if (fulfillmentMode.value === "sent_money") {
    return activeItem.value?.fundingType === "crowdfund" ? "Confirm Contribution" : "Confirm Payment";
  }
  if (fulfillmentMode.value === "bring_to_wedding") {
    return "Reserve & Bring to Wedding";
  }
  if (fulfillmentMode.value === "remind_later") {
    return "Save Reminder & Reserve";
  }
  return "Confirm Reservation";
});

const categories = computed<string[]>(() => {
  return ["All", ...(Array.from(new Set(items.value.map((item: WishlistItem) => item.category))) as string[])];
});

const handleReserveClick = (item: WishlistItem | null) => {
  if (!item) return;
  activeItem.value = item;
  guestName.value = "";
  fulfillmentMode.value = null;
  reminderDate.value = "";
  reminderChannel.value = "whatsapp";
  reminderContact.value = "";
  paymentOption.value = item.link ? null : "bank_transfer";
  selectedAmount.value = SUGGESTED_AMOUNTS[0];
  useCustomAmount.value = false;
  customAmount.value = "";
};

const handleDrawerAction = (item: WishlistItem | null) => {
  if (!item) return;
  const targetItem = item;
  handleReserveClick(targetItem);
  selectedDetailItem.value = null;
};

const handleConfirmReservation = async () => {
  if (!activeItem.value || isSubmitting.value || !fulfillmentMode.value || !isFormValid.value) return;

  const currentMode = fulfillmentMode.value;
  const currentTiming = currentMode === "sent_money" ? "now" : "later";
  const currentOption =
    currentMode === "bring_to_wedding"
      ? "bring_to_wedding"
      : paymentOption.value || (activeItem.value.link ? undefined : "bank_transfer");

  const intent =
    activeItem.value.fundingType === "crowdfund"
      ? currentMode === "sent_money"
        ? "contribute"
        : "reminder"
      : "reserve";

  isSubmitting.value = true;
  try {
    const isDbItem = wishlistData.value?.docs?.some((d: any) => d.id === activeItem.value?.id);
    if (isDbItem) {
      const result: any = await $fetch("/api/reservations/create", {
        method: "POST",
        body: {
          itemId: activeItem.value.id,
          guestName: guestName.value.trim(),
          paymentTiming: currentTiming,
          intent,
          contributionAmount:
            activeItem.value.fundingType === "crowdfund" && currentMode === "sent_money"
              ? effectiveAmount.value
              : undefined,
          reminderAt:
            currentMode === "remind_later" && reminderDate.value
              ? new Date(`${reminderDate.value}T12:00:00`).toISOString()
              : undefined,
          reminderChannel: currentMode === "remind_later" ? reminderChannel.value : undefined,
          reminderContact: currentMode === "remind_later" ? reminderContact.value.trim() : undefined,
          paymentOption: currentOption,
        },
      });
      successContributionAmount.value = currentMode === "sent_money" ? effectiveAmount.value : 0;

      // Update local items with fresh stats from backend
      if (result?.stats && wishlistData.value?.docs) {
        const docIndex = wishlistData.value.docs.findIndex((d: any) => d.id === activeItem.value?.id);
        if (docIndex !== -1) {
          wishlistData.value.docs[docIndex].amountRaised = result.stats.amountRaised;
          wishlistData.value.docs[docIndex].contributorCount = result.stats.contributorCount;
          wishlistData.value.docs[docIndex].reservedCount = result.stats.reservedCount;
        }
      }

      await refresh();
    } else {
      // Fallback local update if not database connected
      localItems.value = localItems.value.map((item) => {
        if (
          item.id === activeItem.value?.id &&
          item.fundingType === "fixed" &&
          item.reservedCount < item.maxQuantity &&
          intent === "reserve"
        ) {
          return { ...item, reservedCount: item.reservedCount + 1 };
        }
        return item;
      });
    }

    successMode.value =
      activeItem.value.fundingType === "crowdfund"
        ? currentMode === "sent_money"
          ? "contribute-now"
          : "remind-later"
        : currentMode === "sent_money"
          ? "reserve-now"
          : "reserve-later";

    if (activeItem.value?.link && currentMode === "sent_money" && currentOption === "purchase_link") {
      window.open(activeItem.value.link, "_blank", "noopener,noreferrer");
    }

    successItem.value = activeItem.value;
    activeItem.value = null;
  } catch (err: any) {
    const msg = err.data?.message || err.message || "An error occurred while confirming reservation.";
    alert(msg);
  } finally {
    isSubmitting.value = false;
  }
};

const filteredAndSortedItems = computed<WishlistItem[]>(() => {
  let list = [...items.value].filter(
    (item) => selectedCategory.value === "All" || item.category === selectedCategory.value,
  );

  if (priceSort.value === "low-to-high") {
    list.sort((a, b) => a.price - b.price);
  } else if (priceSort.value === "high-to-low") {
    list.sort((a, b) => b.price - a.price);
  } else {
    list.sort((a, b) => a.name.localeCompare(b.name));
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
        <div
          v-if="!isInitialLoading"
          class="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-amber-gold/10 pb-6"
        >
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

        <!-- Loading state -->
        <div v-if="isInitialLoading" class="space-y-6">
          <div class="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-amber-gold/10 pb-6">
            <div class="flex flex-wrap gap-2 justify-center">
              <div
                v-for="n in 4"
                :key="`filter-skeleton-${n}`"
                class="h-9 w-24 rounded-full bg-deep-espresso/8 animate-pulse"
              />
            </div>
            <div class="h-10 w-40 rounded-xl bg-deep-espresso/8 animate-pulse" />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
            <div
              v-for="n in 8"
              :key="`wishlist-skeleton-${n}`"
              class="linen-card rounded-2xl border border-amber-gold/10 overflow-hidden shadow-md"
            >
              <div class="aspect-4/3 w-full bg-deep-espresso/8 animate-pulse" />
              <div class="p-6 space-y-4">
                <div class="space-y-2">
                  <div class="h-3 w-20 rounded-full bg-deep-espresso/8 animate-pulse" />
                  <div class="h-6 w-3/4 rounded-full bg-deep-espresso/8 animate-pulse" />
                  <div class="h-4 w-full rounded-full bg-deep-espresso/8 animate-pulse" />
                  <div class="h-4 w-5/6 rounded-full bg-deep-espresso/8 animate-pulse" />
                </div>
                <div class="h-10 w-full rounded-xl bg-deep-espresso/8 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-else-if="filteredAndSortedItems.length === 0"
          class="linen-card col-span-full py-24 px-8 rounded-2xl border border-amber-gold/15 text-center space-y-4"
        >
          <div
            class="w-16 h-16 mx-auto mb-3 text-amber-gold flex items-center justify-center bg-amber-gold/10 rounded-2xl border border-amber-gold/20 p-3.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-9 h-9"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H4.5a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m-9 0h18v3H3v-3Z"
              />
            </svg>
          </div>
          <h3 class="text-xl font-bold text-deep-espresso font-display-cinzel">Registry Coming Soon</h3>
          <p class="font-body text-deep-espresso/60 text-sm max-w-sm mx-auto leading-relaxed">
            Our gift registry is being curated with love. Check back soon — we can't wait to share it with you!
          </p>
        </div>

        <!-- Registry Item Cards Grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
          <div
            v-for="item in filteredAndSortedItems"
            :key="item.id"
            @click="selectedDetailItem = item"
            class="linen-card rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-md group cursor-pointer"
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
              class="relative aspect-4/3 w-full bg-deep-espresso/5 border-b border-amber-gold/10 overflow-hidden select-none"
            >
              <DyrectedMedia
                v-if="item.imageUrl && item.imageUrl !== '/images/placeholder.png'"
                :media="(item.image as any) || item.imageUrl"
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
                <p class="font-body text-sm text-deep-espresso/70 leading-relaxed line-clamp-2">
                  {{ item.description }}
                </p>

                <!-- Crowdfund Progress -->
                <div v-if="item.fundingType === 'crowdfund'" class="space-y-1.5">
                  <div class="w-full h-2 bg-deep-espresso/10 rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all duration-500"
                      :class="
                        item.price > 0 && (item.amountRaised ?? 0) >= item.price ? 'bg-emerald-600' : 'bg-amber-gold'
                      "
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
                  @click.stop
                >
                  Fund Fully Raised
                </button>
                <button
                  v-else-if="item.fundingType === 'crowdfund'"
                  @click.stop="handleReserveClick(item)"
                  class="flex-1 btn-secondary"
                >
                  See Contribution Options
                </button>
                <button
                  v-else-if="item.maxQuantity - item.reservedCount > 0"
                  @click.stop="handleReserveClick(item)"
                  class="flex-1 btn-primary"
                >
                  See Gift Options
                </button>
                <button
                  v-else
                  disabled
                  class="flex-1 px-4 py-2 rounded-xl bg-deep-espresso/10 text-deep-espresso/40 font-semibold text-xs uppercase tracking-wider text-center cursor-not-allowed"
                  @click.stop
                >
                  Fully Reserved
                </button>
                <a
                  v-if="item.link"
                  :href="item.link"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="px-4 py-2 rounded-xl border border-amber-gold/20 text-deep-espresso font-semibold text-xs uppercase tracking-wider hover:bg-soft-pearl transition-all duration-300 text-center"
                  @click.stop
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

    <!-- Reservation Full-Page View -->
    <div
      v-if="activeItem"
      class="fixed inset-0 z-50 bg-warm-cream overflow-y-auto min-h-screen flex flex-col transition-all duration-300 select-text"
    >
      <!-- Top Sticky Navigation Bar -->
      <header class="sticky top-0 z-40 bg-warm-cream/95 backdrop-blur-md border-b border-amber-gold/20 px-6 py-4">
        <div class="max-w-4xl mx-auto flex items-center justify-between">
          <button
            @click="activeItem = null"
            class="flex items-center gap-2 text-deep-espresso hover:text-deep-terracotta font-semibold text-xs uppercase tracking-widest transition-colors cursor-pointer"
          >
            <span>←</span> Back to Registry
          </button>

          <span class="font-heading text-xs font-bold text-amber-gold tracking-[0.25em] uppercase hidden sm:block">
            Uche & Adun Registry
          </span>

          <button
            @click="activeItem = null"
            class="w-9 h-9 rounded-full bg-deep-espresso/5 hover:bg-deep-espresso/10 text-deep-espresso flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
            title="Close"
          >
            ✕
          </button>
        </div>
      </header>

      <!-- Full Page Body Content -->
      <main class="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 md:py-12 space-y-8">
        <!-- Item Header Card -->
        <div class="linen-card p-6 sm:p-8 rounded-3xl border border-amber-gold/20 shadow-md overflow-hidden">
          <div class="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-center">
            <!-- Side Item Image -->
            <div
              v-if="activeItem.imageUrl && activeItem.imageUrl !== '/images/placeholder.png'"
              class="md:col-span-5 relative aspect-3/4 w-full bg-deep-espresso/5 border border-amber-gold/15 rounded-2xl overflow-hidden shadow-xs select-none"
            >
              <DyrectedMedia
                :media="(activeItem.image as any) || activeItem.imageUrl"
                :alt="activeItem.name"
                class="w-full h-full object-cover"
              />
            </div>

            <!-- Item Text Details -->
            <div
              class="space-y-4"
              :class="
                activeItem.imageUrl && activeItem.imageUrl !== '/images/placeholder.png'
                  ? 'md:col-span-7'
                  : 'md:col-span-12'
              "
            >
              <div
                class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-gold/15 pb-4"
              >
                <span class="font-heading text-xs font-bold text-amber-gold tracking-[0.25em] uppercase">
                  {{ activeItem.category }}
                </span>
                <span class="text-xs uppercase tracking-wider text-deep-espresso/60 font-semibold">
                  {{ activeItem.fundingType === "crowdfund" ? "Cash Contribution" : "Gift Item" }}
                </span>
              </div>

              <h2 class="font-heading text-xl md:text-2xl font-bold text-deep-espresso leading-tight">
                {{ activeItem.name }}
              </h2>

              <div class="flex flex-wrap items-baseline gap-3 pt-1">
                <template v-if="activeItem.fundingType === 'crowdfund'">
                  <span class="font-heading text-2xl font-bold text-deep-espresso">
                    ₦{{ activeItem.price > 0 ? activeItem.price.toLocaleString("en-US") + " goal" : "Open cash fund" }}
                  </span>
                  <span
                    class="text-xs font-semibold uppercase tracking-wider text-deep-terracotta bg-deep-terracotta/10 px-3 py-1 rounded-full"
                  >
                    ₦{{ (activeItem.amountRaised ?? 0).toLocaleString("en-US") }} raised so far
                  </span>
                </template>
                <template v-else>
                  <span class="font-heading text-2xl md:text-3xl font-bold text-deep-espresso">
                    ₦{{ activeItem.price.toLocaleString("en-US") }}
                  </span>
                </template>
              </div>

              <p v-if="activeItem.description" class="font-body text-sm text-deep-espresso/75 leading-relaxed pt-1">
                {{ activeItem.description }}
              </p>
            </div>
          </div>
        </div>

        <!-- Crowdfund Amount Selection Card -->
        <div
          v-if="activeItem.fundingType === 'crowdfund'"
          class="linen-card p-6 sm:p-8 rounded-3xl border border-amber-gold/20 bg-gradient-to-br from-[#fffdf9] via-[#f7f0ea] to-[#f2e4da] shadow-md space-y-6"
        >
          <div class="space-y-3">
            <label class="input-label text-xs uppercase tracking-wider text-deep-espresso/70 font-semibold block">
              Choose contribution amount:
            </label>
            <div class="modal-amount-grid">
              <button
                v-for="amount in [...SUGGESTED_AMOUNTS, ...(activeItem.price > 0 ? [activeItem.price] : [])]"
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
                placeholder="Enter custom amount"
              />
            </div>
            <p v-if="!isAmountValid" class="modal-validation">
              Minimum contribution is ₦{{ MIN_CONTRIBUTION.toLocaleString() }}
            </p>
          </div>

          <div class="pt-4 border-t border-amber-gold/15 flex justify-between items-center">
            <span class="text-xs uppercase tracking-[0.2em] text-deep-espresso/60 font-semibold"
              >Your Contribution:</span
            >
            <span class="font-heading text-3xl sm:text-4xl font-bold text-deep-espresso"
              >₦{{ activeAmountValue.toLocaleString("en-US") }}</span
            >
          </div>
        </div>

        <!-- Dedicated Payment Details Card -->
        <div
          v-if="activeItem.bankDetails"
          class="linen-card p-6 sm:p-8 rounded-3xl border border-amber-gold/20 shadow-md space-y-4"
        >
          <div class="flex items-center justify-between border-b border-amber-gold/15 pb-3">
            <p class="font-semibold text-deep-terracotta text-xs uppercase tracking-[0.2em]">
              {{ activeItem.fundingType === "crowdfund" ? "Bank Transfer Account" : "Payment Account Details" }}
            </p>
            <span class="text-[10px] uppercase tracking-wider text-deep-espresso/50 font-bold">GTBank Direct</span>
          </div>

          <div class="rounded-2xl border border-amber-gold/15 bg-white/95 p-5 space-y-4 shadow-xs">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-body">
              <div>
                <span class="text-xs uppercase tracking-wider text-deep-espresso/50 font-semibold block"
                  >Bank Name</span
                >
                <span class="font-semibold text-deep-espresso text-base">{{ activeItem.bankDetails.bankName }}</span>
              </div>
              <div>
                <span class="text-xs uppercase tracking-wider text-deep-espresso/50 font-semibold block"
                  >Account Name</span
                >
                <span class="font-semibold text-deep-espresso text-base">{{ activeItem.bankDetails.accountName }}</span>
              </div>
            </div>

            <div
              class="border-t border-amber-gold/10 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <p class="text-[10px] uppercase tracking-[0.2em] text-deep-espresso/45 font-semibold">Account Number</p>
                <p class="mt-1 font-mono text-3xl font-bold tracking-widest text-deep-terracotta select-all">
                  {{ activeItem.bankDetails.accountNumber }}
                </p>
              </div>
              <button
                type="button"
                @click="copyToClipboard(activeItem.bankDetails.accountNumber)"
                class="px-5 py-3 rounded-full bg-deep-terracotta text-white text-xs font-bold uppercase tracking-[0.2em] hover:bg-deep-espresso transition-all shadow-xs cursor-pointer shrink-0 self-start sm:self-auto"
              >
                {{ isCopied ? "✓ Copied" : "Copy Account Number" }}
              </button>
            </div>
          </div>

          <div v-if="activeItem.link" class="pt-2">
            <p class="text-xs text-deep-espresso/60 mb-2 font-body">Or buy directly from store:</p>
            <a
              :href="activeItem.link"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-secondary w-full block text-center py-3 font-bold uppercase tracking-wider text-xs"
            >
              View Store Item ↗
            </a>
          </div>
        </div>

        <!-- 3 Fulfillment Options Card -->
        <div class="linen-card p-6 sm:p-8 rounded-3xl border border-amber-gold/20 shadow-md space-y-6">
          <div class="space-y-1">
            <h3 class="font-heading text-xl font-bold text-deep-espresso">Fulfillment Options</h3>
            <p class="text-xs text-deep-espresso/65 font-body">How would you like to fulfill or confirm this gift?</p>
          </div>

          <div class="space-y-3">
            <!-- Option 1: Sent Money -->
            <button
              type="button"
              @click="fulfillmentMode = 'sent_money'"
              class="w-full p-5 rounded-2xl border transition-all text-left flex items-start gap-4 cursor-pointer"
              :class="
                fulfillmentMode === 'sent_money'
                  ? 'border-amber-gold bg-amber-gold/15 shadow-sm'
                  : 'border-amber-gold/20 bg-white/70 hover:bg-white'
              "
            >
              <div
                class="mt-0.5 text-deep-terracotta shrink-0 p-2.5 rounded-xl bg-amber-gold/10 border border-amber-gold/20"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="w-6 h-6"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z"
                  />
                </svg>
              </div>
              <div class="flex-1">
                <p class="font-bold text-base text-deep-espresso">1. I have sent the money</p>
                <p class="text-xs text-deep-espresso/65 font-body mt-0.5">
                  I have made a direct bank transfer using the account details above.
                </p>
              </div>
              <div
                class="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5"
                :class="
                  fulfillmentMode === 'sent_money'
                    ? 'border-deep-terracotta bg-deep-terracotta text-white'
                    : 'border-amber-gold/40'
                "
              >
                <span v-if="fulfillmentMode === 'sent_money'" class="text-xs font-bold">✓</span>
              </div>
            </button>

            <!-- Option 2: Bring Gift to Wedding -->
            <button
              type="button"
              @click="fulfillmentMode = 'bring_to_wedding'"
              class="w-full p-5 rounded-2xl border transition-all text-left flex items-start gap-4 cursor-pointer"
              :class="
                fulfillmentMode === 'bring_to_wedding'
                  ? 'border-amber-gold bg-amber-gold/15 shadow-sm'
                  : 'border-amber-gold/20 bg-white/70 hover:bg-white'
              "
            >
              <div
                class="mt-0.5 text-deep-terracotta shrink-0 p-2.5 rounded-xl bg-amber-gold/10 border border-amber-gold/20"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="w-6 h-6"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H4.5a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m-9 0h18v3H3v-3Z"
                  />
                </svg>
              </div>
              <div class="flex-1">
                <p class="font-bold text-base text-deep-espresso">2. I’ll be bringing the gift to the wedding</p>
                <p class="text-xs text-deep-espresso/65 font-body mt-0.5">
                  Reserve this gift now and hand it to us in person on our big day.
                </p>
              </div>
              <div
                class="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5"
                :class="
                  fulfillmentMode === 'bring_to_wedding'
                    ? 'border-deep-terracotta bg-deep-terracotta text-white'
                    : 'border-amber-gold/40'
                "
              >
                <span v-if="fulfillmentMode === 'bring_to_wedding'" class="text-xs font-bold">✓</span>
              </div>
            </button>

            <!-- Option 3: Reserve & Remind Later -->
            <button
              type="button"
              @click="fulfillmentMode = 'remind_later'"
              class="w-full p-5 rounded-2xl border transition-all text-left flex items-start gap-4 cursor-pointer"
              :class="
                fulfillmentMode === 'remind_later'
                  ? 'border-amber-gold bg-amber-gold/15 shadow-sm'
                  : 'border-amber-gold/20 bg-white/70 hover:bg-white'
              "
            >
              <div
                class="mt-0.5 text-deep-terracotta shrink-0 p-2.5 rounded-xl bg-amber-gold/10 border border-amber-gold/20"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="w-6 h-6"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
              </div>
              <div class="flex-1">
                <p class="font-bold text-base text-deep-espresso">
                  3. I’d like to reserve this gift and be reminded to pay/fulfill it
                </p>
                <p class="text-xs text-deep-espresso/65 font-body mt-0.5">
                  Hold this gift for me now and send me a friendly reminder to pay.
                </p>
              </div>
              <div
                class="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5"
                :class="
                  fulfillmentMode === 'remind_later'
                    ? 'border-deep-terracotta bg-deep-terracotta text-white'
                    : 'border-amber-gold/40'
                "
              >
                <span v-if="fulfillmentMode === 'remind_later'" class="text-xs font-bold">✓</span>
              </div>
            </button>
          </div>

          <!-- Dynamic Form Inputs -->
          <div v-if="fulfillmentMode" class="space-y-6 pt-4 border-t border-amber-gold/15 animate-fadeIn">
            <div class="space-y-1.5">
              <label class="input-label font-semibold text-deep-espresso text-xs uppercase tracking-wider block"
                >Your Name *</label
              >
              <input
                type="text"
                v-model="guestName"
                class="input-field py-3 text-base"
                placeholder="Enter your full name"
              />
            </div>

            <!-- Additional Reminder Details for Option 3 -->
            <div
              v-if="fulfillmentMode === 'remind_later'"
              class="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 rounded-2xl bg-amber-gold/5 border border-amber-gold/15 space-y-3 md:space-y-0"
            >
              <div class="space-y-1.5">
                <label class="input-label">Reminder Date *</label>
                <input type="date" v-model="reminderDate" :min="todayIso" class="input-field py-2.5" />
              </div>

              <div class="space-y-1.5">
                <label class="input-label">Reminder Channel *</label>
                <select v-model="reminderChannel" class="select-dropdown w-full py-2.5 text-sm">
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                </select>
              </div>

              <div class="space-y-1.5 md:col-span-2">
                <label class="input-label">
                  {{ reminderChannel === "whatsapp" ? "WhatsApp Contact *" : "Email Contact *" }}
                </label>
                <input
                  v-model="reminderContact"
                  :type="reminderChannel === 'email' ? 'email' : 'text'"
                  class="input-field py-2.5"
                  :placeholder="reminderChannel === 'email' ? 'name@example.com' : '0800 000 0000'"
                />
              </div>
            </div>

            <!-- Submit Button -->
            <button
              @click="handleConfirmReservation"
              class="w-full btn-primary py-4 font-bold tracking-wider text-base cursor-pointer flex items-center justify-center gap-2 shadow-md"
              :disabled="!isFormValid || isSubmitting"
            >
              <span
                v-if="isSubmitting"
                class="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full"
              ></span>
              <span>{{ finalCtaLabel }}</span>
            </button>
          </div>
        </div>
      </main>
    </div>

    <!-- Success Modal -->
    <div
      v-if="successItem"
      class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in animate-duration-200"
    >
      <div
        class="linen-card w-full max-w-md p-8 rounded-2xl border border-amber-gold/20 shadow-2xl text-center relative animate-scale-up animate-duration-200"
      >
        <div
          class="w-16 h-16 mx-auto mb-4 text-emerald-600 flex items-center justify-center bg-emerald-50 rounded-full border border-emerald-200 shadow-xs"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-9 h-9"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        </div>
        <h3 class="font-heading text-2xl font-bold text-deep-espresso mb-2">Thank You So Much!</h3>
        <p class="font-body text-deep-espresso/80 text-sm leading-relaxed mb-6">
          <template v-if="successMode === 'contribute-now'">
            You have successfully contributed
            <strong>₦{{ successContributionAmount.toLocaleString("en-US") }}</strong> to the
            <strong>{{ successItem.name }}</strong
            >. We will look out for the transfer.
          </template>
          <template v-else-if="successMode === 'reserve-later'">
            We have reserved <strong>{{ successItem.name }}</strong> for you and scheduled your reminder for
            <strong>{{ formattedReminderDate }}</strong
            >.
          </template>
          <template v-else-if="successMode === 'remind-later'">
            We have saved your reminder for <strong>{{ successItem.name }}</strong> on
            <strong>{{ formattedReminderDate }}</strong
            >.
          </template>
          <template v-else>
            You have successfully claimed <strong>{{ successItem.name }}</strong> for the registry.
            <div
              v-if="successItem.link && paymentOption === 'purchase_link'"
              class="mt-4 p-4 rounded-xl border border-amber-gold/15 bg-amber-gold/5 text-center"
            >
              <p class="text-xs text-deep-espresso/80 mb-2 font-body">
                If you have not opened the store yet, you can still purchase the item using the link below:
              </p>
              <a
                :href="successItem.link"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-secondary w-full block text-center py-2 font-bold uppercase tracking-wider text-[11px]"
              >
                Buy from Store ↗
              </a>
            </div>
          </template>
        </p>
        <button @click="successItem = null" class="btn-primary">Back to Registry</button>
      </div>
    </div>

    <!-- Detail Side Drawer -->
    <Transition
      enter-active-class="transition-opacity duration-300 ease-out"
      leave-active-class="transition-opacity duration-200 ease-in"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="selectedDetailItem"
        class="fixed inset-0 bg-black/60 z-40 backdrop-blur-xs flex justify-end"
        @click="selectedDetailItem = null"
      >
        <Transition
          enter-active-class="transition-transform duration-300 ease-out"
          leave-active-class="transition-transform duration-200 ease-in"
          enter-from-class="translate-x-full"
          leave-to-class="translate-x-full"
          appear
        >
          <div
            class="w-full max-w-md md:max-w-lg bg-warm-cream border-l border-amber-gold/20 h-full shadow-2xl flex flex-col justify-between overflow-hidden"
            @click.stop
          >
            <!-- Drawer Header / Image -->
            <div class="relative overflow-y-auto flex-1 select-text">
              <button
                @click="selectedDetailItem = null"
                class="absolute top-4 right-4 z-10 text-deep-espresso/60 hover:text-deep-espresso text-xl font-sans bg-warm-cream/80 backdrop-blur-xs w-8 h-8 flex items-center justify-center rounded-full hover:bg-soft-pearl shadow-sm transition-all duration-200"
              >
                ✕
              </button>

              <div class="aspect-4/3 w-full bg-deep-espresso/5 border-b border-amber-gold/10 overflow-hidden relative">
                <DyrectedMedia
                  v-if="selectedDetailItem.imageUrl && selectedDetailItem.imageUrl !== '/images/placeholder.png'"
                  :media="(selectedDetailItem.image as any) || selectedDetailItem.imageUrl"
                  :alt="selectedDetailItem.name"
                  class="w-full h-full object-cover"
                />
                <div
                  v-else
                  class="absolute inset-0 flex items-center justify-center text-deep-espresso/20 text-xs font-semibold tracking-wider font-display-cinzel"
                >
                  No Image Placeholder
                </div>
              </div>

              <!-- Drawer Body Content -->
              <div class="p-6 md:p-8 space-y-6">
                <div class="space-y-2">
                  <span class="text-[10px] md:text-xs uppercase tracking-widest font-semibold text-amber-gold block">
                    {{ selectedDetailItem.category }}
                  </span>
                  <h2 class="font-heading text-2xl md:text-3xl font-bold text-deep-espresso leading-snug">
                    {{ selectedDetailItem.name }}
                  </h2>
                  <p class="text-lg md:text-xl font-bold text-deep-espresso font-body">
                    {{
                      selectedDetailItem.fundingType === "crowdfund" && selectedDetailItem.price > 0 ? "Goal: " : ""
                    }}₦{{ selectedDetailItem.price.toLocaleString("en-US") }}
                  </p>
                </div>

                <!-- Crowdfund Progress in Drawer -->
                <div
                  v-if="selectedDetailItem.fundingType === 'crowdfund'"
                  class="space-y-2.5 p-4 rounded-2xl border border-amber-gold/10 bg-soft-pearl/30"
                >
                  <div class="w-full h-2.5 bg-deep-espresso/10 rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all duration-500"
                      :class="
                        selectedDetailItem.price > 0 &&
                        (selectedDetailItem.amountRaised ?? 0) >= selectedDetailItem.price
                          ? 'bg-emerald-600'
                          : 'bg-amber-gold'
                      "
                      :style="{ width: `${progressPercent(selectedDetailItem)}%` }"
                    />
                  </div>
                  <p class="text-xs md:text-sm text-deep-espresso/70 font-body">
                    <template v-if="selectedDetailItem.price > 0">
                      <strong>₦{{ (selectedDetailItem.amountRaised ?? 0).toLocaleString("en-US") }}</strong> of ₦{{
                        selectedDetailItem.price.toLocaleString("en-US")
                      }}
                      raised
                    </template>
                    <template v-else>
                      <strong>₦{{ (selectedDetailItem.amountRaised ?? 0).toLocaleString("en-US") }}</strong> raised
                    </template>
                    · {{ selectedDetailItem.contributorCount ?? 0 }}
                    {{ (selectedDetailItem.contributorCount ?? 0) === 1 ? "contributor" : "contributors" }}
                  </p>
                </div>

                <div class="space-y-3">
                  <h4 class="font-heading text-xs font-semibold text-deep-espresso/50 uppercase tracking-wider">
                    Description
                  </h4>
                  <p class="font-body text-base text-deep-espresso/80 leading-relaxed whitespace-pre-line">
                    {{ selectedDetailItem.description }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Drawer Actions -->
            <div class="p-6 md:p-8 bg-soft-pearl/30 border-t border-amber-gold/10 flex items-center gap-3">
              <button
                v-if="
                  selectedDetailItem.fundingType === 'crowdfund' &&
                  selectedDetailItem.price > 0 &&
                  (selectedDetailItem.amountRaised ?? 0) >= selectedDetailItem.price
                "
                disabled
                class="flex-1 px-4 py-3 rounded-xl bg-emerald-600/20 text-emerald-800 font-semibold text-xs uppercase tracking-wider text-center cursor-not-allowed"
              >
                Fund Fully Raised
              </button>
              <button
                v-else-if="selectedDetailItem.fundingType === 'crowdfund'"
                @click="handleDrawerAction(selectedDetailItem)"
                class="flex-1 btn-secondary py-3 text-sm"
              >
                See Contribution Options
              </button>
              <button
                v-else-if="selectedDetailItem.maxQuantity - selectedDetailItem.reservedCount > 0"
                @click="handleDrawerAction(selectedDetailItem)"
                class="flex-1 btn-primary py-3 text-sm"
              >
                See Gift Options
              </button>
              <button
                v-else
                disabled
                class="flex-1 px-4 py-3 rounded-xl bg-deep-espresso/10 text-deep-espresso/40 font-semibold text-xs uppercase tracking-wider text-center cursor-not-allowed"
              >
                Fully Reserved
              </button>
              <a
                v-if="selectedDetailItem.link"
                :href="selectedDetailItem.link"
                target="_blank"
                rel="noopener noreferrer"
                class="px-5 py-3 rounded-xl border border-amber-gold/20 text-deep-espresso font-semibold text-xs uppercase tracking-wider hover:bg-soft-pearl transition-all duration-300 text-center"
              >
                View Link
              </a>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </div>
</template>
