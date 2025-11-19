// composables/useProfile.js
import { ref, watch, watchEffect, computed } from 'vue';
import { useSupabaseClient, useSupabaseUser, useNuxtApp } from '#imports';
import { debounce } from '~/utils/debounce';
import { useI18nService } from '~/composables/useI18nService';

export function useProfile() {
  const { t, locale, setLocale } = useI18nService();
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();
  const { $auth } = useNuxtApp();

  const loading = useState('profile-loading', () => true);
  const profile = useState('profile-data', () => null);
  const newPassword = ref(''); // Local state is fine for password input
  const passwordUpdateMessage = ref('');
  const avatarConfig = useState('profile-avatar-config', () => ({ style: 'adventurer', seed: 'cognitive-leap' }));
  const isAnonymous = computed(() => user.value?.is_anonymous ?? true);

  const avatarUrl = useState('profile-avatar-url', () => '');

  // Watcher to update avatarUrl when config or user changes
  watchEffect(() => {
    if (!user.value) {
      avatarUrl.value = '';
      return;
    }

    const seed = isAnonymous.value ? user.value.id : (avatarConfig.value.seed || user.value.id);
    const style = avatarConfig.value.style || 'adventurer';
    avatarUrl.value = `/api/avatar?seed=${encodeURIComponent(seed)}&style=${encodeURIComponent(style)}`;
  });

  const fetchProfile = async () => {
    // This function now assumes user.value definitely exists.
    if (!user.value || isAnonymous.value) {
      loading.value = false;
      return;
    }

    try {
      loading.value = true;
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.value.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;

      if (profileData) {
        profile.value = profileData;
        if (profileData.avatar_config) avatarConfig.value = profileData.avatar_config;
        if (profileData.language && profileData.language !== locale.value) {
          await setLocale(profileData.language);
        }
      } else {
        const { data: newProfile, error: insertError } = await supabase
          .from('user_profiles')
          .insert({ user_id: user.value.id, full_name: user.value.user_metadata?.full_name || 'New User', language: locale.value })
          .select()
          .single();
        if (insertError) throw insertError;
        profile.value = newProfile;
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      loading.value = false;
    }
  };

  const init = async () => {
    await $auth.waitForAuth();
    await fetchProfile();
  };
  const updatePassword = async () => {
    if (!newPassword.value) return;
    passwordUpdateMessage.value = '';
    const { error } = await supabase.auth.updateUser({ password: newPassword.value });
    if (error) {
      passwordUpdateMessage.value = `Error: ${error.message}`;
    } else {
      passwordUpdateMessage.value = t('profile_passwordUpdated');
      newPassword.value = '';
      setTimeout(() => passwordUpdateMessage.value = '', 3000);
    }
  };

  const randomizeAvatar = () => {
    if (!avatarConfig.value) return;
    avatarConfig.value.seed = Math.random().toString(36).substring(7);
  };

  const debouncedProfileUpdate = debounce(async (updates, userId) => {
    const { error } = await supabase.from('user_profiles').update(updates).eq('user_id', userId);
    if (error) console.error('Error auto-saving profile:', error);
  }, 700);

  const debouncedAvatarUpdate = debounce(async (newConfig, userId) => {
    const { error } = await supabase.from('user_profiles').update({ avatar_config: newConfig }).eq('user_id', userId);
    if (error) console.error('Error auto-saving avatar config:', error);
  }, 500);

  watch(profile, (newProfile, oldProfile) => {
    if (!newProfile || !oldProfile || loading.value || isAnonymous.value) return;
    const { id, created_at, user_id, ...updates } = newProfile;
    debouncedProfileUpdate(updates, user.value.id);
  }, { deep: true });

  watch(avatarConfig, (newConfig) => {
    if (loading.value || isAnonymous.value || !profile.value) return;
    debouncedAvatarUpdate(newConfig, user.value.id);
  }, { deep: true });

  watch(locale, async (newLocale, oldLocale) => {
    if (newLocale && newLocale !== oldLocale && user.value && !isAnonymous.value) {
      if (profile.value) profile.value.language = newLocale;
      await supabase.from('user_profiles').update({ language: newLocale }).eq('user_id', user.value.id);
    }
  });

  return {
    loadingProfile: loading,
    profile,
    newPassword,
    passwordUpdateMessage,
    avatarConfig,
    isAnonymous,
    avatarUrl,
    fetchProfile,
    updatePassword,
    randomizeAvatar,
    init,
  };
}