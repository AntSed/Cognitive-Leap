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
    enabled: false,

    timeline: {
      enabled: false,
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

  // --- I18N CONFIGURATION (v8+ SYNTAX) ---
  i18n: {
    langDir: 'locales',

    defaultLocale: 'en',
    strategy: 'no_prefix',

    locales: [
      {
        code: 'en',
        iso: 'en-US',
        name: 'English',
        files: [
          { path: 'en/platform.json' },
          { path: 'en/games.json' }
        ]
      },
      {
        code: 'ru',
        iso: 'ru-RU',
        name: 'Русский',
        files: [
          { path: 'ru/platform.json' },
          { path: 'ru/games.json' }
        ]
      },
      {
        code: 'es',
        iso: 'es-ES',
        name: 'Español',
        files: [
          { path: 'es/platform.json' },
          { path: 'es/games.json' }
        ]
      }
    ],


    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
    },
    compilation: {
      strictMessage: false,
    }
  },
})
