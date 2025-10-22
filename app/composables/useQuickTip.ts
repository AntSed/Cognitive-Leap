// app/composables/useQuickTip.ts

import { ref, readonly } from 'vue';

const tip = ref<{ title: string; message: string } | null>(null);
const isLoading = ref(false);

export function useQuickTip() {
  const supabase = useSupabaseClient();
  // 1. Убираем useI18n отсюда. Он больше не нужен.

  /**
   * Асинхронно загружает случайную подсказку.
   * @param {string} locale - Текущий язык ('en', 'ru', и т.д.)
   */
  const fetchTip = async (locale: string) => { // 2. Принимаем locale как аргумент
    if (isLoading.value || tip.value) {
      return;
    }

    isLoading.value = true;
    try {
      const { data: tipContent, error } = await supabase.rpc('get_random_public_tip');
      if (error) throw error;

        if (tipContent) {
        // Получаем и сообщение, и заголовок с фолбэком на английский
        const message = tipContent.message[locale] || tipContent.message['en'];
        const title = tipContent.title[locale] || tipContent.title['en'];

        tip.value = {
            title: title, // <-- Теперь заголовок динамический
            message: message,
        };
      } else {
        tip.value = null;
      }
    } catch (e) {
      console.error("useQuickTip: Failed to fetch tip:", e);
      tip.value = null;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    tip: readonly(tip),
    isLoading: readonly(isLoading),
    fetchTip,
  };
}