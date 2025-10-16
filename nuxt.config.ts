// file: nuxt.config.ts

export default defineNuxtConfig({
  app: {
    head: {
      title: 'Cognitive Leap', 
      charset: 'utf-8',    
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
      
      link: [
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-icon.png' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/Icon1.png' },
        { rel: 'manifest', href: '/manifest.json' }
      ],

      meta: [
        { name: 'theme-color', content: '#111827' } 
      ]
    }
  },

  compatibilityDate: '2025-07-15',
  devtools: {
    enabled: true,

    timeline: {
      enabled: true,
    },
  },
  css: [
      '~/assets/css/app.css'
  ],

  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/supabase',
    '@nuxtjs/i18n' 
  ],

  supabase: {
   redirectOptions: {
      login: '/?view=profile', 
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

    langDir: 'locales', 
    defaultLocale: 'en', 
    strategy: 'no_prefix'
  },
})