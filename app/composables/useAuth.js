// composables/useAuth.js
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSupabaseClient } from '#imports';

export function useAuth() {
  const { t, locale } = useI18n();
  const supabase = useSupabaseClient();

  const authEmail = ref('');
  const authPassword = ref('');
  const authMessage = ref('');
  const authMessageType = ref('error');

  const handleEmailPasswordUpgrade = async () => {
    authMessage.value = '';
    if (!authEmail.value || !authPassword.value) {
      authMessage.value = t('error_fill_fields');
      return;
    }
    const { error } = await supabase.auth.updateUser({ email: authEmail.value, password: authPassword.value });
    if (error) { authMessage.value = error.message; }
  };

  const handleEmailPasswordSignIn = async () => {
    authMessage.value = '';
    if (!authEmail.value || !authPassword.value) {
      authMessage.value = t('error_fill_fields');
      return;
    }
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail.value, password: authPassword.value });
    if (error) {
      authMessage.value = t('invalidLogin');
      await supabase.auth.signInAnonymously();
    }
  };

  const handleGoogleSignIn = async () => {
    authMessage.value = '';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/?view=profile` }
    });
    if (error) { authMessage.value = error.message; }
  };

  const handleLinkGoogleInProfile = async () => {
    const { error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/?view=profile` }
    });
    if (error) {
      // NOTE: We will replace this with a toast notification in the next step
      alert(t('error_linking_account') + error.message);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error signing out:', error);
    else window.location.reload();
  };

  const handlePasswordReset = async () => {
    authMessage.value = '';
    if (!authEmail.value) {
      authMessageType.value = 'error';
      authMessage.value = t('enterEmailForReset');
      return;
    }
    const { error } = await supabase.functions.invoke('send-magic-link', { body: { email: authEmail.value, locale: locale.value } });
    if (error) {
      authMessageType.value = 'error';
      authMessage.value = error.message;
    } else {
      authMessageType.value = 'success';
      authMessage.value = t('resetLinkSent');
    }
  };

  return {
    authEmail,
    authPassword,
    authMessage,
    authMessageType,
    handleEmailPasswordUpgrade,
    handleEmailPasswordSignIn,
    handleGoogleSignIn,
    handleLinkGoogleInProfile,
    handleSignOut,
    handlePasswordReset
  };
}