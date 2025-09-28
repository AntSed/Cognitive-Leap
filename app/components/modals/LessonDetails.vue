<!-- File: components/LessonDetails.vue -->
<template>
  <div class="lesson-modal-content">
    <button class="modal-close-button" @click="close">&times;</button>
    
    <div v-if="isLoading" class="loading-state">
        <p>{{ $t('loadingLesson') }}</p>
    </div>

    <div v-else-if="lessonData">
      <div class="modal-header">
        <h2 class="topic-title">{{ lessonData.topic }}</h2>
        <p class="topic-description" v-if="lessonData.description">{{ lessonData.description }}</p>
      </div>

      <div class="tests-section" v-if="lessonData.quizzes && lessonData.quizzes.length > 0" :class="{ 'is-expanded': isTestsSectionExpanded }">
        <div class="tests-header" @click="toggleTestsSection">
          <h3>{{ $t('proveYouKnow') }}</h3>
          <div class="header-right">
            <div class="progress-bar-container" title="Общий прогресс по тестам">
              <div class="progress-bar-inner" :style="{ width: testProgress + '%' }">
                {{ Math.round(testProgress) }}%
              </div>
            </div>
            <svg class="chevron-icon" :class="{ 'is-rotated': isTestsSectionExpanded }" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </div>
        <transition name="slide-fade">
          <div v-if="isTestsSectionExpanded" class="tests-body">
            <div class="test-card" v-for="test in lessonData.quizzes" :key="test.id">
              <div class="test-info">
                <p class="test-title">{{ test.title }}</p>
              </div>
              <button @click="handleToggleTestCompletion(test.id)" class="action-button test-button">
                  {{ $t('startTest') }}
              </button>
            </div>
          </div>
        </transition>
      </div>

      <div class="materials-grid">
        <div v-for="material in processedMaterials" :key="material.id" class="material-card" :class="{ 'is-locked': material.isLocked }">
          <span class="material-icon">{{ getIconForType(material.type) }}</span>
          <h3 class="material-title">{{ material.title }}</h3>
          <p class="material-description">{{ material.description }}</p>
          
          <button @click="handleMaterialClick(material)" class="action-button material-button" :disabled="material.isLocked">
            <span>{{ getButtonTextForType(material.type) }}</span>
            <svg v-if="material.url && material.url.includes('http')" class="external-link-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-4.5 0V6M18 6h-6m6 0l-7.5 7.5" />
            </svg>
          </button>

          <div v-if="material.isLocked" class="lock-overlay">
            <svg class="lock-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 00-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useModalStore } from '~/composables/useModalStore';
import { useI18n } from 'vue-i18n';

// 1. Принимаем lessonId как prop
const props = defineProps({
  lessonId: { type: String, required: true }
});

// 2. Создаём локальное состояние для данных и статуса загрузки
const isLoading = ref(true);
const lessonData = ref(null);
const isTestsSectionExpanded = ref(false);

// 3. Получаем доступ к Supabase и другим composables
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const { locale, t } = useI18n();

// 4. Используем useModalStore только для вызова действий (закрытие и т.д.)
const modalStore = useModalStore();
const close = () => modalStore.close();

// 5. Функция загрузки данных теперь находится внутри компонента
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
    const { data, error } = await supabase.rpc('get_lesson_details', rpcArgs);
    if (error) throw error;
    lessonData.value = data;
  } catch (error) {
    console.error("Error loading lesson data inside component:", error);
    close(); // Закрываем окно в случае ошибки
  } finally {
    isLoading.value = false;
  }
};

// 6. Запускаем загрузку данных при монтировании компонента
onMounted(() => {
  fetchData(props.lessonId);
});

// Следим за изменением данных, чтобы сбросить состояние раскрытого списка
watch(() => lessonData.value, (newData) => {
  if (newData) {
    isTestsSectionExpanded.value = false;
  }
});

// Все computed-свойства и методы теперь работают с локальным состоянием
const testProgress = computed(() => {
  const quizzes = lessonData.value?.quizzes;
  if (!quizzes || quizzes.length === 0) return 0;
  const completedCount = quizzes.filter(q => q.completed).length;
  return (completedCount / quizzes.length) * 100;
});

const processedMaterials = computed(() => {
    if (!lessonData.value?.materials) return [];
    
    const materials = lessonData.value.materials;
    const completedMaterialIds = new Set(
        materials.filter(m => m.completed).map(m => m.id)
    );

    return materials.map(material => ({
        ...material,
        isLocked: material.prerequisiteId ? !completedMaterialIds.has(material.prerequisiteId) : false
    }));
});

const getIconForType = (type) => {
    return {
        'presentation': '🖥️',
        'video': '🎬',
        'game': '🎮'
    }[type] || '📚';
};

const getButtonTextForType = (type) => {
    const key = {
        'presentation': 'study',
        'video': 'watch',
        'game': 'play'
    }[type] || 'open';
    return t(key);
};

const toggleTestsSection = () => { isTestsSectionExpanded.value = !isTestsSectionExpanded.value; };

