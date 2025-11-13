// app\components\hub\modals\ManageStatusModal.vue
<template>
  <div class="manage-modal-content">
    <header class="modal-header">
      <h3 class="modal-title">{{ t('hub.modals.manageStatus.title') }}: {{ material.title_translations?.en }}</h3>
      <button class="modal-close-button" @click="modalStore.close()">&times;</button>
    </header>
    
    <div v-if="isLoading" class="loading-state">
      <p>{{ t('common.loading') }}...</p>
    </div>
    
    <form v-else class="manage-form" @submit.prevent="handleSubmit">
      <div class="form-section">
        <label for="status-select">{{ t('hub.filters.status') }}</label>
        <select id="status-select" v-model="currentStatus" class="form-input">
          <option value="draft">Draft</option>
          <option value="in_review">In Review</option>
          <option value="published">Published</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div class="form-section">
        <label>{{ t('hub.modals.manageStatus.attachedLessons') }}</label>
        
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
        <button type="button" class="button secondary" @click="modalStore.close()">{{ t('common.cancel') }}</button>
          <button type="submit" class="button primary" :disabled="isSaving">
            {{ isSaving ? t('common.saving') : t('common.saveChanges') }}
          </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useSupabaseClient, useI18n } from '#imports';
import { useModalStore } from '~/composables/useModalStore';

const props = defineProps({
  material: { type: Object, required: true },
  // Получаем готовый список уроков
  programLessons: { type: Array, required: true },
  // Получаем рабочий объект с инструментами
  updateTools: { type: Object, required: true }
});

const supabase = useSupabaseClient();
const modalStore = useModalStore();
const { t } = useI18n();

// --- STATE ---
const isLoading = ref(true); // Теперь загрузка будет очень быстрой
const isSaving = ref(false);
const currentStatus = ref(props.material.status);
const attachedLessonIds = ref(new Set());
const initialAttachedLessonIds = ref(new Set());
const expandedSubjects = ref(new Set());

// --- COMPUTED ---
const groupedLessons = computed(() => {
  const groups = {};
  // Работаем с данными из пропсов, а не с `allLessons.value`
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
  // Сортировка по имени, как и раньше
  return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
});

// --- METHODS ---
// toggleSubject и handleSubmit остаются БЕЗ ИЗМЕНЕНИЙ.
// Теперь handleSubmit будет работать, т.к. props.updateTools определен.

const toggleSubject = (subjectId) => {
  if (expandedSubjects.value.has(subjectId)) {
    expandedSubjects.value.delete(subjectId);
  } else {
    expandedSubjects.value.add(subjectId);
  }
};
const handleSubmit = async () => {
  isSaving.value = true;
  try {
    const promises = [];

    // 1. Обновляем статус, если он изменился
    if (currentStatus.value !== props.material.status) {
      promises.push(
        supabase
          .from('learning_apps')
          .update({ status: currentStatus.value })
          .eq('id', props.material.id)
      );
    }

    // 2. Вычисляем разницу в привязках
    const lessonsToPin = [...attachedLessonIds.value].filter(id => !initialAttachedLessonIds.value.has(id));
    const lessonsToUnpin = [...initialAttachedLessonIds.value].filter(id => !attachedLessonIds.value.has(id));

// 3. Создаем запросы на открепление (ИСПРАВЛЕНО)
    if (lessonsToUnpin.length > 0) {
      promises.push(
        ...lessonsToUnpin.map(lessonId => 
          // Используем нашу НОВУЮ, простую RPC-функцию
          supabase.rpc('unpin_material', {
            p_lesson_id: lessonId,
            p_material_id: props.material.id
          })
        )
      );
    }
    
    // 4. Создаем запросы на прикрепление (ИСПРАВЛЕНО)
    if (lessonsToPin.length > 0) {
      // Используем нашу НОВУЮ RPC, которая сама разберется с order_index
       promises.push(
         supabase.rpc('link_material_to_lessons', {
           p_material_id: props.material.id,
           p_lesson_ids: lessonsToPin,
           p_material_purpose: props.material.material_purpose // Передаем purpose
         })
       );
    }

    // 5. Выполняем все запросы параллельно
    const results = await Promise.all(promises);
    results.forEach(res => {
      if (res.error) throw res.error;
    });

    // 6. Оптимистично обновляем счетчики, используя наши инструменты
    lessonsToPin.forEach(lessonId => props.updateTools.increment(lessonId));
    lessonsToUnpin.forEach(lessonId => props.updateTools.decrement(lessonId));
    
    // 7. Обновляем список материалов, чтобы увидеть новый статус
    props.updateTools.refreshMaterials();

    modalStore.close();

  } catch (error) {
    console.error("Error saving changes:", error);
    alert(t('hub.errors.saveFailed'));
  } finally {
    isSaving.value = false;
  }
};

// --- LIFECYCLE ---
onMounted(async () => {
  isLoading.value = true;
  try {
    // УБИРАЕМ ЗАПРОС ЗА УРОКАМИ!
    // Просто запрашиваем связи для текущего материала
    const { data: links, error } = await supabase
      .from('lesson_materials')
      .select('lesson_id')
      .eq('material_id', props.material.id);
      
    if (error) throw error;
    
    const linkedIds = new Set(links.map(link => link.lesson_id));
    attachedLessonIds.value = linkedIds;
    initialAttachedLessonIds.value = new Set(linkedIds);

  } catch (error) {
    console.error("Error loading links for ManageStatusModal:", error);
  } finally {
    isLoading.value = false;
  }
});
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