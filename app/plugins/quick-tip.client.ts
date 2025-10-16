// plugins/quick-tip.client.ts
import { useModalStore } from '~/composables/useModalStore';
import { useSupabaseClient } from '#imports';

// 1. Убираем 'async' из определения плагина. Теперь он не блокирует загрузку.
export default defineNuxtPlugin((nuxtApp) => {
  const supabase = useSupabaseClient();
  const modalStore = useModalStore();
  
  // 2. Оборачиваем всю асинхронную логику в самовызывающуюся async-функцию.
  // Это заставит ее выполняться в "фоновом режиме", не останавливая приложение.
  (async () => {
    // Получаем i18n здесь, внутри async-контекста, когда плагины уже доступны
    const { locale } = nuxtApp.$i18n;

    modalStore.showQuickTipShell();

    try {
      const { data: tipContent, error } = await supabase.rpc('get_random_public_tip');
      if (error) throw error;
      
      if (tipContent) {
        const message = tipContent[locale.value] || tipContent['en'];

        modalStore.setQuickTip({
          title: 'Pro-Tip',
          message: message,
          buttonText: null
        });
      } else {
        modalStore.hideQuickTip();
      }
    } catch (e) {
      console.error("Plugin: Failed to fetch public quick tip:", e);
      modalStore.hideQuickTip();
    }
  })(); // <-- Немедленно вызываем функцию
});