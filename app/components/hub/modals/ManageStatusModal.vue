<template>
  <div class="manage-modal-content">
    <header class="modal-header">
      <h3 class="modal-title">Manage Material: {{ material.title_translations?.en }}</h3>
      <button class="modal-close-button" @click="modalStore.close()">&times;</button>
    </header>
    
    <div v-if="isLoading" class="loading-state">
      <p>Loading lesson data...</p>
    </div>
    
    <form v-else class="manage-form" @submit.prevent="handleSubmit">
      <div class="form-section">
        <label for="status-select">Status</label>
        <select id="status-select" v-model="currentStatus" class="form-input">
          <option value="draft">Draft</option>
          <option value="in_review">In Review</option>
          <option value="published">Published</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div class="form-section">
        <label>Attached to Lessons</label>
        
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
                <input type="checkbox" :id="`lesson-${lesson.id}`" :value="lesson.id" v-model="attachedLessonIds">
                <label :for="`lesson-${lesson.id}`">{{ lesson.topic_translations?.en || 'Untitled' }}</label>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="button secondary" @click="modalStore.close()">Cancel</button>
        <button type="submit" class="button primary" :disabled="isSaving">
          {{ isSaving ? 'Saving...' : 'Save Changes' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, defineEmits } from 'vue';
import { useModalStore } from '~/composables/useModalStore';

const props = defineProps({
  material: { type: Object, required: true }
});
const emit = defineEmits(['update-success']);
const supabase = useSupabaseClient();
const modalStore = useModalStore();
const isLoading = ref(true);
const isSaving = ref(false);

const currentStatus = ref(props.material.status);
const allLessons = ref([]);
const attachedLessonIds = ref([]);
const expandedSubjects = ref(new Set()); 


const groupedLessons = computed(() => {
  const groups = {};
  allLessons.value.forEach(lesson => {
    const subjectId = lesson.subjects.id;
    const subjectName = lesson.subjects.name_translations?.en || 'Uncategorized';
    if (!groups[subjectId]) {
      groups[subjectId] = { id: subjectId, name: subjectName, lessons: [] };
    }
    groups[subjectId].lessons.push(lesson);
  });
  const sortedGroups = Object.values(groups);
  // Сортировка теперь будет выполняться
  sortedGroups.sort((a, b) => a.name.localeCompare(b.name));
  return sortedGroups;
});

const toggleSubject = (subjectId) => {
  if (expandedSubjects.value.has(subjectId)) {
    expandedSubjects.value.delete(subjectId);
  } else {
    expandedSubjects.value.add(subjectId);
  }
};

onMounted(async () => {
  try {
 
    const { data: lessonsData, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, topic_translations, subjects (id, name_translations)')
      .order('position', { ascending: true });
    if (lessonsError) throw lessonsError;
    allLessons.value = lessonsData;


    const { data: linksData, error: linksError } = await supabase
      .from('lesson_materials')
      .select('lesson_id')
      .eq('material_id', props.material.id);
    if (linksError) throw linksError;
    attachedLessonIds.value = linksData.map(link => link.lesson_id);

  } catch (error) {
    console.error("Error loading data for ManageStatusModal:", error);
  } finally {
    isLoading.value = false;
  }
});

const handleSubmit = async () => {
  isSaving.value = true;
  try {
  
    const { error: statusError } = await supabase
      .from('learning_apps')
      .update({ status: currentStatus.value })
      .eq('id', props.material.id);
    if (statusError) throw statusError;

    const { error: deleteError } = await supabase
      .from('lesson_materials')
      .delete()
      .eq('material_id', props.material.id);
    if (deleteError) throw deleteError;

    // Шаг 3: Создаём новые привязки на основе выбранных чекбоксов
    if (attachedLessonIds.value.length > 0) {
      const newLinks = attachedLessonIds.value.map((lessonId, index) => ({
        material_id: props.material.id,
        lesson_id: lessonId,
        position: index + 1, // Простое позиционирование по порядку
      }));
      const { error: insertError } = await supabase
        .from('lesson_materials')
        .insert(newLinks);
      if (insertError) throw insertError;
    }
    
    modalStore.close();
    emit('update-success');
  } catch (error) {
    console.error("Error saving changes:", error);
    alert("Failed to save changes.");
  } finally {
    isSaving.value = false;
  }
};
</script>

<style scoped>
.manage-modal-content {
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}
.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 1rem;
}
.modal-close-button {
  background: none; border: none; font-size: 2rem;
  cursor: pointer; color: #9ca3af;
}
.loading-state {
  padding: 4rem; text-align: center; font-size: 1.2rem;
}
.manage-form {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 1.5rem;
  flex-grow: 1;
}
.form-section {
  margin-bottom: 1.5rem;
}
.form-section label {
  font-weight: 500;
  display: block;
  margin-bottom: 0.5rem;
}
.form-input {
  width: 100%;
  padding: 0.6rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}
.lessons-accordion {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  max-height: 300px;
  overflow-y: auto;
}
.subject-group {
  border-bottom: 1px solid #e5e7eb;
}
.subject-group:last-child {
  border-bottom: none;
}
.subject-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 0.75rem;
  background-color: #f9fafb;
}
.subject-header:hover {
  background-color: #f3f4f6;
}
.subject-title {
  font-weight: 600;
}
.subject-chevron {
  width: 16px;
  height: 16px;
  transition: transform 0.2s;
}
.subject-chevron.is-expanded {
  transform: rotate(180deg);
}
.lesson-list {
  list-style: none;
  padding: 0.5rem 0.75rem;
  margin: 0;
}
.lesson-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
}
.lesson-option label {
  margin: 0;
  font-weight: 400;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  border-top: 1px solid #e5e7eb;
  padding-top: 1.5rem;
  margin-top: auto;
  flex-shrink: 0;
}
.button {
  padding: 0.6rem 1.2rem; border: none; border-radius: 8px;
  cursor: pointer; font-weight: 600;
}
.button.secondary { background-color: #e5e7eb; color: #111827; }
.button.primary { background-color: #4f46e5; color: #fff; }
.button:disabled { opacity: 0.5; cursor: not-allowed; }
</style>