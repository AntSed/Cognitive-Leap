<template>
  <div v-if="!isAuthReady" class="initial-loader">

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
// layouts/default.vue
<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useModalStore } from '~/composables/useModalStore';
import { useI18nService } from '~/composables/useI18nService';
import ModalWrapper from '~/components/ModalWrapper.vue';
import PlayerModal from '~/components/modals/PlayerModal.vue';

// --- УНИВЕРСАЛЬНОЕ РЕШЕНИЕ ДЛЯ SSR и КЛИЕНТА ---

// 1. Проверяем, где мы находимся.
const isServer = process.server;

// 2. Создаем isAuthReady в зависимости от окружения.
//    - На сервере: isAuthReady ВСЕГДА false. Сервер не должен ждать клиентский плагин.
//      Он просто покажет загрузчик и отправит страницу браузеру.
//    - На клиенте: Берем настоящее реактивное состояние из нашего плагина.
const isAuthReady = isServer ? ref(false) : useNuxtApp().$auth.isAuthReady;


const modalStore = useModalStore();

// 3. Вся логика, которая зависит от браузера и плагинов, остается в onMounted.
//    onMounted выполняется ТОЛЬКО на клиенте, поэтому здесь все безопасно.
onMounted(() => {
  modalStore.initializeModalListeners();

  const { locale, setLocale } = useI18nService();

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