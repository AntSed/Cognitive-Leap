// composables/useRelations.js
import { ref } from 'vue';
import { useSupabaseClient, useSupabaseUser } from '#imports';
import { useI18nService } from '~/composables/useI18nService';

export function useRelations() {
  const { t, locale, setLocale } = useI18nService();
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();

  const loading = ref(false);
  const curators = ref([]);
  const students = ref([]);

  const showModal = ref(false);
  const modalTitle = ref('');
  const inviteEmail = ref('');
  const inviteType = ref('');
  const relationType = ref('parent');

  const fetchRelations = async () => {
    if (!user.value) return;
    
    try {
      loading.value = true;
      const { data, error } = await supabase
        .from('student_curator_relations')
        .select(`*, student:user_profiles!student_curator_relations_student_id_fkey(full_name, user_id), curator:user_profiles!student_curator_relations_curator_id_fkey(full_name, user_id)`)
        .or(`student_id.eq.${user.value.id},curator_id.eq.${user.value.id},invitee_email.eq.${user.value.email}`);

      if (error) throw error;

      curators.value = data.filter(rel => rel.student_id === user.value.id || (rel.invitee_email === user.value.email && rel.student_id === null));
      students.value = data.filter(rel => rel.curator_id === user.value.id || (rel.invitee_email === user.value.email && rel.curator_id === null));
    } catch (error) {
      console.error("Error fetching relations:", error);
    } finally {
      loading.value = false;
    }
  };

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

  const sendInvitation = async () => {
    if (!inviteEmail.value || !user.value) return;

    try {
      const { data: inviterProfile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', user.value.id)
        .single();
      
      const inviterName = inviterProfile?.full_name || user.value.email;

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

      if (error) throw error;

      closeModal();
      await fetchRelations();
    } catch (error) {
      console.error("Error sending invitation:", error);
    }
  };

  const acceptInvitation = async (relation) => {
    try {
      const { error } = await supabase.functions.invoke('confirm-invitation', { body: { relation_id: relation.id } });
      if (error) throw error;
      await fetchRelations();
    } catch (error) {
      console.error("Error accepting invitation:", error);
    }
  };

  const deleteRelation = async (relation) => {
    if (!confirm(t('profile_confirmDelete'))) return;

    try {
      const { error } = await supabase.functions.invoke('delete-relation', { body: { relation_id: relation.id } });
      if (error) throw error;
      await fetchRelations();
    } catch (error) {
      console.error("Error deleting relation:", error);
    }
  };

  return {
    loadingRelations: loading,
    curators,
    students,
    showModal,
    modalTitle,
    inviteEmail,
    inviteType,
    relationType,
    fetchRelations,
    openModal,
    closeModal,
    sendInvitation,
    acceptInvitation,
    deleteRelation,
  };
}