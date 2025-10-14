// composables/useProfile.js
import { ref, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSupabaseClient, useSupabaseUser } from '#imports';

export function useProfile() {
  const { locale, setLocale } = useI18n();
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();
  
  const loading = ref(true);
  const profile = ref(null);
  const curators = ref([]);
  const students = ref([]);
  const newPassword = ref('');
  const passwordUpdateMessage = ref('');
  const avatarConfig = ref({ style: 'adventurer', seed: 'cognitive-leap' });
  const isAnonymous = computed(() => user.value?.is_anonymous ?? true);
  
const avatarUrl = computed(() => {
    if (!user.value) return '';
    const seed = isAnonymous.value ? user.value.id : (avatarConfig.value.seed || user.value.id);
    const style = avatarConfig.value.style || 'adventurer';
    
    // Указываем на наш собственный API-эндпоинт
    return `/api/avatar?seed=${encodeURIComponent(seed)}&style=${encodeURIComponent(style)}`;
});

  const fetchProfileAndRelations = async () => {
    if (!user.value || isAnonymous.value) {
      loading.value = false;
      return;
    }
    
    try {
      loading.value = true;
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles').select('*').eq('user_id', user.value.id).single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;
      
      if (profileData) {
        profile.value = profileData;
        if (profileData.avatar_config) avatarConfig.value = profileData.avatar_config;
        if (profileData.language) setLocale(profileData.language);
      } else {
        const { data: newProfile, error: insertError } = await supabase
          .from('user_profiles')
          .insert({ user_id: user.value.id, full_name: user.value.user_metadata?.full_name || 'New User', language: locale.value })
          .select().single();
        if (insertError) throw insertError;
        profile.value = newProfile;
      }

      const { data: relationsData, error: relationsError } = await supabase
        .from('student_curator_relations')
        .select(`*, student:user_profiles!student_curator_relations_student_id_fkey(full_name, user_id), curator:user_profiles!student_curator_relations_curator_id_fkey(full_name, user_id)`)
        .or(`student_id.eq.${user.value.id},curator_id.eq.${user.value.id},invitee_email.eq.${user.value.email}`);
      
      if (relationsError) throw relationsError;

      curators.value = relationsData.filter(rel => rel.student_id === user.value.id || (rel.invitee_email === user.value.email && rel.student_id === null));
      students.value = relationsData.filter(rel => rel.curator_id === user.value.id || (rel.invitee_email === user.value.email && rel.curator_id === null));

    } catch (error) {
      console.error("Error fetching profile and relations:", error);
    } finally {
      loading.value = false;
    }
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
    avatarConfig.value.seed = Math.random().toString(36).substring(7);
  };
  
  // Auto-saving watchers
  watch(profile, async (newProfile, oldProfile) => {
    if (!newProfile || !oldProfile || loading.value || isAnonymous.value) return;
    const { id, created_at, user_id, ...updates } = newProfile;
    const { error } = await supabase.from('user_profiles').update(updates).eq('user_id', user.value.id);
    if (error) console.error('Error auto-saving profile:', error);
  }, { deep: true });

  watch(avatarConfig, async (newConfig) => {
    if (loading.value || isAnonymous.value || !profile.value) return;
    const { error } = await supabase.from('user_profiles').update({ avatar_config: newConfig }).eq('user_id', user.value.id);
    if (error) console.error('Error auto-saving avatar config:', error);
  }, { deep: true });

  watch(locale, async (newLocale, oldLocale) => {
    if (newLocale && newLocale !== oldLocale && user.value && !isAnonymous.value) {
      if(profile.value) profile.value.language = newLocale;
      await supabase.from('user_profiles').update({ language: newLocale }).eq('user_id', user.value.id);
    }
  });

  return {
    loading,
    profile,
    curators,
    students,
    newPassword,
    passwordUpdateMessage,
    avatarConfig,
    isAnonymous,
    avatarUrl,
    fetchProfileAndRelations,
    updatePassword,
    randomizeAvatar
  };
}