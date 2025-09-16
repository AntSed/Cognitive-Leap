<!-- File: components/LessonModal.client.vue -->
<template>
  <transition name="fade">
    <div v-if="modal.isOpen.value" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <button class="modal-close-button" @click="closeModal">&times;</button>
        
        <div v-if="modal.isLoading.value" class="loading-state">
            <p>{{ $t('loadingLesson') }}</p>
        </div>

        <div v-else-if="modal.lessonData.value">
          <div class="modal-header">
            <h2 class="topic-title">{{ modal.lessonData.value.topic }}</h2>
            <p class="topic-description" v-if="modal.lessonData.value.description">{{ modal.lessonData.value.description }}</p>
          </div>

          <!-- Collapsible Tests Section -->
          <div class="tests-section" v-if="modal.lessonData.value.quizzes && modal.lessonData.value.quizzes.length > 0" :class="{ 'is-expanded': isTestsSectionExpanded }">
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
                <div class="test-card" v-for="test in modal.lessonData.value.quizzes" :key="test.id">
                  <div class="test-info">
                    <p class="test-title">{{ test.title }}</p>
                  </div>
                  <button @click="toggleTestCompletion(test.id)" class="action-button test-button">
                     {{ $t('startTest') }}
                  </button>
                </div>
              </div>
            </transition>
          </div>

          <!-- Materials Grid -->
          <div class="materials-grid">
            <div v-for="material in processedMaterials" :key="material.id" class="material-card" :class="{ 'is-locked': material.isLocked }">
              <!-- Контент карточки всегда виден -->
              <span class="material-icon">{{ getIconForType(material.type) }}</span>
              <h3 class="material-title">{{ material.title }}</h3>
              <p class="material-description">{{ material.description }}</p>
              
              <!-- Кнопка всегда на месте, но может быть заблокирована -->
              <button @click="handleMaterialClick(material)" class="action-button material-button" :disabled="material.isLocked">
                <span>{{ getButtonTextForType(material.type) }}</span>
                <svg v-if="material.url && material.url.includes('http')" class="external-link-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-4.5 0V6M18 6h-6m6 0l-7.5 7.5" />
                </svg>
              </button>

              <!-- Полупрозрачный оверлей с замком для заблокированных карточек -->
              <div v-if="material.isLocked" class="lock-overlay">
                <svg class="lock-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 00-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useModalStore } from '~/composables/useModalStore';
import { useI18n } from 'vue-i18n';

const modal = useModalStore();
const { t } = useI18n(); // Используем composable для доступа к функции перевода
const isTestsSectionExpanded = ref(false);

watch(() => modal.lessonData.value, (newData) => {
  if (newData) {
    isTestsSectionExpanded.value = false;
  }
});

const testProgress = computed(() => {
  const quizzes = modal.lessonData.value?.quizzes;
  if (!quizzes || quizzes.length === 0) return 0;
  const completedCount = quizzes.filter(q => q.completed).length;
  return (completedCount / quizzes.length) * 100;
});

const processedMaterials = computed(() => {
    if (!modal.lessonData.value?.materials) return [];
    
    const materials = modal.lessonData.value.materials;
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
    return t(key); // Используем функцию t() для получения перевода
};

const closeModal = () => modal.close();
const toggleTestsSection = () => { isTestsSectionExpanded.value = !isTestsSectionExpanded.value; };
const toggleTestCompletion = (testId) => modal.toggleTestCompletion(testId);
const handleMaterialClick = (material) => {
  if (material.isLocked) return;
  modal.completeMaterial(material.id);
};
</script>

<style scoped>
.loading-state {
    display: flex; justify-content: center; align-items: center;
    height: 200px; font-size: 1.2rem; color: #bdc3c7;
}

.material-card {
    position: relative;
}

.lock-overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background-color: rgba(44, 62, 80, 0.7);
    border-radius: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    pointer-events: none;
}

.lock-icon {
    width: 50px;
    height: 50px;
    color: rgba(236, 240, 241, 0.8);
}

.material-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.action-button {
    background: #3498db; color: white; border: none;
    padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer;
    font-weight: bold; font-size: 1rem; transition: all 0.2s;
    display: inline-flex; align-items: center; justify-content: center;
    gap: 0.5rem; position: relative;
}
.action-button:hover:not(:disabled) {
    background: #2980b9;
    transform: scale(1.05);
}
.action-button:disabled {
    background: #7f8c8d;
    cursor: not-allowed;
    opacity: 0.5;
}
.material-button {
    margin-top: auto;
}
.test-button {
    background: #27ae60;
    padding: 0.6rem 1.2rem;
}
.test-button:hover {
    background: #229954;
}

.external-link-icon {
    width: 16px;
    height: 16px;
}
</style>
