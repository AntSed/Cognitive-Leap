<!-- app/components/LessonMaterialCard.vue -->
<template>
  <div class="material-card" :class="{ 'is-locked': isLocked }">
    <span class="material-icon">{{ icon }}</span>
    
    <h3 class="material-title">{{ material.title }}</h3>
    <p v-if="material.description" class="material-description">{{ material.description }}</p>

    <button
      @click="handlePlay"
      class="action-button material-button"
      :disabled="isLocked"
    >
      <span>{{ buttonText }}</span>
      <svg v_if="isExternal" class="external-link-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-4.5 0V6M18 6h-6m6 0l-7.5 7.5" />
      </svg>
    </button>

    <div v-if="isLocked" class="lock-overlay">
      <svg class="lock-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 00-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useMaterialPlayer } from '~/composables/useMaterialPlayer';

const props = defineProps({
  material: {
    type: Object,
    required: true
  },
  isLocked: {
    type: Boolean,
    default: false
  }
});

// --- Логика плеера ---
const { getButtonText, playMaterial } = useMaterialPlayer();

const buttonText = computed(() => getButtonText(props.material));

const handlePlay = () => {
  if (props.isLocked) return;
  playMaterial(props.material);
};

// --- Логика отображения ---

// Иконки для типов материалов
const icon = computed(() => {
  return {
    'presentation': '🖥️',
    'video': '🎬',
    'game': '🎮',
    'app': '🕹️', // Используем другую иконку для 'app', чтобы различать
    'article': '📰',
    'external_link': '🔗'
  }[props.material.material_type] || '📚'; // 📚 как по умолчанию
});

// Показываем иконку "внешней ссылки" для типов, которые открываются в новой вкладке
const isExternal = computed(() => {
  const internalTypes = ['app', 'game', 'presentation', 'video'];
  // Если тип не внутренний ИЛИ это 'video', но не YouTube -> это внешняя ссылка
  if (!internalTypes.includes(props.material.material_type)) {
    return true;
  }
  if (props.material.material_type === 'video' && !isYouTubeUrl(props.material.url)) {
    return true;
  }
  return false;
});

// Хелпер, который нам нужен для isExternal (можно вынести)
function isYouTubeUrl(url) {
  if (!url) return false;
  const regExp = /^(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com|youtu\.be)/;
  return regExp.test(url);
}
</script>

<style scoped>
/* Стили скопированы из LessonDetails.vue и адаптированы */
.material-card {
  background: #27272A;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  text-align: center;
  transition: all 0.2s;
  border: 1px solid #3F3F46;
  position: relative;
  overflow: hidden;
  font-family: 'Inter', sans-serif;
}
.material-card:hover:not(.is-locked) {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.5);
  border-color: #A855F7;
}
.material-card.is-locked {
  filter: saturate(0.5);
  cursor: not-allowed;
}
.material-icon { 
  font-size: 3rem;
  margin-bottom: 1rem;
  line-height: 1;
}
.material-title { 
  margin: 0.5rem 0 0; 
  font-size: 1.25rem; 
  font-weight: 600; 
  color: #fff; 
}
.material-description { 
  font-size: 0.9rem; 
  color: #A1A1AA; 
  flex-grow: 1; /* Заставляет описание заполнять место, толкая кнопку вниз */
  margin-top: 0.5rem;
  margin-bottom: 1.5rem; 
  line-height: 1.4;
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
  margin-top: auto; /* Прижимает кнопку к низу карточки */
}
.action-button:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
}
.action-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.material-button {
  background: #7E22CE;
  color: white;
}
.material-button:hover:not(:disabled) {
  background: #9333EA;
}
.external-link-icon { width: 16px; height: 16px; }

.lock-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(24, 24, 27, 0.8);
  backdrop-filter: blur(4px);
  border-radius: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: all;
}
.lock-icon {
  width: 50px;
  height: 50px;
  color: rgba(228, 228, 231, 0.6);
}
</style>