<template>
  <div class="add-new-card" @click="openAddModal">
    <div class="plus-icon">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    </div>
    <span class="card-text">Add New Material</span>
  </div>
</template>

<script setup>
import { useModalStore } from '~/composables/useModalStore';

const props = defineProps({
  lessonId: {
    type: String,
    // Изменим на false, чтобы убедиться, что prop действительно приходит
    required: true, 
  },
});



const modalStore = useModalStore();

const openAddModal = () => {
  
  modalStore.open('hub/modals/AddMaterialModal', { lessonId: props.lessonId });
};
</script>

<style scoped>
.add-new-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  min-height: 200px; /* Чтобы карточка была похожа по высоте на остальные */
  border: 3px dashed #cbd5e1; /* tailwind gray-300 */
  border-radius: 8px;
  cursor: pointer;
  background-color: #f8fafc; /* tailwind gray-50 */
  color: #64748b; /* tailwind gray-500 */
  transition: all 0.2s ease;
}

.add-new-card:hover {
  background-color: #f1f5f9; /* tailwind gray-100 */
  border-color: #94a3b8; /* tailwind gray-400 */
  color: #334155; /* tailwind gray-700 */
}

.plus-icon svg {
  width: 48px;
  height: 48px;
}

.card-text {
  font-weight: 600;
  font-size: 1.1rem;
}
</style>