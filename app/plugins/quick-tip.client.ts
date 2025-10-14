import { useModalStore } from '~/composables/useModalStore';
import { useSupabaseClient, useSupabaseUser } from '#imports';
import { watch } from 'vue';

export default defineNuxtPlugin((nuxtApp) => {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();
  const { locale } = nuxtApp.$i18n;
  const modalStore = useModalStore(nuxtApp.$pinia);

  // Flag to ensure the tip is fetched only once per page load.
  let hasFetchedTip = false;

  modalStore.showQuickTipShell();

  watch(user, async (currentUser) => {
    // Proceed only if we have a user AND we haven't fetched a tip yet.
    if (currentUser && !hasFetchedTip) {
      // Immediately set the flag to prevent re-running.
      hasFetchedTip = true;
      
      try {
        const userProfile = {
          p_user_id: currentUser.id,
          p_user_progress: currentUser.user_metadata?.progress || 0,
          p_user_age: currentUser.user_metadata?.age || 25,
        };

        const { data: tipObject, error } = await supabase.rpc('get_random_weighted_tip', userProfile);
        if (error) throw error;
        
        if (tipObject) {
          const message = tipObject[locale.value] || tipObject['en'];
          modalStore.setQuickTip({
            title: 'Pro-Tip',
            message: message,
            buttonText: null
          });
        } else {
          modalStore.hideQuickTip();
        }

      } catch (e) {
        console.error("Plugin: Failed to fetch quick tip via RPC:", e);
        modalStore.hideQuickTip();
      }
    }
  }, { 
    immediate: true 
  });
});