// file: nuxt.config.ts

export default defineNuxtConfig({
  app: {
    head: {
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover', 
    }
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  css: [
      '~/assets/css/app.css'
  ],
    router: {
    options: {
      scrollBehavior(to, from, savedPosition) {
        if (to.hash && to.hash.includes('access_token')) {
          return;
        }
        return savedPosition || { top: 0 };
      }
    }
  },
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/supabase',
    '@nuxtjs/i18n' 
  ],

  supabase: {
   redirectOptions: {
      login: '/profile', 
      callback: '/',
      exclude: ['/confirm-invitation'],
    }
  },


  i18n: {
    locales: [
      { code: 'en', file: 'en.json', name: 'English' },
      { code: 'ru', file: 'ru.json', name: 'Русский' },
      { code: 'es', file: 'es.json', name: 'Español' }
    ],
    lazy: true,
    langDir: 'locales', 
    defaultLocale: 'en', 
    strategy: 'no_prefix'
  },
}) 