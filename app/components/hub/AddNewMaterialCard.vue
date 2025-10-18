// app\components\hub\AddNewMaterialCard.vue
<template>
  <div class="add-new-card" @click="openAddFlow">
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
  selectedLessonId: {
    type: String,
    default: null,
  },
  allProgramLessons: {
    type: Array,
    required: true,
  },
  updateTools: {
    type: Object,
    required: true,
  }
});

const modalStore = useModalStore();

const openAddFlow = () => {
  // If a lesson is already selected (the simple case)
  if (props.selectedLessonId) {
    modalStore.open('hub/modals/AddMaterialModal', { 
      // Pass an array with the single selected lesson id
      lessonIds: [props.selectedLessonId],
      onSuccess: props.updateTools.refreshMaterials 
    });
  } else {
    // If no lesson is selected, start the two-step process
    modalStore.open('hub/modals/SelectLessonsModal', {
      programLessons: props.allProgramLessons,
      // Define what to do AFTER lessons are selected in the new modal
      onComplete: (selectedIds) => {
        // Now, open the final modal, passing the lessons selected by the user
        modalStore.open('hub/modals/AddMaterialModal', {
          lessonIds: selectedIds,
            onSuccess: () => {
              // Now we can refresh both, ensuring lesson counts are updated
              props.updateTools.refreshMaterials();
              props.updateTools.refreshTree(); 
            }
        });
      }
    });
  }
};
</script>

<style scoped>
.add-new-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  min-height: 200px;
  border: 3px dashed #cbd5e1;
  border-radius: 8px;
  cursor: pointer;
  background-color: #f8fafc;
  color: #64748b;
  transition: all 0.2s ease;
}

.add-new-card:hover {
  background-color: #f1f5f9;
  border-color: #94a3b8;
  color: #334155;
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
