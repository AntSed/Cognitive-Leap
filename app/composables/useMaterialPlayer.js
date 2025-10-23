// app/composables/useMaterialPlayer.js
import { useModalStore } from '~/composables/useModalStore';
import { useI18n } from 'vue-i18n';

/**
 * Helper function to check if a URL is a YouTube link.
 * @param {string} url The URL to check.
 * @returns {boolean}
 */
function isYouTubeUrl(url) {
  if (!url) return false;
  // This regex matches youtube.com and youtu.be links
  const regExp = /^(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com|youtu\.be)/;
  return regExp.test(url);
}

/**
 * Composable to manage material playback logic.
 */
export function useMaterialPlayer() {
  const modalStore = useModalStore();
  const { t } = useI18n();

  /**
   * Gets the localized call-to-action text for the play button.
   * @param {object} material The material object.
   * @returns {string} Localized button text.
   */
  const getButtonText = (material) => {
    const key = {
      'presentation': 'study',
      'video': 'watch',
      'game': 'play',
      'app': 'play',
      'external_link': 'open',
      'article': 'read'
    }[material.material_type] || 'open';
    return t(key);
  };

  /**
   * Determines how to open a material based on its type and URL.
   * @param {object} material The material object.
   */
  const playMaterial = (material) => {
    const internalPlayerTypes = ['app', 'game', 'presentation'];

    // --- REFACTORED LOGIC ---

    // 1. Highest priority: If it's an 'external_link', always open in a new tab.
    // This fixes the bug where external YouTube links were opening in a modal.
    if (material.material_type === 'external_link') {
      window.open(material.url, '_blank', 'noopener,noreferrer');
      return;
    }

    // 2. Handle 'video' types.
    if (material.material_type === 'video') {
      if (isYouTubeUrl(material.url)) {
        // If it's a 'video' AND a YouTube link, use the special player.
        modalStore.open('modals/YouTubePlayerModal', { material });
      } else {
        // If it's another video (Vimeo, etc.), open in a new tab for now.
        window.open(material.url, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    // 3. Handle internal player types (app, game, presentation).
    // This completes the refactoring by removing 'openPlayer'.
    if (internalPlayerTypes.includes(material.material_type)) {
      modalStore.open(
        'modals/PlayerModal', // Direct path to the modal
        { material },           // Props
        { history: false }      // Options (this was implied by openPlayer)
      );
      return;
    }

    // 4. Fallback for any other types with a URL (like 'article').
    if (material.url) {
      window.open(material.url, '_blank', 'noopener,noreferrer');
    } else {
      console.warn('playMaterial: No URL found or action defined for material:', material);
    }
  };

  return {
    getButtonText,
    playMaterial,
  };
}
