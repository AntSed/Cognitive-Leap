import { useSupabaseClient } from '#imports';
import { useModalStore } from '~/composables/useModalStore';

export function useMaterialManagement() {
  const supabase = useSupabaseClient();
  const modalStore = useModalStore();

  const _unpinMaterialFromDB = async (materialId, lessonId, onUpdateCallback) => {
    try {
      // ИЗМЕНЕНИЕ: Вызываем нашу новую "умную" RPC-функцию
      const { error } = await supabase.rpc('unpin_material_and_reorder', {
        p_lesson_id: lessonId,
        p_material_id: materialId
      });

      if (error) throw error;
      
      if (onUpdateCallback) onUpdateCallback();

    } catch (error) {
      console.error('Error unpinning material:', error.message);
      alert(`Failed to unpin material: ${error.message}`);
    }
  };

  const _deleteMaterialFromDB = async (materialId, onUpdateCallback) => {

    try {
      const { error } = await supabase
        .from('learning_apps')
        .delete()
        .eq('id', materialId);

      if (error) throw error;

      if (onUpdateCallback) onUpdateCallback();

    } catch (error) {
      console.error('Error deleting material:', error.message);
      alert(`Failed to delete material: ${error.message}`);
    }
  };

  // ИЗМЕНЕНИЕ: Функция теперь принимает колбэк и передаёт его дальше
  const openDeleteModal = (material, onUpdateCallback) => {
    modalStore.open('hub/modals/ConfirmDeleteModal', {
      titleKey: 'hub.modals.delete.title',
      messageKey: 'hub.modals.delete.message',
      messageParams: { materialName: material.title_translations?.en || 'this material' },
      onConfirm: () => _deleteMaterialFromDB(material.id, onUpdateCallback)
    });
  };

  // ИЗМЕНЕНИЕ: Функция теперь принимает колбэк и передаёт его дальше
  const openUnpinModal = (material, lessonId, onUpdateCallback) => {
    modalStore.open('hub/modals/ConfirmUnpinModal', {
      titleKey: 'hub.modals.unpin.title',
      messageKey: 'hub.modals.unpin.message',
      messageParams: { materialName: material.title_translations?.en || 'this material' },
      onConfirm: () => _unpinMaterialFromDB(material.id, lessonId, onUpdateCallback)
    });
  };

  const openStatusModal = (material, activeProgramId, onUpdateCallback) => {
    modalStore.open('hub/modals/ManageStatusModal', {
      material: material,
      activeProgramId: activeProgramId,
      onUpdateSuccess: onUpdateCallback 
    });
  };
  
  return {
    openDeleteModal,
    openUnpinModal,
    openStatusModal,
  };
}