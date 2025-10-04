import { useModalStore } from '~/composables/useModalStore';

export default defineNuxtPlugin(async (nuxtApp) => {
  // This code runs once, at the very beginning of the app's client-side lifecycle.
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();
  const { locale } = nuxtApp.$i18n;
  const modalStore = useModalStore(nuxtApp.$pinia);

  // Ensure we have a user object, even an anonymous one.
  let currentUser = user.value;
  if (!currentUser) {
    try {
      const { data } = await supabase.auth.signInAnonymously();
      currentUser = data.user;
    } catch (e) {
      console.error("Plugin: Anonymous sign-in failed:", e);
      return; // Stop if we can't get a user.
    }
  }

  // Ensure currentUser is available before proceeding.
  if (!currentUser) return;

  try {
    const userProfile = {
      p_user_id: currentUser.id,
      p_user_progress: currentUser.user_metadata?.progress || 0,
      p_user_age: currentUser.user_metadata?.age || 25,
    };

    // --- OPTIMIZATION: Call the SQL function directly via RPC ---
    // This bypasses the Edge Function and its cold start latency.
    const { data: tipObject, error } = await supabase.rpc('get_random_weighted_tip', userProfile);

    if (error) throw error;
    
    if (tipObject) {
      // The logic to select the language is now on the client, which is negligible in terms of performance.
      const message = tipObject[locale.value] || tipObject['en'];
      
      modalStore.setQuickTip({
        title: 'Pro-Tip',
        message: message,
        buttonText: null
      });
    }

  } catch (e) {
    console.error("Plugin: Failed to fetch quick tip via RPC:", e);
  }
});

