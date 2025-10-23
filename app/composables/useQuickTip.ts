import { ref, readonly } from 'vue';

const tip = ref<{ title: string; message: string } | null>(null);
const isLoading = ref(false);

export function useQuickTip() {
  const supabase = useSupabaseClient();

  const fetchTip = async (locale: string) => {
    if (isLoading.value || tip.value) {
      return;
    }
    isLoading.value = true;
    try {
      const { data: tipContent, error } = await supabase.rpc('get_random_public_tip');
      if (error) throw error;

      if (tipContent) {
        const message = tipContent.message[locale] || tipContent.message['en'];
        const title = tipContent.title[locale] || tipContent.title['en'];

        tip.value = {
          title: title,
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