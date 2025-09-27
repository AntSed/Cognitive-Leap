// file: nuxt.config.ts

export default defineNuxtConfig({
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
      login: '/profile', // Страница, куда попадает пользователь, если пытается зайти в защищенную зону без логина
      callback: '/',   // Страница, куда пользователь попадает после успешного входа (например, через Google)
      exclude: ['/confirm-invitation'], // <-- САМАЯ ВАЖНАЯ СТРОКА
    }
  },


  i18n: {
    locales: [
      { code: 'en', file: 'en.json', name: 'English' },
      { code: 'ru', file: 'ru.json', name: 'Русский' },
      { code: 'es', file: 'es.json', name: 'Español' }
    ],
    lazy: true, // Загружает только нужный язык, а не все сразу
    langDir: 'locales', // Указываем, где лежат файлы с переводами
    defaultLocale: 'en', // Язык по умолчанию
    strategy: 'no_prefix' // Не добавлять /en/ или /ru/ к URL
  },
}) 