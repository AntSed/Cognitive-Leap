// app/components/modals/LessonDetails.vue
<template>
  <div class="lesson-modal-content">
    <button class="modal-close-button" @click="close()">&times;</button>
    
    <div v-if="isLoading" class="loading-state">
        <p>{{ $t('loadingLesson') }}</p>
    </div>

    <div v-else-if="lessonData" class="lesson-container">
      <div class="modal-header">
        <h2 class="topic-title">{{ lessonData.topic }}</h2>
        <p class="topic-description" v-if="lessonData.description">{{ lessonData.description }}</p>
      </div>

      <div v-if="processedExamMaterials && processedExamMaterials.length > 0" class="tests-section" :class="{ 'is-expanded': isTestsSectionExpanded }">
        <div class="tests-header" @click="toggleTestsSection">
          <h3>{{ $t('proveYouKnow') }}</h3>
          <div class="header-right">
            <div class="progress-bar-container" title="Overall test progress">
              <div class="progress-bar-inner" :style="{ width: testProgress + '%' }">
                <span v-if="testProgress > 10">{{ Math.round(testProgress) }}%</span>
              </div>
            </div>
            <svg class="chevron-icon" :class="{ 'is-rotated': isTestsSectionExpanded }" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </div>
        <transition name="slide-fade">
          <div v-if="isTestsSectionExpanded" class="tests-body materials-grid">
            <LessonMaterialCard
              v-for="material in processedExamMaterials"
              :key="material.id"
              :material="material"
              :isLocked="material.isLocked"
            />
          </div>
        </transition>
      </div>

      <div class="materials-section">
        <h3 class="section-title">{{ $t('studyMaterials') }}</h3>
        
        <div class="materials-grid">
          <LessonMaterialCard
            v-for="material in processedStudyMaterials"
            :key="material.id"
            :material="material"
            :isLocked="material.isLocked"
          />
        </div>

      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useModalStore } from '~/composables/useModalStore';
import { useI18n } from 'vue-i18n';
import { useMaterialPlayer } from '~/composables/useMaterialPlayer';
import LessonMaterialCard from '~/components/LessonMaterialCard.vue';

const props = defineProps({
  lessonId: { type: String, required: true }
});

const isLoading = ref(true);
const lessonData = ref(null);
const isTestsSectionExpanded = ref(true); // Оставляем открытой по умолчанию

const supabase = useSupabaseClient();
const user = useSupabaseUser();
const { locale, t } = useI18n();
const modalStore = useModalStore();
const { getButtonText, playMaterial } = useMaterialPlayer();

const close = () => {
    if (modalStore.closeLesson) {
        modalStore.closeLesson();
    } else {
        modalStore.close();
    }
};

const fetchData = async (id) => {
  if (!id) return;
  isLoading.value = true;
  lessonData.value = null;
  try {
    const rpcArgs = {
        p_lesson_id: id,
        p_user_id: user.value?.id ?? null,
        p_lang_code: locale.value
    };
    // RPC теперь возвращает exam_materials и study_materials
    const { data, error } = await supabase.rpc('get_lesson_details', rpcArgs);
    if (error) throw error;
    lessonData.value = data;
  } catch (error) {
    console.error("Error loading lesson data inside component:", error);
    close();
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchData(props.lessonId);
});

// --- ОБНОВЛЕННЫЕ COMPUTED PROPERTIES ---

/**
 * Вычисляет прогресс прохождения экзаменационных материалов.
 */
const testProgress = computed(() => {
  // Используем lessonData.exam_materials
  const exams = lessonData.value?.exam_materials;
  if (!exams || exams.length === 0) return 0;
  // Считаем те, у которых поле 'completed' (из RPC) равно true
  const completedCount = exams.filter(e => e.completed).length;
  return (completedCount / exams.length) * 100;
});

/**
 * Вспомогательная функция для обработки логики блокировок
 */
const processMaterials = (materials) => {
  if (!materials) return [];
  
  const completedMaterialIds = new Set(
      materials.filter(m => m.completed).map(m => m.id)
  );

  // Добавляем ID завершенных экзаменов, чтобы разблокировать учебные материалы
  if (lessonData.value?.exam_materials) {
    lessonData.value.exam_materials
      .filter(m => m.completed)
      .forEach(m => completedMaterialIds.add(m.id));
  }

  return materials.map(material => ({
      ...material,
      isLocked: material.prerequisite_ids ? !material.prerequisite_ids.every(id => completedMaterialIds.has(id)) : false
  }));
};

/**
 * Подготавливает список УЧЕБНЫХ материалов (с логикой isLocked).
 */
const processedStudyMaterials = computed(() => {
  // Используем lessonData.study_materials
  return processMaterials(lessonData.value?.study_materials);
});

/**
 * Подготавливает список ЭКЗАМЕНАЦИОННЫХ материалов (с логикой isLocked).
 */
const processedExamMaterials = computed(() => {
  // Используем lessonData.exam_materials
  return processMaterials(lessonData.value?.exam_materials);
});


// --- ХЕНДЛЕРЫ ---

