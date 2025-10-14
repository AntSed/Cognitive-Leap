// composables/useRelations.js
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSupabaseClient, useSupabaseUser } from '#imports';

// Pass profile as a ref to get inviter's name
export function useRelations(profile, fetchCallback) {
  const { t, locale } = useI18n();
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();
  
  const showModal = ref(false);
  const modalTitle = ref('');
  const inviteEmail = ref('');
  const inviteType = ref('');
  const relationType = ref('parent');

  const openModal = (type) => {
    inviteType.value = type;
    modalTitle.value = t(type === 'curator' ? 'profile_addCurator' : 'profile_addStudent');
    showModal.value = true;
  };

  const closeModal = () => {
    showModal.value = false;
    inviteEmail.value = '';
    relationType.value = 'parent';
  };

  // The function to fetch relations will be passed from the parent
  const sendInvitation = async () => {
    if (!inviteEmail.value || !user.value || !profile.value) return;
    const inviterName = profile.value.full_name || user.value.email;
    const { error } = await supabase.functions.invoke('invite-user', { 
      body: { 
        inviteeEmail: inviteEmail.value, 
        inviterId: user.value.id, 
        inviterName: inviterName, 
        inviterLang: locale.value, 
        inviteType: inviteType.value, 
        relationType: relationType.value 
      }
    });

    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      closeModal();
      if (fetchCallback) await fetchCallback();
    }
  };

  const acceptInvitation = async (relation) => {
    try {
      const { error } = await supabase.functions.invoke('confirm-invitation', { body: { relation_id: relation.id } });
      if (error) throw error;
      if (fetchCallback) await fetchCallback();
    } catch (error) {
      console.error("Error accepting invitation:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const deleteRelation = async (relation) => {
    // NOTE: We will replace confirm with a custom modal in the next step
    if (!confirm(t('profile_confirmDelete'))) return;
    try {
      // The edge function might need relation.id instead of composite keys
      const { error } = await supabase.functions.invoke('delete-relation', { body: { relation_id: relation.id } });
      if (error) throw error;
      if (fetchCallback) await fetchCallback(); 
    } catch (error) {
      console.error("Error deleting relation:", error);
    }
  };

  return {
    showModal,
    modalTitle,
    inviteEmail,
    inviteType,
    relationType,
    openModal,
    closeModal,
    sendInvitation,
    acceptInvitation,
    deleteRelation,
  };
}