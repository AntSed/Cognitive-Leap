<template>
  <div v-if="!isAuthReady" class="initial-loader">
    <p>Cognitive Leap</p>
  </div>

  <template v-else>
    <slot />

    <ModalWrapper />
    <PlayerModal 
      v-if="modalStore.isPlayerOpen" 
      :url="modalStore.playerUrl" 
    />
  </template>
</template>

<script setup>
import { onMounted, onUnmounted, watch } from 'vue';
import { useModalStore } from '~/composables/useModalStore';
import { useI18nService } from '~/composables/useI18nService'; // <-- ПРАВИЛЬНЫЙ ИМПОРТ
import ModalWrapper from '~/components/ModalWrapper.vue';
import PlayerModal from '~/components/modals/PlayerModal.vue';

const { isAuthReady } = useNuxtApp().$auth;
const modalStore = useModalStore();

onMounted(() => {
  // Инициализируем слушатели модальных окон
  modalStore.initializeModalListeners();

  // Получаем i18n из нашего единого сервиса
  const { locale, setLocale } = useI18nService(); // <-- ПРАВИЛЬНЫЙ ВЫЗОВ

  watch(locale, () => {
    if (modalStore.isOpen) {
      modalStore.closeAll();
    }
  });

  const handleStorageChange = (event) => {
    if (event.key === 'i18n:locale' && event.newValue) {
      setLocale(event.newValue);
    }
  };

  window.addEventListener('storage', handleStorageChange);

  onUnmounted(() => {
    window.removeEventListener('storage', handleStorageChange);
  });
});
</script>

