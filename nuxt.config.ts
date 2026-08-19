// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",

  modules: ["@dyrected/nuxt"],

  runtimeConfig: {
    dyrectedApiKey: process.env.DYRECTED_API_KEY || "sk_test_dev_key",
    dyrectedUrl:
      process.env.NUXT_PUBLIC_DYRECTED_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}/api/dyrected`
        : process.env.PORT
          ? `http://localhost:${process.env.PORT}/api/dyrected`
          : "http://localhost:3000/api/dyrected"),
    gmailUser: process.env.GMAIL_USER || "",
    gmailAppPassword: process.env.GMAIL_APP_PASSWORD || "",
    emailFrom: process.env.EMAIL_FROM || "",
    public: {
      dyrectedUrl:
        process.env.NUXT_PUBLIC_DYRECTED_URL ||
        (process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}/api/dyrected`
          : "http://localhost:3000/api/dyrected"),
      dyrectedApiKey: process.env.NUXT_PUBLIC_DYRECTED_API_KEY || "pk_test_dev_key",
      appUrl:
        process.env.NUXT_PUBLIC_DYRECTED_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
    },
  },

  app: {
    head: {
      title: "Adun & Uche — #TheSweetUnion",
      htmlAttrs: {
        lang: "en",
        class: "h-full antialiased scroll-smooth",
      },
      bodyAttrs: {
        class: "min-h-full flex flex-col",
      },
      meta: [
        {
          name: "description",
          content:
            "A custom wedding website and wishlist for Adun & Uche's celebration. Celebrate our sweet union with us.",
        },
      ],
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Cormorant+Upright:wght@300;400;500;600;700&family=Italiana&family=Jost:ital,wght@0,100..900;1,100..900&family=Lora:ital,wght@0,400..700;1,400..700&display=swap",
        },
      ],
    },
  },

  css: ["~/assets/css/globals.css", "vue-tel-input/vue-tel-input.css"],

  postcss: {
    plugins: {
      "@tailwindcss/postcss": {},
    },
  },

  nitro: {
    hooks: {
      compiled() {
        const cache = (globalThis as any).__dyrectedPostgresClientCache;
        if (cache) {
          for (const entry of cache.values()) {
            if (entry?.sql?.end) {
              entry.sql.end({ timeout: 0 }).catch(() => {});
            }
          }
          cache.clear();
        }
      },
    },
  },
});
