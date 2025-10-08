// composables/useMaterialPlayer.js

import { useModalStore } from '~/composables/useModalStore';
import { useI18n } from 'vue-i18n';

export function useMaterialPlayer() {
  const modalStore = useModalStore();
  const { t } = useI18n(); // Получаем функцию для перевода

  /**
   * Определяет, какой текст должен быть на кнопке в зависимости от типа материала.
   * @param {object} material - Объект материала.
   * @returns {string} Локализованный текст для кнопки.
   */
  const getButtonText = (material) => {
    const key = {
      'presentation': 'study',
      'video': 'watch',
      'game': 'play',
      'app': 'play'
    }[material.material_type] || 'open';
    return t(key); // Используем i18n для перевода
  };

  /**
   * Запускает материал.
   * @param {object} material - Объект материала, который нужно открыть.
   */
  const playMaterial = (material) => {
    // Список типов, которые открываются во встроенном плеере
    const playerTypes = ['app', 'game', 'presentation', 'video'];

    if (playerTypes.includes(material.material_type)) {
      modalStore.openPlayer(material);
    } else {
      // Все остальные типы (например, 'article') открываются в новой вкладке
      window.open(material.url, '_blank', 'noopener,noreferrer');
    }
  };

  return {
    getButtonText,
    playMaterial,
  };
}