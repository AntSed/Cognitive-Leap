// composables/useMaterialManagement.js

import { useSupabaseClient } from '#imports';
import { useModalStore } from '~/composables/useModalStore';

/**
 * Composable для управления материалами: открытие модальных окон
 * и выполнение действий (удаление, открепление, смена статуса).
 */
export function useMaterialManagement() {
  const supabase = useSupabaseClient();
  const modalStore = useModalStore();

  // --- "Приватная" функция, выполняющая реальное удаление ---
  const _deleteMaterialFromDB = async (materialId) => {
    try {
      const { error } = await supabase
        .from('learning_apps')
        .delete()
        .eq('id', materialId);

      if (error) throw error;

      // TODO: Заменить на более элегантное обновление списка без перезагрузки
      window.location.reload(); 

    } catch (error) {
      console.error('Error deleting material:', error.message);
      // TODO: Заменить на красивое уведомление об ошибке
      alert(`Failed to delete material: ${error.message}`);
    }
  };

  // --- Функции, которые будут вызываться из компонента карточки ---

  /**
   * Открывает модальное окно для подтверждения удаления материала.
   * @param {object} material - Объект материала, который нужно удалить.
   */
  const openDeleteModal = (material) => {

    modalStore.open('hub/modals/ConfirmDeleteModal', {
      titleKey: 'hub.modals.delete.title',
      messageKey: 'hub.modals.delete.message',
      messageParams: {
        materialName: material.title_translations?.en || 'this material'
      },
      onConfirm: () => _deleteMaterialFromDB(material.id)
    });
  };
  /**
   * Открывает модальное окно для подтверждения открепления материала от урока.
   * @param {object} material - Объект материала.
   * @param {string} lessonId - ID урока, от которого открепляем.
   */
  const openUnpinModal = (material, lessonId) => {
    console.log(`TODO: Open Unpin Modal for material ${material.id} from lesson ${lessonId}`);
    // Здесь будет логика для модального окна ConfirmUnpinModal
    // modalStore.open('modals/ConfirmUnpinModal', { ... });
  };

  /**
   * Открывает модальное окно для изменения статуса и привязки к урокам.
   * @param {object} material - Объект материала.
   */
  const openStatusModal = (material) => {
    console.log(`TODO: Open Status Modal for material ${material.id}`);
    // Здесь будет логика для модального окна ManageStatusModal
    // modalStore.open('modals/ManageStatusModal', { ... });
  };


  return {
    openDeleteModal,
    openUnpinModal,
    openStatusModal,
  };
}