const handleToggleTestCompletion = (testId) => {
  // Тут может быть вызов метода из стора или напрямую к API
  console.log(`DEMO: Toggling completion for test ${testId}`);
};

const handleMaterialClick = (material) => {
  if (material.isLocked) return;
  // Тут может быть вызов метода из стора или напрямую к API
  console.log(`DEMO: Completing material ${material.id}`);
};
</script>

<style scoped>
/* Этот корневой класс нужен для правильного позиционирования внутри ModalWrapper */
.lesson-modal-content {
  background: #2c3e50;
  color: #ecf0f1;
  padding: 2rem;
  border-radius: 15px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  border: 1px solid #34495e;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  font-family: 'Inter', sans-serif;
}

/* Все твои остальные стили вставляются сюда без изменений */
.lesson-modal-content::-webkit-scrollbar { width: 8px; }
.lesson-modal-content::-webkit-scrollbar-track { background: #2c3e50; }
.lesson-modal-content::-webkit-scrollbar-thumb { background-color: #3498db; border-radius: 10px; border: 2px solid #2c3e50; }

.modal-close-button {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  font-size: 2rem;
  color: #7f8c8d;
  cursor: pointer;
  transition: color 0.2s;
}
.modal-close-button:hover { color: #ecf0f1; }

.modal-header {
  text-align: center;
  margin-bottom: 2rem;
  border-bottom: 1px solid #34495e;
  padding-bottom: 1rem;
}

.topic-title { font-size: 2.5rem; color: #3498db; margin: 0; }
.topic-description { font-size: 1.1rem; color: #bdc3c7; max-width: 600px; margin: 0.5rem auto 0; }

.tests-section {
  background: #34495e;
  border-radius: 10px;
  margin-bottom: 2rem;
  border: 1px solid #4a617a;
  padding: 0.5rem 1.5rem;
  transition: padding 0.3s ease;
}
.tests-section.is-expanded { padding: 1.5rem; }

.tests-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}
.tests-header h3 { font-size: 1.2rem; color: #ecf0f1; margin: 0; }

.header-right { display: flex; align-items: center; gap: 1rem; }

.progress-bar-container {
  width: 150px;
  background: rgba(0,0,0,0.3);
  border-radius: 10px;
  height: 20px;
  overflow: hidden;
}

.progress-bar-inner {
  background: linear-gradient(90deg, #27ae60, #2ecc71);
  height: 100%;
  border-radius: 10px;
  transition: width 0.5s ease;
  text-align: center;
  color: white;
  font-weight: bold;
  font-size: 0.8rem;
  line-height: 20px;
}

.chevron-icon { width: 24px; height: 24px; color: #95a5a6; transition: transform 0.3s ease; }
.chevron-icon.is-rotated { transform: rotate(180deg); }

.tests-body { margin-top: 1rem; }

.test-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0,0,0,0.2);
  padding: 1rem;
  border-radius: 8px;
  margin-top: 0.5rem;
}
.test-info p { margin: 0; color: #bdc3c7; }
.test-info p.test-title { font-weight: bold; color: #ecf0f1; }

.materials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.5rem;
}

.material-card {
  background: #34495e;
  border-radius: 10px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  text-align: center;
  transition: all 0.2s;
  border: 1px solid transparent;
  position: relative;
}
.material-card:hover:not(.is-locked) {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.4);
  border-color: #3498db;
}
.material-card.is-locked {
  /* opacity: 0.5; */ /* Убрано, так как lock-overlay лучше */
  filter: grayscale(80%);
  cursor: not-allowed;
}

.material-icon { 
  font-size: 3rem;
  margin-bottom: 1rem;
}
.material-title { margin: 0.5rem 0 0; font-size: 1.25rem; color: #ecf0f1; }
.material-description { font-size: 0.9rem; color: #bdc3c7; flex-grow: 1; margin-bottom: 1rem; }

.action-button {
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  font-size: 1rem;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  position: relative;
}
.action-button:hover:not(:disabled) {
  transform: scale(1.05);
}
.action-button:disabled {
  background: #7f8c8d;
  cursor: not-allowed;
  opacity: 0.5;
}

.material-button {
  background: #3498db;
  color: white;
  margin-top: auto;
}
.material-button:hover:not(:disabled) {
  background: #2980b9;
}

.test-button {
  background: #27ae60;
  color: white;
  padding: 0.6rem 1.2rem;
}
.test-button:hover:not(:disabled) {
  background: #229954;
}

.external-link-icon { width: 16px; height: 16px; }

.loading-state {
    display: flex; justify-content: center; align-items: center;
    height: 200px; font-size: 1.2rem; color: #bdc3c7;
}

.lock-overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background-color: rgba(44, 62, 80, 0.7);
    border-radius: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    pointer-events: all; /* Чтобы перехватывать клики */
}

.lock-icon {
    width: 50px;
    height: 50px;
    color: rgba(236, 240, 241, 0.8);
}

/* Transitions */
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
</style>