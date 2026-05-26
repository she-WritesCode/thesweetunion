"use client";

import { useState } from "react";
import Image from "next/image";
import { siteConfig } from "@/config/site";
import Countdown from "@/components/Countdown";
import Timeline from "@/components/Timeline";
import Accordion from "@/components/Accordion";

type FontType = "cormorant" | "cinzel" | "italiana";

export default function Home() {
  const [activeFont, setActiveFont] = useState<FontType>("cinzel");
  const [activeSchedule, setActiveSchedule] = useState<"traditional" | "white">("traditional");

  // Adapters for updated config schema
  const venue = siteConfig.events[1].venue;
  const scheduleTraditional = siteConfig.events[0].schedule;
  const scheduleWhite = siteConfig.events[1].schedule;
  const rsvpPrompt = {
    title: "Will You Celebrate With Us?",
    description: "Please let us know if you can make it before the deadline so we can finalize our preparations. We would love nothing more than to share this day with you."
  };

  const getFontClass = (font: FontType) => {
    switch (font) {
      case "cinzel":
        return "font-display-cinzel";
      case "italiana":
        return "font-display-italiana";
      case "cormorant":
      default:
        return "font-display-cormorant";
    }
  };

  const getFontName = (font: FontType) => {
    switch (font) {
      case "cinzel":
        return "Cinzel Decorative";
      case "italiana":
        return "Italiana";
      case "cormorant":
      default:
        return "Cormorant Upright";
    }
  };

  return (
    <div className="min-h-screen bg-warm-cream text-deep-espresso flex flex-col relative select-none">

      {/* Real-time Font Switcher Widget (Fixed for interactive preview) */}
      <div className="fixed bottom-6 right-6 z-50 bg-linen-white/95 backdrop-blur-md border border-amber-gold/30 p-4 rounded-2xl shadow-xl max-w-xs transition-all duration-300 hover:shadow-2xl">
        <p className="text-xs font-semibold text-amber-gold uppercase tracking-wider mb-2">
          Design Preview: Font Switcher
        </p>
        <p className="text-xs text-deep-espresso/70 mb-3">
          Toggle between your top choices to see the display text change in real-time.
        </p>
        <div className="flex flex-col gap-1.5">
          {(["cormorant", "cinzel", "italiana"] as FontType[]).map((font) => (
            <button
              key={font}
              onClick={() => setActiveFont(font)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${activeFont === font
                  ? "bg-deep-terracotta text-warm-cream font-medium shadow-sm"
                  : "hover:bg-amber-gold/10 text-deep-espresso"
                }`}
            >
              {getFontName(font)}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-40 bg-warm-cream/80 backdrop-blur-md border-b border-amber-gold/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <a
            href="#"
            className={`text-xl md:text-2xl font-semibold tracking-wide text-deep-espresso transition-all duration-300 ${getFontClass(
              activeFont
            )}`}
          >
            {siteConfig.couple.hashtag}
          </a>
          <nav className="flex items-center gap-6 sm:gap-8 text-sm sm:text-base font-semibold uppercase tracking-wider">
            <a href="#" className="text-deep-terracotta hover:text-burnt-sienna transition-colors">
              Home
            </a>
            <a href="#wishlist" className="hover:text-deep-terracotta transition-colors">
              Wishlist
            </a>
            <a href="#rsvp" className="hover:text-deep-terracotta transition-colors">
              RSVP
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative h-[90vh] w-full flex items-center justify-center overflow-hidden">
        {/* Cinematic full-bleed photo */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hero.png"
            alt="Adun and Uche"
            fill
            priority
            className="object-cover object-center scale-[1.02] brightness-90 contrast-[1.02]"
          />
          {/* Subtle gradient overlay to enhance readability */}
          <div className="absolute inset-0 bg-linear-to-t from-deep-espresso/80 via-deep-espresso/45 to-deep-espresso/20" />
        </div>

        {/* Text Overlay */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto mt-auto mb-20 text-warm-cream select-text">
          <p className="text-xs sm:text-sm md:text-base uppercase tracking-[0.25em] font-semibold text-amber-gold mb-4 drop-shadow">
            Celebrate Our Sweet Union
          </p>
          <h1
            className={`text-6xl sm:text-7xl md:text-9xl font-light leading-none tracking-wide mb-6 drop-shadow-md select-text ${getFontClass(
              activeFont
            )}`}
          >
            {siteConfig.couple.person1} & {siteConfig.couple.person2}
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl font-light tracking-widest text-warm-cream/90 drop-shadow-sm">
            October 15, 2026 · Oxfordshire
          </p>
        </div>
      </section>

      {/* Countdown Timer Section */}
      <section className="paper-texture py-16 px-6 border-b border-amber-gold/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className={`text-3xl sm:text-4xl font-bold mb-2 text-deep-espresso ${getFontClass(activeFont)}`}>
            Counting Down the Days
          </h2>
          <p className="text-deep-espresso/70 max-w-md mx-auto mb-8 font-body">
            Until we celebrate our promises in front of our family and closest friends.
          </p>
          <Countdown targetDate={siteConfig.weddingDate} />
        </div>
      </section>

      {/* Our Story Section */}
      <section id="story" className="paper-texture py-24 px-6 border-b border-amber-gold/10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase block mb-2">
              Our Journey
            </span>
            <h2 className={`text-4xl sm:text-5xl font-bold text-deep-espresso ${getFontClass(activeFont)}`}>
              The Long Game
            </h2>
            <p className="text-deep-espresso/70 max-w-lg mx-auto mt-4 font-body">
              We took our time, built a friendship that couldn't be broken, and ended up exactly where we belonged.
            </p>
          </div>
          <Timeline items={siteConfig.story} fontClass={getFontClass(activeFont)} />
        </div>
      </section>

      {/* Event Details & Schedule */}
      <section id="details" className="paper-texture py-24 px-6 border-b border-amber-gold/10">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">

          {/* Details & Map */}
          <div className="space-y-8">
            <div>
              <span className="font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase block mb-2">
                Where & When
              </span>
              <h2 className={`text-4xl font-bold text-deep-espresso mb-4 ${getFontClass(activeFont)}`}>
                Event Details
              </h2>
              <p className="font-body text-deep-espresso/80 max-w-md mb-6">
                We are gathering at the beautiful Oakwood Barn in the Oxfordshire Cotswolds. The wedding features both our Traditional Ceremony and White Wedding celebration.
              </p>
            </div>

            <div className="linen-card p-6 rounded-2xl border border-amber-gold/15 space-y-4">
              <div>
                <h4 className="font-heading text-sm font-semibold uppercase tracking-wider text-amber-gold mb-1">
                  Location
                </h4>
                <p className="font-heading text-lg font-bold text-deep-espresso">
                  {venue.name}
                </p>
                <p className="text-deep-espresso/80 text-sm mt-0.5">
                  {venue.address}
                </p>
              </div>

              <div>
                <h4 className="font-heading text-sm font-semibold uppercase tracking-wider text-amber-gold mb-1">
                  Timing
                </h4>
                <p className="font-heading text-lg font-bold text-deep-espresso">
                  Thursday, October 15, 2026
                </p>
                <p className="text-deep-espresso/80 text-sm mt-0.5">
                  Traditional details & white wedding schedule shown on the right.
                </p>
              </div>

              <a
                href={venue.googleMapsDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-deep-terracotta text-warm-cream font-semibold text-sm hover:bg-burnt-sienna transition-all duration-300 shadow-md hover:shadow-lg"
              >
                <span>Get Directions</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            {/* Embedded Google Map */}
            <div className="w-full h-[280px] rounded-2xl overflow-hidden shadow-inner border border-amber-gold/15 relative">
              <iframe
                src={venue.googleMapsEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="brightness-95 contrast-[1.02]"
              />
            </div>
          </div>

          {/* Schedule */}
          <div>
            <div className="mb-8">
              <span className="font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase block mb-2">
                The Day
              </span>
              <h2 className={`text-4xl font-bold text-deep-espresso mb-4 ${getFontClass(activeFont)}`}>
                The Schedule
              </h2>
              <div className="flex gap-4 mt-6 border-b border-amber-gold/20 pb-3">
                <button
                  onClick={() => setActiveSchedule("traditional")}
                  className={`pb-2 text-base font-semibold uppercase tracking-wider transition-all duration-300 focus:outline-none cursor-pointer ${activeSchedule === "traditional"
                      ? "text-deep-terracotta border-b-2 border-deep-terracotta"
                      : "text-deep-espresso/60 hover:text-deep-espresso"
                    }`}
                >
                  Traditional Wedding
                </button>
                <button
                  onClick={() => setActiveSchedule("white")}
                  className={`pb-2 text-base font-semibold uppercase tracking-wider transition-all duration-300 focus:outline-none cursor-pointer ${activeSchedule === "white"
                      ? "text-deep-terracotta border-b-2 border-deep-terracotta"
                      : "text-deep-espresso/60 hover:text-deep-espresso"
                    }`}
                >
                  White Wedding
                </button>
              </div>
            </div>

            <div className="space-y-6 relative border-l border-amber-gold/20 pl-6 ml-2 transition-opacity duration-300">
              {(activeSchedule === "traditional"
                ? scheduleTraditional
                : scheduleWhite
              ).map((item, index) => (
                <div key={index} className="relative group">
                  {/* Timeline point */}
                  <div className="absolute left-[-31px] top-1.5 w-4 h-4 rounded-full border border-amber-gold bg-warm-cream flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-gold" />
                  </div>

                  <div>
                    <span className="font-heading text-sm font-semibold text-amber-gold tracking-wide">
                      {item.time}
                    </span>
                    <h3 className="font-heading text-lg font-bold text-deep-espresso mt-0.5">
                      {item.title}
                    </h3>
                    <p className="font-body text-base text-deep-espresso/70 mt-1">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Wishlist & RSVP Teaser Section */}
      <section className="paper-texture py-24 px-6 border-b border-amber-gold/10">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">

          {/* Wishlist Card */}
          <div id="wishlist" className="linen-card p-8 sm:p-10 rounded-2xl flex flex-col justify-between items-start border border-amber-gold/15 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="mb-8">
              <span className="font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase block mb-3">
                Registry
              </span>
              <h3 className={`text-3xl font-bold text-deep-espresso mb-4 ${getFontClass(activeFont)}`}>
                {siteConfig.wishlistTeaser.title}
              </h3>
              <p className="font-body text-deep-espresso/80 text-base leading-relaxed">
                {siteConfig.wishlistTeaser.description}
              </p>
            </div>
            <button className="px-6 py-3 rounded-xl bg-deep-terracotta text-warm-cream font-semibold text-sm hover:bg-burnt-sienna transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none">
              Browse Wishlist
            </button>
          </div>

          {/* RSVP Card */}
          <div id="rsvp" className="linen-card p-8 sm:p-10 rounded-2xl flex flex-col justify-between items-start border border-amber-gold/15 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="mb-8">
              <span className="font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase block mb-3">
                Attendance
              </span>
              <h3 className={`text-3xl font-bold text-deep-espresso mb-4 ${getFontClass(activeFont)}`}>
                {rsvpPrompt.title}
              </h3>
              <p className="font-body text-deep-espresso/80 text-base leading-relaxed">
                {rsvpPrompt.description}
              </p>
            </div>
            <button className="px-6 py-3 rounded-xl bg-deep-terracotta text-warm-cream font-semibold text-sm hover:bg-burnt-sienna transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none">
              RSVP Online
            </button>
          </div>

        </div>
      </section>

      {/* FAQ Section */}
      <section className="paper-texture py-24 px-6 border-b border-amber-gold/10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <span className="font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase block mb-2">
              Have Questions?
            </span>
            <h2 className={`text-4xl sm:text-5xl font-bold text-deep-espresso ${getFontClass(activeFont)}`}>
              Frequently Asked
            </h2>
            <p className="text-deep-espresso/70 max-w-sm mx-auto mt-4 font-body">
              Everything you need to know about the day, travel, and details.
            </p>
          </div>
          <Accordion items={siteConfig.faqs} />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-linen-white py-12 px-6 border-t border-amber-gold/15 text-center">
        <div className="max-w-md mx-auto space-y-4">
          <p className={`text-3xl text-deep-espresso font-semibold ${getFontClass(activeFont)}`}>
            {siteConfig.couple.hashtag}
          </p>
          <p className="font-body text-sm text-deep-espresso/60">
            © 2026 {siteConfig.couple.person1} & {siteConfig.couple.person2}. Handcrafted with love.
          </p>
        </div>
      </footer>

    </div>
  );
}
