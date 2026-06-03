<script setup lang="ts">
import { ref } from 'vue'
import { siteConfig } from '~/config/site'

const isMobileMenuOpen = ref(false)
</script>

<template>
  <div>
    <!-- Navigation Bar -->
    <header class="fixed top-0 left-0 right-0 z-40 bg-warm-cream/80 backdrop-blur-md border-b border-amber-gold/10 px-6 py-4">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <NuxtLink
          to="/"
          class="text-xl md:text-2xl font-bold tracking-wide text-deep-espresso font-display-cinzel cursor-pointer"
        >
          {{ siteConfig.couple.hashtag }}
        </NuxtLink>
        
        <!-- Desktop Navigation -->
        <nav class="hidden md:flex items-center gap-8 text-sm font-semibold uppercase tracking-wider">
          <NuxtLink to="/" class="hover:text-deep-terracotta transition-colors cursor-pointer">
            Home
          </NuxtLink>
          <NuxtLink to="/#story" class="hover:text-deep-terracotta transition-colors cursor-pointer">
            Our Story
          </NuxtLink>
          <NuxtLink to="/#events" class="hover:text-deep-terracotta transition-colors cursor-pointer">
            Events
          </NuxtLink>
          <NuxtLink to="/wishlist" class="hover:text-deep-terracotta transition-colors cursor-pointer">
            Wishlist
          </NuxtLink>
          <NuxtLink to="/rsvp" class="hover:text-deep-terracotta transition-colors cursor-pointer">
            RSVP
          </NuxtLink>
        </nav>

        <!-- Mobile Menu Button (Hamburger) -->
        <button
          @click="isMobileMenuOpen = !isMobileMenuOpen"
          class="md:hidden p-2 text-deep-espresso focus:outline-none z-50 cursor-pointer"
          aria-label="Toggle menu"
        >
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path v-if="isMobileMenuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </header>

    <!-- Mobile Drawer Menu -->
    <div v-if="isMobileMenuOpen" class="fixed inset-0 z-30 bg-warm-cream/98 backdrop-blur-lg flex flex-col items-center justify-center p-6 md:hidden animate-fade-in animate-duration-200">
      <nav class="flex flex-col items-center gap-8 text-xl font-bold uppercase tracking-widest text-deep-espresso">
        <NuxtLink
          to="/"
          @click="isMobileMenuOpen = false"
          class="hover:text-deep-terracotta transition-colors cursor-pointer"
        >
          Home
        </NuxtLink>
        <NuxtLink
          to="/#story"
          @click="isMobileMenuOpen = false"
          class="hover:text-deep-terracotta transition-colors cursor-pointer"
        >
          Our Story
        </NuxtLink>
        <NuxtLink
          to="/#events"
          @click="isMobileMenuOpen = false"
          class="hover:text-deep-terracotta transition-colors cursor-pointer"
        >
          Events
        </NuxtLink>
        <NuxtLink
          to="/wishlist"
          @click="isMobileMenuOpen = false"
          class="hover:text-deep-terracotta transition-colors cursor-pointer"
        >
          Wishlist
        </NuxtLink>
        <NuxtLink
          to="/rsvp"
          @click="isMobileMenuOpen = false"
          class="hover:text-deep-terracotta transition-colors cursor-pointer"
        >
          RSVP
        </NuxtLink>
      </nav>
    </div>
  </div>
</template>
