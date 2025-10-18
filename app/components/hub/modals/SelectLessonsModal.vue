<template>
  <div class="select-lessons-modal-content">
    <header class="modal-header">
      <h3 class="modal-title">Select Lessons to Attach</h3>
      <button class="modal-close-button" @click="modalStore.close()">&times;</button>
    </header>
    
    <div class="modal-body">
      <p class="modal-instructions">
        Choose one or more lessons where this new material will be added.
      </p>
      
      <div class="lessons-accordion">
        <div v-for="subject in groupedLessons" :key="subject.id" class="subject-group">
          <div class="subject-header" @click="toggleSubject(subject.id)">
            <h4 class="subject-title">{{ subject.name }}</h4>
            <svg class="subject-chevron" :class="{ 'is-expanded': expandedSubjects.has(subject.id) }" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
          <ul v-if="expandedSubjects.has(subject.id)" class="lesson-list">
            <li v-for="lesson in subject.lessons" :key="lesson.id" class="lesson-option">
              <input type="checkbox" :id="`lesson-${lesson.id}`" :value="lesson.id" v-model="selectedLessonIds">
              <label :for="`lesson-${lesson.id}`">{{ lesson.topic_translations?.en || 'Untitled' }}</label>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div class="modal-footer">
      <button type="button" class="button secondary" @click="modalStore.close()">Cancel</button>
      <button type="button" class="button primary" :disabled="selectedLessonIds.size === 0" @click="handleNext">
        Next
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useModalStore } from '~/composables/useModalStore';

const props = defineProps({
  programLessons: { type: Array, required: true },
  onComplete: { type: Function, required: true }
});

const modalStore = useModalStore();

const selectedLessonIds = ref(new Set());
const expandedSubjects = ref(new Set());

const groupedLessons = computed(() => {
  const groups = {};
  props.programLessons.forEach(lesson => {
    const subject = lesson.subjects;
    if (!subject) return;

    const subjectId = subject.id;
    const subjectName = subject.name_translations?.en || 'Uncategorized';
    if (!groups[subjectId]) {
      groups[subjectId] = { id: subjectId, name: subjectName, lessons: [] };
    }
    groups[subjectId].lessons.push(lesson);
  });
  return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
});

const toggleSubject = (subjectId) => {
  if (expandedSubjects.value.has(subjectId)) {
    expandedSubjects.value.delete(subjectId);
  } else {
    expandedSubjects.value.add(subjectId);
  }
};

const handleNext = () => {
  if (selectedLessonIds.value.size > 0) {
    // Pass the array of selected IDs to the callback function
    props.onComplete([...selectedLessonIds.value]);
  }
};
</script>

<style scoped>
/* You can copy the styles from ManageStatusModal.vue and adapt them */
.select-lessons-modal-content {
  background-color: #fff;
  color: #111827;
  max-width: 600px;
  width: 90vw;
  border-radius: 12px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.3);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1rem 1.5rem; border-bottom: 1px solid #e5e7eb;
}
.modal-title { font-size: 1.25rem; font-weight: 600; }
.modal-close-button { background: none; border: none; font-size: 2rem; cursor: pointer; color: #9ca3af; }
.modal-body { padding: 1.5rem; overflow-y: auto; }
.modal-instructions { margin-bottom: 1.5rem; color: #4b5563; }
.lessons-accordion { border: 1px solid #d1d5db; border-radius: 6px; max-height: 400px; overflow-y: auto; }
.subject-group { border-bottom: 1px solid #e5e7eb; }
.subject-group:last-child { border-bottom: none; }
.subject-header { display: flex; justify-content: space-between; align-items: center; cursor: pointer; padding: 0.75rem; background-color: #f9fafb; }
.subject-title { font-weight: 600; }
.subject-chevron { width: 16px; height: 16px; transition: transform 0.2s; }
.subject-chevron.is-expanded { transform: rotate(180deg); }
.lesson-list { list-style: none; padding: 0.5rem 0.75rem; margin: 0; }
.lesson-option { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0; }
.lesson-option label { margin: 0; font-weight: 400; }
.modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid #e5e7eb; padding: 1.5rem; }
.button { padding: 0.6rem 1.2rem; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }
.button.secondary { background-color: #e5e7eb; color: #111827; }
.button.primary { background-color: #4f46e5; color: #fff; }
.button:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
