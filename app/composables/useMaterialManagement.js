import { useModalStore } from '~/composables/useModalStore';
import { useSupabaseClient } from '#imports';
import { useI18n } from 'vue-i18n';

/**
 * A composable for managing material-related actions like opening
 * modals for status changes, unpinning, and deletion.
 * It handles the interaction with the modal store and the database.
 */
export function useMaterialManagement() {
  const modalStore = useModalStore();
  const supabase = useSupabaseClient();
  const { t } = useI18n();

  /**
   * Opens the modal to manage a material's status and its lesson links.
   * This function acts as a bridge, passing necessary pre-loaded data to the modal.
   * @param {object} material - The material object to manage.
   * @param {Array} programLessons - The pre-loaded list of all lessons in the program to avoid re-fetching.
   * @param {object} updateTools - The object with specific update functions { increment, decrement, refreshMaterials }.
   */
  const openStatusModal = (material, programLessons, updateTools) => {
    modalStore.open('hub/modals/ManageStatusModal', {
      material,
      programLessons, // Pass the pre-loaded lessons
      updateTools,    // Pass the entire tools object
    });
  };

  /**
   * Opens a confirmation modal to unpin a material from a specific lesson.
   * On confirmation, it performs the database operation and then uses the update tools
   * for an optimistic UI response.
   * @param {object} material - The material to unpin.
   * @param {string} lessonId - The ID of the lesson to unpin from.
   * @param {object} updateTools - The update tools object.
   */
  const openUnpinModal = (material, lessonId, updateTools) => {
    modalStore.open('hub/modals/ConfirmUnpinModal', {
      titleKey: 'hub.modals.unpin.title',
      messageKey: 'hub.modals.unpin.message',
      messageParams: { materialName: material.title_translations?.en || 'this material' },
      onConfirm: async () => {
        try {
          const { error } = await supabase.rpc('unpin_material_and_reorder', {
            p_lesson_id: lessonId,
            p_material_id: material.id
          });

          if (error) throw error;

          // Optimistic UI update: decrement count and refresh the grid
          updateTools.decrement(lessonId);
          updateTools.refreshMaterials();

        } catch (err) {
          console.error('Error unpinning material:', err);
          alert(t('hub.errors.unpinMaterialFailed'));
        }
      }
    });
  };

  /**
   * Opens a confirmation modal to permanently delete a material.
   * On confirmation, it deletes the material from the database and refreshes the material list.
   * @param {object} material - The material to delete.
   * @param {object} updateTools - The update tools object.
   */
  const openDeleteModal = (material, updateTools) => {
    modalStore.open('hub/modals/ConfirmDeleteModal', {
      titleKey: 'hub.modals.delete.title',
      messageKey: 'hub.modals.delete.message',
      messageParams: { materialName: material.title_translations?.en || 'this material' },
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('learning_apps')
            .delete()
            .eq('id', material.id);
          
          if (error) throw error;
          
          // Refresh the grid to show the material has been removed
          updateTools.refreshMaterials();

        } catch (err) {
          console.error('Error deleting material:', err);
          alert(t('hub.errors.deleteMaterialFailed'));
        }
      }
    });
  };
  
  return {
    openDeleteModal,
    openUnpinModal,
    openStatusModal,
  };
}

