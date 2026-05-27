"use client";

import { useState } from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-warm-cream/80 backdrop-blur-md border-b border-amber-gold/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="text-xl md:text-2xl font-bold tracking-wide text-deep-espresso font-display-cinzel cursor-pointer"
          >
            {siteConfig.couple.hashtag}
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold uppercase tracking-wider">
            <Link href="/" className="hover:text-deep-terracotta transition-colors cursor-pointer">
              Home
            </Link>
            <Link href="/#story" className="hover:text-deep-terracotta transition-colors cursor-pointer">
              Our Story
            </Link>
            <Link href="/#events" className="hover:text-deep-terracotta transition-colors cursor-pointer">
              Events
            </Link>
            <Link href="/wishlist" className="hover:text-deep-terracotta transition-colors cursor-pointer">
              Wishlist
            </Link>
            <Link href="/rsvp" className="hover:text-deep-terracotta transition-colors cursor-pointer">
              RSVP
            </Link>
          </nav>

          {/* Mobile Menu Button (Hamburger) */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-deep-espresso focus:outline-none z-50 cursor-pointer"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-30 bg-warm-cream/98 backdrop-blur-lg flex flex-col items-center justify-center p-6 md:hidden animate-fade-in animate-duration-200">
          <nav className="flex flex-col items-center gap-8 text-xl font-bold uppercase tracking-widest text-deep-espresso">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="hover:text-deep-terracotta transition-colors cursor-pointer"
            >
              Home
            </Link>
            <Link
              href="/#story"
              onClick={() => setIsMobileMenuOpen(false)}
              className="hover:text-deep-terracotta transition-colors cursor-pointer"
            >
              Our Story
            </Link>
            <Link
              href="/#events"
              onClick={() => setIsMobileMenuOpen(false)}
              className="hover:text-deep-terracotta transition-colors cursor-pointer"
            >
              Events
            </Link>
            <Link
              href="/wishlist"
              onClick={() => setIsMobileMenuOpen(false)}
              className="hover:text-deep-terracotta transition-colors cursor-pointer"
            >
              Wishlist
            </Link>
            <Link
              href="/rsvp"
              onClick={() => setIsMobileMenuOpen(false)}
              className="hover:text-deep-terracotta transition-colors cursor-pointer"
            >
              RSVP
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}
