<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { createClient } from "@dyrected/sdk";
import { useAsyncData, useRuntimeConfig } from "#app";

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
  isCashFund?: boolean;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    note?: string;
  };
}

const runtimeConfig = useRuntimeConfig();
const client = createClient({
  baseUrl: runtimeConfig.public.dyrectedUrl,
  apiKey: runtimeConfig.public.dyrectedApiKey,
});

const { data: wishlistData, refresh } = await useAsyncData("wishlist-items", () =>
  client.collection("wishlist_items").find({
    where: { isHidden: { not_equals: true } },
    limit: 100,
  }),
);

const { data: siteSettings } = await useAsyncData("site-settings", () => client.global("site_settings").get());

const initialItems: WishlistItem[] = [
  {
    id: "1",
    name: "KitchenAid Artisan Stand Mixer",
    description: "For baking delicious desserts and preparing family meals in our kitchen.",
    imageUrl: "/images/mixer.png",
    price: 650000,
    maxQuantity: 1,
    reservedCount: 0,
    category: "Kitchen",
    link: "https://www.kitchenaid.com",
  },
  {
    id: "2",
    name: "Le Creuset Enameled Cast Iron Dutch Oven",
    description: "An essential piece of cookware that will last us a lifetime.",
    imageUrl: "/images/dutch_oven.png",
    price: 500000,
    maxQuantity: 1,
    reservedCount: 1,
    category: "Kitchen",
    link: "https://www.lecreuset.com",
  },
  {
    id: "3",
    name: "Honeymoon Excursion Fund",
    description: "Contribute to our couple hikes, boat cruises, and street food tours.",
    imageUrl: "/images/honeymoon.png",
    price: 250000,
    maxQuantity: 10,
    reservedCount: 4,
    category: "Travel",
    isCashFund: true,
    bankDetails: {
      bankName: "Guaranty Trust Bank (GTBank)",
      accountNumber: "0123456789",
      accountName: "Uche & Adun Wedding Account",
      note: "Please transfer your contribution directly using your banking app, then confirm details below.",
    },
  },
  {
    id: "4",
    name: "Roborock Q7 Max Robot Vacuum",
    description: "Help us keep our new apartment clean with minimal effort.",
    imageUrl: "/images/vacuum.png",
    price: 750000,
    maxQuantity: 1,
    reservedCount: 0,
    category: "Home Essentials",
  },
  {
    id: "5",
    name: "Barista Express Espresso Machine",
    description: "To fuel Uche's daily coffee routine and host morning tea times.",
    imageUrl: "/images/espresso.png",
    price: 950000,
    maxQuantity: 1,
    reservedCount: 0,
    category: "Kitchen",
    link: "https://www.breville.com",
  },
  {
    id: "6",
    name: "Premium Linen Sheet Set",
    description: "Breathable French flax linen sheets in warm clay/alabaster tone.",
    imageUrl: "/images/sheets.png",
    price: 300000,
    maxQuantity: 2,
    reservedCount: 1,
    category: "Home Essentials",
  },
  {
    id: "7",
    name: "Bless Our Home Fund",
    description: "Help us set up our new apartment in Lagos as we start this beautiful journey.",
    imageUrl: "/images/home_fund.png",
    price: 150000,
    maxQuantity: 100,
    reservedCount: 12,
    category: "Home Essentials",
    isCashFund: true,
    bankDetails: {
      bankName: "Zenith Bank",
      accountNumber: "9876543210",
      accountName: "Uche & Adun Wedding Account",
      note: "Please transfer your contribution directly using your banking app, then confirm details below.",
    },
  },
];

const mapCategory = (cat: string) => {
  if (!cat) return "Other";
  if (cat === "kitchen") return "Kitchen";
  if (cat === "travel") return "Travel";
  if (cat === "home") return "Home Essentials";
  if (cat === "cash-fund") return "Cash Fund";
  return cat.charAt(0).toUpperCase() + cat.slice(1);
};

const localItems = ref<WishlistItem[]>([]);
onMounted(() => {
  localItems.value = [...initialItems];
});

