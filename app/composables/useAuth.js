// composables/useAuth.js
import { ref } from 'vue';
import { navigateTo, useSupabaseClient } from '#imports';
import { useI18nService } from '~/composables/useI18nService';
export function useAuth() {
  const { t, locale, setLocale } = useI18nService();
  const supabase = useSupabaseClient();

  const authEmail = ref('');
  const authPassword = ref('');
  const authMessage = ref('');
  const authMessageType = ref('error');

  const _setAuthMessage = (type, messageKey, details = '') => {
    authMessageType.value = type;
    authMessage.value = t(messageKey) + (details ? `: ${details}` : '');
  };

  const handleEmailPasswordUpgrade = async () => {
    try {
      _setAuthMessage('error', '');
      if (!authEmail.value || !authPassword.value) {
        return _setAuthMessage('error', 'error_fill_fields');
      }
      const { error } = await supabase.auth.updateUser({ email: authEmail.value, password: authPassword.value });
      if (error) throw error;
    } catch (error) {
      _setAuthMessage('error', 'error_generic', error.message);
    }
  };

  const handleEmailPasswordSignIn = async () => {
    try {
      _setAuthMessage('error', '');
      if (!authEmail.value || !authPassword.value) {
        return _setAuthMessage('error', 'error_fill_fields');
      }
      await supabase.auth.signOut();
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail.value, password: authPassword.value });
      if (error) {
        await supabase.auth.signInAnonymously();
        throw new Error(t('invalidLogin'));
      }
    } catch (error) {
       authMessage.value = error.message;
       authMessageType.value = 'error';
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      _setAuthMessage('error', '');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/?view=profile` }
      });
      if (error) throw error;
    } catch (error) {
       _setAuthMessage('error', 'error_generic', error.message);
    }
  };

  const handleLinkGoogleInProfile = async () => {
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/?view=profile` }
      });
      if (error) throw error;
    } catch (error) {
      alert(t('error_linking_account') + error.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      await navigateTo('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handlePasswordReset = async () => {
    try {
      _setAuthMessage('error', '');
      if (!authEmail.value) {
        return _setAuthMessage('error', 'enterEmailForReset');
      }
      const { error } = await supabase.functions.invoke('send-magic-link', { body: { email: authEmail.value, locale: locale.value } });
      if (error) throw error;
      _setAuthMessage('success', 'resetLinkSent');
    } catch (error) {
      _setAuthMessage('error', 'error_generic', error.message);
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