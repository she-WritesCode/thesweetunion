"use client";

import Image from "next/image";
import { siteConfig } from "@/config/site";
import Countdown from "@/components/Countdown";
import ScrapbookTimeline from "@/components/ScrapbookTimeline";
import Accordion from "@/components/Accordion";

export default function Home() {
  return (
    <div className="min-h-screen bg-warm-cream text-deep-espresso flex flex-col relative select-text">
      
      {/* Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-warm-cream/80 backdrop-blur-md border-b border-amber-gold/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <a
            href="#"
            className="text-xl md:text-2xl font-bold tracking-wide text-deep-espresso font-display-cinzel"
          >
            {siteConfig.couple.hashtag}
          </a>
          <nav className="flex items-center gap-6 sm:gap-8 text-xs sm:text-sm font-semibold uppercase tracking-wider">
            <a href="#hero" className="text-deep-terracotta hover:text-burnt-sienna transition-colors">
              Home
            </a>
            <a href="#story" className="hover:text-deep-terracotta transition-colors">
              Our Story
            </a>
            <a href="#events" className="hover:text-deep-terracotta transition-colors">
              Events
            </a>
            <a href="#wishlist" className="hover:text-deep-terracotta transition-colors">
              Wishlist
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section (At least 100vh) */}
      <section id="hero" className="min-h-screen w-full flex items-center justify-center relative overflow-hidden pt-16">
        {/* Full-bleed Photo */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hero.png"
            alt="Adun & Uche"
            fill
            priority
            className="object-cover object-center scale-[1.01]"
          />
          <div className="absolute inset-0 bg-linear-to-t from-deep-espresso/80 via-deep-espresso/40 to-deep-espresso/25" />
        </div>

        {/* Text Overlay */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto mt-auto mb-24 text-warm-cream">
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-semibold text-amber-gold mb-3 drop-shadow">
            Celebrate Our Sweet Union
          </p>
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-bold leading-none tracking-wide mb-5 drop-shadow-md font-display-cinzel">
            {siteConfig.couple.person1} & {siteConfig.couple.person2}
          </h1>
          <p className="text-base sm:text-lg md:text-xl font-light tracking-widest text-warm-cream/90 drop-shadow-sm">
            October 14-15, 2026 · Oxfordshire
          </p>
        </div>
      </section>

      {/* Countdown Timer Section (At least 100vh) */}
      <section className="min-h-screen paper-texture w-full flex items-center justify-center p-6 border-b border-amber-gold/10">
        <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Column: Countdown Details */}
          <div className="text-center lg:text-left space-y-6">
            <span className="font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase block mb-1">
              Saving the Date
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold text-deep-espresso leading-tight font-display-cinzel">
              Counting Down the Days
            </h2>
            <p className="text-deep-espresso/70 max-w-md mx-auto lg:mx-0 font-body text-lg">
              We've known each other for a long time. Now, we are counting down the hours until our traditional engagement and celebration.
            </p>
            <Countdown targetDate={siteConfig.weddingDate} />
          </div>

          {/* Right Column: Scrapbook Photo Collage (Double photos) */}
          <div className="relative h-[320px] sm:h-[400px] w-full flex items-center justify-center select-none">
            {/* Photo 1: Road trip */}
            <div className="absolute left-[10%] top-[5%] w-[180px] sm:w-[220px] aspect-square bg-white p-2.5 pb-6 rounded shadow-lg border border-deep-espresso/5 rotate-[-6deg] hover:rotate-0 hover:z-20 transition-all duration-300">
              <div className="washi-tape washi-tape-terracotta top-[-10px] left-10" />
              <div className="relative w-full h-full overflow-hidden bg-deep-espresso/5 rounded-sm">
                <Image src="/images/story-2.png" alt="Road trip memory" fill className="object-cover animate-pulse-slow" />
              </div>
            </div>
            {/* Photo 2: Evening walk */}
            <div className="absolute right-[10%] bottom-[5%] w-[180px] sm:w-[220px] aspect-square bg-white p-2.5 pb-6 rounded shadow-lg border border-deep-espresso/5 rotate-[4deg] hover:rotate-0 hover:z-20 transition-all duration-300">
              <div className="washi-tape washi-tape-gold top-[-10px] right-10" />
              <div className="relative w-full h-full overflow-hidden bg-deep-espresso/5 rounded-sm">
                <Image src="/images/story-3.png" alt="Evening walk memory" fill className="object-cover" />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Our Story Section (At least 100vh / Expandable) */}
      <section id="story" className="min-h-screen paper-texture w-full flex items-center justify-center p-6 py-24 border-b border-amber-gold/10">
        <div className="w-full max-w-6xl mx-auto flex flex-col justify-center">
          <div className="text-center mb-16">
            <span className="font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase block mb-1">
              Our Journey
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold text-deep-espresso font-display-cinzel">
              The Long Game Scrapbook
            </h2>
            <p className="text-deep-espresso/70 max-w-lg mx-auto mt-4 font-body text-lg">
              We took our time, built a friendship that couldn't be broken, and ended up exactly where we belonged. Here is our story over the years.
            </p>
          </div>
          <ScrapbookTimeline items={siteConfig.story} />
        </div>
      </section>

      {/* Dynamic Wedding Events Sections (Each event gets its own 100vh block!) */}
      <div id="events">
        {siteConfig.events.map((event, index) => {
          const isEven = index % 2 === 0;
          return (
            <section
              key={event.key}
              className="min-h-screen paper-texture w-full flex items-center justify-center p-6 py-24 border-b border-amber-gold/10"
            >
              <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                
                {/* Event text, details, schedule & RSVP - Alternates left/right on desktop */}
                <div className={`space-y-8 ${isEven ? "order-1" : "order-1 lg:order-2"}`}>
                  <div>
                    <span className="font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase block mb-1">
                      Wedding Day {index + 1}
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-bold text-deep-espresso mb-2 font-display-cinzel">
                      {event.name}
                    </h2>
                    <p className="font-body text-deep-espresso/60 text-sm sm:text-base font-semibold">
                      {event.date}
                    </p>
                  </div>

                  {/* Venue and Directions Card */}
                  <div className="linen-card p-6 rounded-2xl border border-amber-gold/15 space-y-4">
                    <div>
                      <h4 className="font-heading text-xs font-semibold uppercase tracking-wider text-amber-gold mb-0.5">
                        Venue
                      </h4>
                      <p className="font-heading text-base sm:text-lg font-bold text-deep-espresso">
                        {event.venue.name}
                      </p>
                      <p className="text-deep-espresso/80 text-sm">
                        {event.venue.address}
                      </p>
                    </div>

                    <a
                      href={event.venue.googleMapsDirectionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-xl bg-deep-terracotta text-warm-cream font-semibold text-xs hover:bg-burnt-sienna transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none"
                    >
                      <span>Directions</span>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>

                  {/* Schedule for this specific event */}
                  <div>
                    <h4 className="font-heading text-xs font-semibold uppercase tracking-wider text-amber-gold mb-4">
                      The Schedule
                    </h4>
                    <div className="space-y-5 relative border-l border-amber-gold/20 pl-6 ml-2">
                      {event.schedule.map((item, scheduleIdx) => (
                        <div key={scheduleIdx} className="relative group">
                          <div className="absolute left-[-31px] top-1.5 w-3.5 h-3.5 rounded-full border border-amber-gold bg-warm-cream flex items-center justify-center transition-all duration-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-gold" />
                          </div>
                          <div>
                            <span className="font-heading text-xs font-semibold text-amber-gold tracking-wide">
                              {item.time}
                            </span>
                            <h5 className="font-heading text-base font-bold text-deep-espresso mt-0.5">
                              {item.title}
                            </h5>
                            <p className="font-body text-sm text-deep-espresso/70 mt-0.5">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Integrated RSVP Call to Action */}
                  <div className="linen-card p-6 rounded-2xl border border-amber-gold/15 bg-linen-white/40 space-y-3">
                    <h4 className="font-heading text-base font-bold text-deep-espresso">
                      {event.rsvpTeaser.title}
                    </h4>
                    <p className="font-body text-sm text-deep-espresso/80">
                      {event.rsvpTeaser.description}
                    </p>
                    <a
                      href={event.rsvpLink}
                      className="inline-block px-5 py-2.5 rounded-xl bg-deep-terracotta text-warm-cream font-semibold text-xs uppercase tracking-wider hover:bg-burnt-sienna transition-all duration-300 shadow-md hover:shadow-lg text-center"
                    >
                      RSVP For This Event
                    </a>
                  </div>
                </div>

                {/* Polaroid couple picture representing this specific event */}
                <div className={`flex flex-col items-center justify-center select-none relative ${isEven ? "order-2" : "order-2 lg:order-1"}`}>
                  <div className="washi-tape washi-tape-gold top-[-10px] left-1/2 ml-[-55px] rotate-[2deg]" />
                  <div className="bg-white p-4 pb-10 rounded shadow-2xl border border-deep-espresso/5 rotate-[-2deg] max-w-sm sm:max-w-md w-full transition-transform duration-300 hover:rotate-0">
                    <div className="relative aspect-4/3 w-full overflow-hidden bg-deep-espresso/5 rounded-sm">
                      <Image
                        src={event.imageUrl}
                        alt={`${event.name} Photo`}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="mt-4 text-center">
                      <span className="font-display-cormorant text-xl font-semibold text-deep-espresso">
                        {event.name}
                      </span>
                    </div>
                  </div>

                  {/* Small Google map iframe helper inside the layout */}
                  <div className="w-full max-w-sm sm:max-w-md h-[180px] rounded-2xl overflow-hidden shadow-inner border border-amber-gold/15 mt-8 relative">
                    <iframe
                      src={event.venue.googleMapsEmbedUrl}
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

              </div>
            </section>
          );
        })}
      </div>

      {/* Slide 6: Wishlist/Registry Teaser (At least 100vh) */}
      <section id="wishlist" className="min-h-screen paper-texture w-full flex items-center justify-center p-6 border-b border-amber-gold/10">
        <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Column: Polaroid Home Couple Photo */}
          <div className="flex justify-center select-none relative order-2 lg:order-1">
            <div className="washi-tape washi-tape-gold top-[-10px] left-1/2 ml-[-55px] rotate-[-4deg]" />
            <div className="bg-white p-4 pb-8 rounded shadow-xl border border-deep-espresso/5 rotate-[3deg] max-w-sm sm:max-w-md w-full transition-transform duration-300 hover:rotate-0">
              <div className="relative aspect-4/3 w-full overflow-hidden bg-deep-espresso/5 rounded-sm">
                <Image src="/images/home_couple.png" alt="Building our home" fill className="object-cover" />
              </div>
              <div className="mt-4 text-center">
                <span className="font-display-cormorant text-lg font-semibold text-deep-espresso">
                  Setting up our kitchen · 2026
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Registry Teaser */}
          <div className="linen-card p-8 sm:p-10 rounded-2xl flex flex-col justify-between items-start border border-amber-gold/15 transition-all duration-300 hover:shadow-lg order-1 lg:order-2">
            <div className="mb-6">
              <span className="font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase block mb-2">
                Registry
              </span>
              <h3 className="text-3xl font-bold text-deep-espresso mb-3 font-display-cinzel">
                {siteConfig.wishlistTeaser.title}
              </h3>
              <p className="font-body text-deep-espresso/80 text-base sm:text-lg leading-relaxed">
                {siteConfig.wishlistTeaser.description}
              </p>
            </div>
            <button className="px-5 py-2.5 rounded-xl bg-deep-terracotta text-warm-cream font-semibold text-sm hover:bg-burnt-sienna transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none cursor-pointer">
              Browse Wishlist
            </button>
          </div>

        </div>
      </section>

      {/* Slide 7: FAQs & Playful Couple Photo (At least 100vh) */}
      <section id="faqs" className="min-h-screen paper-texture w-full flex items-center justify-center p-6 border-b border-amber-gold/10">
        <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Column: Polaroid Playful Couple Photo */}
          <div className="flex justify-center select-none relative order-2 lg:order-1">
            <div className="washi-tape washi-tape-gold top-[-10px] left-1/2 ml-[-55px] rotate-[4deg]" />
            <div className="bg-white p-4 pb-8 rounded shadow-xl border border-deep-espresso/5 rotate-[-4deg] max-w-sm sm:max-w-md w-full transition-transform duration-300 hover:rotate-0">
              <div className="relative aspect-4/3 w-full overflow-hidden bg-deep-espresso/5 rounded-sm">
                <Image src="/images/playful_couple.png" alt="Adun and Uche" fill className="object-cover" />
              </div>
              <div className="mt-4 text-center">
                <span className="font-display-cormorant text-lg font-semibold text-deep-espresso">
                  No serious questions allowed! · Oxfordshire 2026
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: FAQs Accordion */}
          <div className="order-1 lg:order-2 space-y-4 max-h-[85vh] overflow-y-auto pr-2">
            <div className="mb-4">
              <span className="font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase block mb-1">
                Help & Info
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-deep-espresso font-display-cinzel">
                Frequently Asked
              </h2>
            </div>
            <Accordion items={siteConfig.faqs} />
          </div>

        </div>
      </section>

      {/* Slide 8: Footer Slide (At least 100vh) */}
      <footer className="bg-linen-white min-h-screen w-full flex flex-col items-center justify-center p-6 border-t border-amber-gold/15 text-center relative">
        <div className="max-w-md mx-auto space-y-4">
          <p className="text-4xl text-deep-espresso font-semibold font-display-cinzel">
            {siteConfig.couple.hashtag}
          </p>
          <p className="font-body text-base text-deep-espresso/80">
            Thank you for being part of our story. We can't wait to celebrate our union with you.
          </p>
          <div className="relative w-[150px] aspect-square mx-auto bg-white p-2 pb-6 rounded shadow border border-deep-espresso/5 rotate-[3deg] scale-90 select-none">
            <div className="relative w-full h-full overflow-hidden bg-deep-espresso/5 rounded-sm">
              <Image src="/images/story-4.png" alt="Memory" fill className="object-cover" />
            </div>
          </div>
          <p className="font-body text-xs text-deep-espresso/60 pt-4">
            © 2026 {siteConfig.couple.person1} & {siteConfig.couple.person2}. Handcrafted with love.
          </p>
        </div>
      </footer>

    </div>
  );
}