const items = computed(() => {
  if (wishlistData.value?.docs && wishlistData.value.docs.length > 0) {
    return wishlistData.value.docs.map((doc: any) => ({
      id: doc.id,
      name: doc.name,
      description: doc.description,
      imageUrl: doc.image?.url || "/images/placeholder.png",
      link: doc.link,
      price: doc.price,
      maxQuantity: doc.maxQuantity,
      reservedCount: doc.reservedCount || 0,
      category: mapCategory(doc.category),
      isCashFund: doc.isCashFund || false,
      bankDetails: doc.isCashFund
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
const guestName = ref("");
const guestEmail = ref("");
const guestMessage = ref("");
const successItem = ref<WishlistItem | null>(null);

const categories = computed(() => {
  return ["All", ...Array.from(new Set(items.value.map((item) => item.category)))];
});

const handleReserveClick = (item: WishlistItem) => {
  activeItem.value = item;
  guestName.value = "";
  guestEmail.value = "";
  guestMessage.value = "";
};

const handleConfirmReservation = async () => {
  if (!activeItem.value) return;

  try {
    const isDbItem = wishlistData.value?.docs?.some((d: any) => d.id === activeItem.value?.id);
    if (isDbItem) {
      await client.collection("reservations").create({
        item: activeItem.value.id,
        guestName: guestName.value,
        guestEmail: guestEmail.value,
        message: guestMessage.value,
      });
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
</script>

<template>
  <div class="min-h-screen bg-warm-cream text-deep-espresso flex flex-col relative select-text">
    <!-- Navigation Bar -->
    <Navigation />

    <!-- Hero Header -->
    <section class="pt-32 pb-16 px-6 paper-texture border-b border-amber-gold/10 text-center relative overflow-hidden">
      <div class="max-w-3xl mx-auto space-y-4">
        <span class="font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase block">
          Gift Registry
        </span>
        <h1 class="heading2-big md:text-6xl font-bold text-deep-espresso font-display-cinzel">Support Our Union</h1>
        <p class="font-body text-deep-espresso/70 text-lg leading-relaxed max-w-xl mx-auto">
          Your presence, love, and prayers are all we could ask for. If you wish to bless our home as we build our life
          together in Lagos, here is our registry.
        </p>
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
              class="px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider transition-all duration-200 border cursor-pointer uppercase"
              :class="
                selectedCategory === cat
                  ? 'bg-deep-terracotta border-deep-terracotta text-warm-cream shadow-sm'
                  : 'bg-soft-pearl/50 border-amber-gold/20 text-deep-espresso/80 hover:bg-soft-pearl'
              "
            >
              {{ cat }}
            </button>
          </div>

          <!-- Sorting controls -->
          <div class="flex items-center gap-2">
            <span class="text-xs uppercase tracking-wider font-semibold text-deep-espresso/60"> Sort Price: </span>
            <select
              v-model="priceSort"
              class="bg-soft-pearl/80 border border-amber-gold/20 rounded-xl px-3 py-1.5 text-xs text-deep-espresso font-semibold focus:outline-none focus:border-deep-terracotta"
            >
              <option value="none">Default</option>
              <option value="low-to-high">Low to High</option>
              <option value="high-to-low">High to Low</option>
            </select>
          </div>
        </div>

        <!-- Registry Item Cards Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div
            v-for="item in filteredAndSortedItems"
            :key="item.id"
            class="linen-card rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-md group"
            :class="
              item.maxQuantity - item.reservedCount > 0
                ? 'hover:-translate-y-1 hover:shadow-lg border-amber-gold/15'
                : 'opacity-75 border-amber-gold/10 grayscale-15'
            "
          >
            <!-- Item Image -->
            <div
              class="relative aspect-[4/3] w-full bg-deep-espresso/5 border-b border-amber-gold/10 overflow-hidden select-none"
            >
              <div
                class="absolute inset-0 flex items-center justify-center text-deep-espresso/20 text-xs font-semibold tracking-wider font-display-cinzel"
              >
                No Image Placeholder
              </div>
              <!-- Badge Indicator -->
              <div class="absolute top-4 right-4 z-10">
                <span
                  v-if="item.isCashFund"
                  class="bg-purple-950/80 border border-purple-500/30 text-purple-200 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full backdrop-blur-xs"
                >
                  Cash Fund
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
                    ₦{{ item.price.toLocaleString("en-US") }}
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
              </div>

              <!-- Action Buttons -->
              <div class="flex items-center gap-3 pt-2">
                <button
                  v-if="item.isCashFund"
                  @click="handleReserveClick(item)"
                  class="flex-1 px-4 py-2 rounded-xl bg-burnt-orange text-warm-cream font-semibold text-xs uppercase tracking-wider hover:bg-deep-terracotta transition-all duration-300 shadow-sm hover:shadow focus:outline-none text-center cursor-pointer"
                >
                  Contribute Cash
                </button>
                <button
                  v-else-if="item.maxQuantity - item.reservedCount > 0"
                  @click="handleReserveClick(item)"
                  class="flex-1 px-4 py-2 rounded-xl bg-deep-terracotta text-warm-cream font-semibold text-xs uppercase tracking-wider hover:bg-burnt-sienna transition-all duration-300 shadow-sm hover:shadow focus:outline-none text-center cursor-pointer"
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
    <Footer />

    <!-- Reservation Form Modal -->
    <div
      v-if="activeItem"
      class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in animate-duration-200"
    >
      <div
        class="linen-card w-full max-w-md p-6 sm:p-8 rounded-2xl border border-amber-gold/20 shadow-2xl relative animate-scale-up animate-duration-200"
      >
        <!-- Close -->
        <button
          @click="activeItem = null"
          class="absolute top-4 right-4 text-deep-espresso/50 hover:text-deep-espresso text-xl font-sans focus:outline-none cursor-pointer"
        >
          ✕
        </button>

        <div class="space-y-4 max-h-[85vh] overflow-y-auto pr-1">
          <div>
            <span class="font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase block mb-1">
              {{ activeItem.isCashFund ? "Cash Contribution" : "Commit to Gift" }}
            </span>
            <h3 class="font-heading text-xl font-bold text-deep-espresso leading-snug">
              {{ activeItem.name }}
            </h3>
            <p class="font-body text-xs text-deep-espresso/60">
              {{ activeItem.isCashFund ? "Suggested Contribution:" : "Approximate Value:" }} ₦{{
                activeItem.price.toLocaleString("en-US")
              }}
              · Category: {{ activeItem.category }}
            </p>
          </div>

          <div class="border-t border-amber-gold/10 my-4" />

          <!-- Direct Bank Transfer Section -->
          <div
            v-if="activeItem.isCashFund && activeItem.bankDetails"
            class="bg-soft-pearl/80 p-4 rounded-xl border border-amber-gold/15 space-y-2.5 text-xs text-deep-espresso/90"
          >
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

          <form @submit.prevent="handleConfirmReservation" class="space-y-4 pt-2">
            <div class="space-y-1">
              <label class="text-xs font-bold uppercase tracking-wider text-deep-espresso/60">
                Your Name (Required)
              </label>
              <input
                type="text"
                required
                v-model="guestName"
                class="w-full bg-soft-pearl/50 border border-amber-gold/20 rounded-xl px-4 py-2.5 text-sm text-deep-espresso focus:outline-none focus:border-deep-terracotta"
                placeholder="Enter your name"
              />
            </div>

            <div class="space-y-1">
              <label class="text-xs font-bold uppercase tracking-wider text-deep-espresso/60">
                Your Email Address (Required)
              </label>
              <input
                type="email"
                required
                v-model="guestEmail"
                class="w-full bg-soft-pearl/50 border border-amber-gold/20 rounded-xl px-4 py-2.5 text-sm text-deep-espresso focus:outline-none focus:border-deep-terracotta"
                placeholder="name@example.com"
              />
            </div>

            <div class="space-y-1">
              <label class="text-xs font-bold uppercase tracking-wider text-deep-espresso/60">
                Message to Couple (Optional)
              </label>
              <textarea
                v-model="guestMessage"
                rows="3"
                class="w-full bg-soft-pearl/50 border border-amber-gold/20 rounded-xl px-4 py-2.5 text-sm text-deep-espresso focus:outline-none focus:border-deep-terracotta resize-none"
                placeholder="Leave a lovely note..."
              />
            </div>

            <button
              type="submit"
              class="w-full px-5 py-3 rounded-xl bg-deep-terracotta text-warm-cream font-bold text-xs uppercase tracking-wider hover:bg-burnt-sienna transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none text-center cursor-pointer mt-2"
            >
              {{ activeItem.isCashFund ? "Confirm Contribution" : "Confirm Reservation" }}
            </button>
          </form>
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
          <template v-if="successItem.isCashFund">
            You have successfully initiated a contribution to the <strong>{{ successItem.name }}</strong
            >. Please ensure you complete the bank transfer using the details provided, and we will send a confirmation
            details card to your email.
          </template>
          <template v-else>
            You have successfully reserved the <strong>{{ successItem.name }}</strong> registry gift item. We have sent
            a confirmation details card to your email.
          </template>
        </p>
        <button
          @click="successItem = null"
          class="px-6 py-2.5 rounded-xl bg-deep-terracotta text-warm-cream font-bold text-xs uppercase tracking-wider hover:bg-burnt-sienna transition-all duration-300 shadow focus:outline-none cursor-pointer"
        >
          Back to Registry
        </button>
      </div>
    </div>
  </div>
</template>
