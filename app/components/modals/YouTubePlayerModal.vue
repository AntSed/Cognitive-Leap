<template>
  <div class="youtube-modal-overlay" @click.stop="closeOnOverlayClick">
    <div class="modal-content" @click.stop>
      <header class="modal-header">
        <span class="video-title">{{ material.title_translations?.en || 'YouTube Player' }}</span>
        <button class="close-button" @click="modalStore.close()" title="Close">×</button>
      </header>
      <div class="video-container">
        <iframe
          :src="embedUrl"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useModalStore } from '~/composables/useModalStore';

const props = defineProps({
  material: {
    type: Object,
    required: true,
  },
});

const modalStore = useModalStore();

/**
 * Преобразует обычную ссылку YouTube в URL для встраивания (embed)
 * и добавляет параметры для лучшего отображения.
 */
const embedUrl = computed(() => {
  if (!props.material.url) return '';

  const regExp = /(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([\w-]{11})(?:\S+)?/i;
  const match = props.material.url.match(regExp);
  const videoId = match && match[1];

  if (videoId) {
    // Формируем URL с параметрами
    const params = new URLSearchParams({
      autoplay: '1',         // Автоматическое воспроизведение
      rel: '0',              // Не показывать похожие видео с других каналов
      modestbranding: '1',   // Уменьшить брендинг YouTube
      iv_load_policy: '3',   // Отключить аннотации
      controls: '1',         // Показать элементы управления
    });
    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  }
  
  // Возвращаем исходный URL, если это не YouTube
  return props.material.url;
});

const closeOnOverlayClick = (event) => {
  if (event.target === event.currentTarget) {
    modalStore.close();
  }
};
</script>

<style scoped>
.youtube-modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.85);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.modal-content {
  background-color: #18181B; /* Темный фон */
  border-radius: 12px;
  width: 100%;
  max-width: 1100px; /* Ширина для видео */
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  color: #E4E4E7;
}

.video-title {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.close-button {
  background: none;
  border: none;
  color: #A1A1AA;
  font-size: 2.5rem;
  line-height: 1;
  cursor: pointer;
  transition: color 0.2s, transform 0.2s;
}
.close-button:hover {
  color: #fff;
  transform: rotate(90deg);
}

.video-container {
  position: relative;
  width: 100%;
  /* Современный способ поддержания соотношения сторон */
  aspect-ratio: 16 / 9;
  background-color: #000;
}

.video-container iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>