const toggleTestsSection = () => { isTestsSectionExpanded.value = !isTestsSectionExpanded.value; };

// Этот хендлер больше не нужен, т.к. LessonMaterialCard сам вызывает playMaterial
// const handleMaterialClick = (material) => { ... };

// Этот хендлер тоже не нужен, т.к. у нас больше нет кнопок в .test-card
// const handleToggleTestCompletion = (testId) => { ... };

</script>

<style scoped>
/* Новая палитра (вдохновлена Tailwind 'slate' и 'sky'):
  - Фон: #0F172A (slate-900 / Глубокий темно-синий)
  - Второстепенный фон: #1E293B (slate-800 / Темно-сине-серый)
  - Границы / Разделители: #334155 (slate-700 / Сине-серый)
  - Текст приглушенный: #94A3B8 (slate-400 / Светлый сине-серый)
  - Текст основной: #E2E8F0 (slate-200 / Почти белый)
  - Акцент 1 (Пурпурный): #A855F7 (сохранен)
  - Акцент 2 (Зеленый): #22C55E (green-500)
  - Акцент 3 (Голубой): #06B6D4 (cyan-500 / для кнопок и скролла)
*/

.lesson-modal-content {
  background: #0F172A; /* Новый фон */
  color: #E2E8F0; /* Новый основной текст */
  padding: 2rem;
  border-radius: 16px;
  width: 90%;
  max-width: 850px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  border: 1px solid #334155; /* Новая граница */
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
  font-family: 'Inter', sans-serif;
}
.lesson-modal-content::-webkit-scrollbar { width: 8px; }
.lesson-modal-content::-webkit-scrollbar-track { background: #0F172A; }
.lesson-modal-content::-webkit-scrollbar-thumb { background-color: #06B6D4; border-radius: 10px; } /* Новый акцент скролла */

.modal-close-button {
  position: absolute;
  top: 15px;
  right: 15px;
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  font-size: 1.5rem;
  line-height: 32px;
  text-align: center;
  color: #94A3B8; /* Приглушенный текст */
  cursor: pointer;
  transition: all 0.2s;
}
.modal-close-button:hover { 
  color: #fff; 
  background: #E11D48; /* Яркий акцент для "закрытия" */
  transform: rotate(90deg); 
}

.modal-header {
  text-align: center;
  margin-bottom: 2.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #334155; /* Новый разделитель */
}
.topic-title {
  font-size: 2.75rem;
  font-weight: 800;
  color: #fff;
  margin: 0;
  background: -webkit-linear-gradient(45deg, #A855F7, #D946EF);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.topic-description { 
  font-size: 1.1rem; 
  color: #94A3B8; /* Приглушенный текст */
  max-width: 600px; 
  margin: 0.75rem auto 0; 
  line-height: 1.6; 
}

.tests-section {
  background: #1E293B; /* Второстепенный фон */
  border-radius: 12px;
  margin-bottom: 2.5rem;
  border: 1px solid #334155; /* Граница */
  overflow: hidden;
  transition: all 0.3s ease;
}
.tests-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 1rem 1.5rem;
}
.tests-header h3 { 
  font-size: 1.2rem; 
  font-weight: 600; 
  color: #E2E8F0; /* Основной текст */
  margin: 0; 
}
.header-right { display: flex; align-items: center; gap: 1rem; }
.progress-bar-container {
  width: 120px;
  background: #334155; /* Фон прогресс-бара */
  border-radius: 10px;
  height: 18px;
  overflow: hidden;
}
.progress-bar-inner {
  background: linear-gradient(90deg, #7E22CE, #A855F7);
  height: 100%;
  transition: width 0.5s ease;
  text-align: center;
  color: white;
  font-weight: 600;
  font-size: 0.75rem;
  line-height: 18px;
}
.chevron-icon { width: 24px; height: 24px; color: #94A3B8; transition: transform 0.3s ease; }
.chevron-icon.is-rotated { transform: rotate(180deg); }
.tests-body { 
  padding: 1.5rem; /* Добавляем внутренний отступ для сетки */
  /* Используем ту же сетку, что и для учебных материалов */
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.5rem;
}
.test-info p { margin: 0; color: #94A3B8; }
.test-info p.test-title { font-weight: 500; color: #E2E8F0; }

/* Новый заголовок для секции материалов */
.materials-section {
  /* Можно добавить отступ, если нужно */
}
.section-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #E2E8F0;
  margin: 0 0 1.5rem 0;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #334155;
}


.materials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.5rem;
}

.action-button {
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  outline: none;
}
.action-button:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
}
.action-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}



.test-button {
  background: #16A34A; /* Оригинальный зеленый */
  color: white;
  padding: 0.6rem 1.2rem;
}
.test-button:hover:not(:disabled) {
  background: #22C55E; /* Более яркий зеленый */
}

.loading-state {
  display: flex; 
  justify-content: center; 
  align-items: center;
  height: 200px; 
  font-size: 1.2rem; 
  color: #94A3B8;
}


.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}
.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}
@media (max-width: 768px) {
  .lesson-modal-content {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .lesson-modal-content::-webkit-scrollbar {
    display: none;
  }
}
</style>
