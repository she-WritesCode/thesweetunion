"use client";

import { useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

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

// Initial mock registry list matching Lagos setup theme
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
      note: "Please transfer your contribution directly using your banking app, then confirm details below."
    }
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
      note: "Please transfer your contribution directly using your banking app, then confirm details below."
    }
  }
];

export default function Wishlist() {
  const [items, setItems] = useState<WishlistItem[]>(initialItems);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [priceSort, setPriceSort] = useState<"none" | "low-to-high" | "high-to-low">("none");
  
  // Modal Reservation State
  const [activeItem, setActiveItem] = useState<WishlistItem | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestMessage, setGuestMessage] = useState("");
  const [successItem, setSuccessItem] = useState<WishlistItem | null>(null);

  const categories = ["All", ...Array.from(new Set(items.map((item) => item.category)))];

  const handleReserveClick = (item: WishlistItem) => {
    setActiveItem(item);
    setGuestName("");
    setGuestEmail("");
    setGuestMessage("");
  };

  const handleConfirmReservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;

    // Concurrency safe client state increment
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === activeItem.id && item.reservedCount < item.maxQuantity) {
          return { ...item, reservedCount: item.reservedCount + 1 };
        }
        return item;
      })
    );

    setSuccessItem(activeItem);
    setActiveItem(null);
  };

  // Filter & Sort Items
  const filteredItems = items.filter(
    (item) => selectedCategory === "All" || item.category === selectedCategory
  );

  if (priceSort === "low-to-high") {
    filteredItems.sort((a, b) => a.price - b.price);
  } else if (priceSort === "high-to-low") {
    filteredItems.sort((a, b) => b.price - a.price);
  }

  return (
    <div className="min-h-screen bg-warm-cream text-deep-espresso flex flex-col relative select-text">
      
      {/* Navigation Bar */}
      <Navigation />

      {/* Hero Header */}
      <section className="pt-32 pb-16 px-6 paper-texture border-b border-amber-gold/10 text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto space-y-4">
          <span className="font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase block">
            Gift Registry
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-deep-espresso font-display-cinzel">
            Support Our Union
          </h1>
          <p className="font-body text-deep-espresso/70 text-lg leading-relaxed max-w-xl mx-auto">
            Your presence, love, and prayers are all we could ask for. If you wish to bless our home as we build our life together in Lagos, here is our registry.
          </p>
        </div>
      </section>

      {/* Grid, Filters and Controls */}
      <main className="flex-1 paper-texture py-12 px-6">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Controls Panel */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-amber-gold/10 pb-6">
            
            {/* Filter buttons */}
            <div className="flex flex-wrap gap-2 justify-center">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider transition-all duration-200 border cursor-pointer uppercase ${
                    selectedCategory === cat
                      ? "bg-deep-terracotta border-deep-terracotta text-warm-cream shadow-sm"
                      : "bg-soft-pearl/50 border-amber-gold/20 text-deep-espresso/80 hover:bg-soft-pearl"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Sorting controls */}
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-deep-espresso/60">
                Sort Price:
              </span>
              <select
                value={priceSort}
                onChange={(e) => setPriceSort(e.target.value as "none" | "low-to-high" | "high-to-low")}
                className="bg-soft-pearl/80 border border-amber-gold/20 rounded-xl px-3 py-1.5 text-xs text-deep-espresso font-semibold focus:outline-none focus:border-deep-terracotta"
              >
                <option value="none">Default</option>
                <option value="low-to-high">Low to High</option>
                <option value="high-to-low">High to Low</option>
              </select>
            </div>
          </div>

          {/* Registry Item Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredItems.map((item) => {
              const spotsLeft = item.maxQuantity - item.reservedCount;
              const isAvailable = spotsLeft > 0;
              const isPartiallyClaimed = item.reservedCount > 0 && isAvailable;

              return (
                <div
                  key={item.id}
                  className={`linen-card rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-md group ${
                    isAvailable
                      ? "hover:-translate-y-1 hover:shadow-lg border-amber-gold/15"
                      : "opacity-75 border-amber-gold/10 grayscale-15"
                  }`}
                >
                  {/* Item Image */}
                  <div className="relative aspect-4/3 w-full bg-deep-espresso/5 border-b border-amber-gold/10 overflow-hidden select-none">
                    <div className="absolute inset-0 flex items-center justify-center text-deep-espresso/20 text-xs font-semibold tracking-wider font-display-cinzel">
                      No Image Placeholder
                    </div>
                    {/* Badge Indicator */}
                    <div className="absolute top-4 right-4 z-10">
                      {item.isCashFund ? (
                        <span className="bg-purple-950/80 border border-purple-500/30 text-purple-200 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full backdrop-blur-xs">
                          Cash Fund
                        </span>
                      ) : !isAvailable ? (
                        <span className="bg-red-950/80 border border-red-500/30 text-red-200 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full backdrop-blur-xs">
                          Fully Claimed
                        </span>
                      ) : isPartiallyClaimed ? (
                        <span className="bg-amber-950/80 border border-amber-500/30 text-amber-200 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full backdrop-blur-xs">
                          {spotsLeft} Left
                        </span>
                      ) : (
                        <span className="bg-emerald-950/80 border border-emerald-500/30 text-emerald-200 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full backdrop-blur-xs">
                          Available
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-gold/80 block">
                          {item.category}
                        </span>
                        <span className="text-sm font-bold text-deep-espresso font-body">
                          ₦{item.price.toLocaleString("en-US")}
                        </span>
                      </div>
                      <h3 className="font-heading text-lg font-bold text-deep-espresso leading-snug group-hover:text-deep-terracotta transition-colors">
                        {item.name}
                      </h3>
                      <p className="font-body text-sm text-deep-espresso/70 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 pt-2">
                      {item.isCashFund ? (
                        <button
                          onClick={() => handleReserveClick(item)}
                          className="flex-1 px-4 py-2 rounded-xl bg-burnt-orange text-warm-cream font-semibold text-xs uppercase tracking-wider hover:bg-deep-terracotta transition-all duration-300 shadow-sm hover:shadow focus:outline-none text-center cursor-pointer"
                        >
                          Contribute Cash
                        </button>
                      ) : isAvailable ? (
                        <button
                          onClick={() => handleReserveClick(item)}
                          className="flex-1 px-4 py-2 rounded-xl bg-deep-terracotta text-warm-cream font-semibold text-xs uppercase tracking-wider hover:bg-burnt-sienna transition-all duration-300 shadow-sm hover:shadow focus:outline-none text-center cursor-pointer"
                        >
                          Reserve Gift
                        </button>
                      ) : (
                        <button
                          disabled
                          className="flex-1 px-4 py-2 rounded-xl bg-deep-espresso/10 text-deep-espresso/40 font-semibold text-xs uppercase tracking-wider text-center cursor-not-allowed"
                        >
                          Fully Reserved
                        </button>
                      )}
                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 rounded-xl border border-amber-gold/20 text-deep-espresso font-semibold text-xs uppercase tracking-wider hover:bg-soft-pearl transition-all duration-300 text-center"
                        >
                          View Link
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Reservation Form Modal */}
      {activeItem && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in animate-duration-200">
          <div className="linen-card w-full max-w-md p-6 sm:p-8 rounded-2xl border border-amber-gold/20 shadow-2xl relative animate-scale-up animate-duration-200">
            {/* Close */}
            <button
              onClick={() => setActiveItem(null)}
              className="absolute top-4 right-4 text-deep-espresso/50 hover:text-deep-espresso text-xl font-sans focus:outline-none cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-4 max-h-[85vh] overflow-y-auto pr-1">
              <div>
                <span className="font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase block mb-1">
                  {activeItem.isCashFund ? "Cash Contribution" : "Commit to Gift"}
                </span>
                <h3 className="font-heading text-xl font-bold text-deep-espresso leading-snug">
                  {activeItem.name}
                </h3>
                <p className="font-body text-xs text-deep-espresso/60">
                  {activeItem.isCashFund ? "Suggested Contribution:" : "Approximate Value:"} ₦{activeItem.price.toLocaleString("en-US")} · Category: {activeItem.category}
                </p>
              </div>

              <div className="border-t border-amber-gold/10 my-4" />

              {/* Direct Bank Transfer Section */}
              {activeItem.isCashFund && activeItem.bankDetails && (
                <div className="bg-soft-pearl/80 p-4 rounded-xl border border-amber-gold/15 space-y-2.5 text-xs text-deep-espresso/90">
                  <p className="font-semibold text-deep-terracotta uppercase tracking-wide">
                    Bank Transfer Details
                  </p>
                  <div className="grid grid-cols-3 gap-y-1 font-body">
                    <span className="text-deep-espresso/60">Bank:</span>
                    <span className="col-span-2 font-semibold">{activeItem.bankDetails.bankName}</span>
                    
                    <span className="text-deep-espresso/60">Account #:</span>
                    <span className="col-span-2 font-mono font-bold text-sm text-deep-terracotta select-all">{activeItem.bankDetails.accountNumber}</span>
                    
                    <span className="text-deep-espresso/60">Name:</span>
                    <span className="col-span-2 font-semibold">{activeItem.bankDetails.accountName}</span>
                  </div>
                  {activeItem.bankDetails.note && (
                    <p className="text-[10px] text-deep-espresso/70 italic pt-1 border-t border-amber-gold/5">
                      {activeItem.bankDetails.note}
                    </p>
                  )}
                </div>
              )}

              <form onSubmit={handleConfirmReservation} className="space-y-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-deep-espresso/60">
                    Your Name (Required)
                  </label>
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full bg-soft-pearl/50 border border-amber-gold/20 rounded-xl px-4 py-2.5 text-sm text-deep-espresso focus:outline-none focus:border-deep-terracotta"
                    placeholder="Enter your name"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-deep-espresso/60">
                    Your Email Address (Required)
                  </label>
                  <input
                    type="email"
                    required
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full bg-soft-pearl/50 border border-amber-gold/20 rounded-xl px-4 py-2.5 text-sm text-deep-espresso focus:outline-none focus:border-deep-terracotta"
                    placeholder="name@example.com"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-deep-espresso/60">
                    Message to Couple (Optional)
                  </label>
                  <textarea
                    value={guestMessage}
                    onChange={(e) => setGuestMessage(e.target.value)}
                    rows={3}
                    className="w-full bg-soft-pearl/50 border border-amber-gold/20 rounded-xl px-4 py-2.5 text-sm text-deep-espresso focus:outline-none focus:border-deep-terracotta resize-none"
                    placeholder="Leave a lovely note..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-5 py-3 rounded-xl bg-deep-terracotta text-warm-cream font-bold text-xs uppercase tracking-wider hover:bg-burnt-sienna transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none text-center cursor-pointer mt-2"
                >
                  {activeItem.isCashFund ? "Confirm Contribution" : "Confirm Reservation"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successItem && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in animate-duration-200">
          <div className="linen-card w-full max-w-md p-8 rounded-2xl border border-amber-gold/20 shadow-2xl text-center relative animate-scale-up animate-duration-200">
            <div className="text-4xl mb-4">🎉</div>
            <h3 className="font-heading text-2xl font-bold text-deep-espresso mb-2">
              Thank You So Much!
            </h3>
            <p className="font-body text-deep-espresso/80 text-sm leading-relaxed mb-6">
              {successItem.isCashFund ? (
                <>
                  You have successfully initiated a contribution to the <strong>{successItem.name}</strong>. Please ensure you complete the bank transfer using the details provided, and we will send a confirmation details card to your email.
                </>
              ) : (
                <>
                  You have successfully reserved the <strong>{successItem.name}</strong> registry gift item. We have sent a confirmation details card to your email.
                </>
              )}
            </p>
            <button
              onClick={() => setSuccessItem(null)}
              className="px-6 py-2.5 rounded-xl bg-deep-terracotta text-warm-cream font-bold text-xs uppercase tracking-wider hover:bg-burnt-sienna transition-all duration-300 shadow focus:outline-none cursor-pointer"
            >
              Back to Registry
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
