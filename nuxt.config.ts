// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  app: {
    head: {
      title: 'Adun & Uche — #TheSweetUnion',
      htmlAttrs: {
        lang: 'en',
        class: 'h-full antialiased scroll-smooth'
      },
      bodyAttrs: {
        class: 'min-h-full flex flex-col'
      },
      meta: [
        { name: 'description', content: 'A custom wedding website and wishlist for Adun & Uche\'s celebration. Celebrate our sweet union with us.' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Cormorant+Upright:wght@300;400;500;600;700&family=Italiana&family=Jost:ital,wght@0,100..900;1,100..900&family=Lora:ital,wght@0,400..700;1,400..700&display=swap' }
      ]
    }
  },

  css: [
    '~/assets/css/globals.css'
  ],

  postcss: {
    plugins: {
      '@tailwindcss/postcss': {},
    }
  }
})
