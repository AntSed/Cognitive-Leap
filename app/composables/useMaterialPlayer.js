import { useModalStore } from '~/composables/useModalStore';
import { useI18n } from 'vue-i18n';

// Вспомогательная функция для проверки, является ли URL ссылкой на YouTube
function isYouTubeUrl(url) {
  if (!url) return false;
  const regExp = /^(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com|youtu\.be)/;
  return regExp.test(url);
}

export function useMaterialPlayer() {
  const modalStore = useModalStore();
  const { t } = useI18n();

  const getButtonText = (material) => {
    // Логика для текста кнопки остается той же
    const key = {
      'presentation': 'study',
      'video': 'watch',
      'game': 'play',
      'app': 'play'
    }[material.material_type] || 'open';
    return t(key);
  };

  const playMaterial = (material) => {
    const playerTypes = ['app', 'game', 'presentation']; // Убираем 'video', так как YouTube обрабатывается отдельно

    // Ключевая логика: проверяем, является ли материал ссылкой на YouTube
    if (isYouTubeUrl(material.url)) {
      // Если да, открываем наш новый специализированный плеер
      modalStore.open('modals/YouTubePlayerModal', { material });

    } else if (playerTypes.includes(material.material_type)) {
      // Иначе, для интерактивного контента, открываем старый плеер
      modalStore.openPlayer(material);

    } else {
      // Все остальное (статьи, другие ссылки) открывается в новой вкладке
      window.open(material.url, '_blank', 'noopener,noreferrer');
    }
  };

  return {
    getButtonText,
    playMaterial,
  };
}