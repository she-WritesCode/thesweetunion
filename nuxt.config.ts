// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@dyrected/nuxt'
  ],

  dyrected: {
    apiBase: '/api/dyrected',
    adminPath: 'admin'
  },

  runtimeConfig: {
    dyrectedApiKey: process.env.DYRECTED_API_KEY || 'sk_test_dev_key',
    public: {
      dyrectedUrl: process.env.NUXT_PUBLIC_DYRECTED_URL || 'http://localhost:3000/api/dyrected',
      dyrectedApiKey: process.env.NUXT_PUBLIC_DYRECTED_API_KEY || 'pk_test_dev_key',
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000',
    }
  },

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
  },

  hooks: {
    'modules:done'() {
      // @ts-ignore
      const nuxt = this as any
      const dyrected = nuxt?.options?.runtimeConfig?.dyrected as any
      if (dyrected) {
        const isVercel = process.env.VERCEL === '1' || process.env.NOW_BUILDER === '1'
        if (isVercel) {
          dyrected.configPath = '/var/task/dyrected.config.ts'
          dyrected.loadConfigPath = '/var/task/node_modules/@dyrected/nuxt/dist/runtime/server/plugins/loadConfig.mjs'
        }
      }
    }
  }
})
