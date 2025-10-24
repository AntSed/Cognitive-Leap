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

const modalStore = useModalStore();
const nuxtApp = useNuxtApp();

// --- ИСПРАВЛЕНИЕ ГИДРАТАЦИИ ---

// 1. Мы ВСЕГДА (и на сервере, и на клиенте) начинаем с 'false'.
//    Сервер отрендерит лоадер. Клиент при гидратации тоже будет
//    считать, что isAuthReady = false, и увидит лоадер.
//    Mismatch ИСЧЕЗНЕТ.
const isAuthReady = ref(false);

// 2. Вся логика, которая зависит от браузера и плагинов, остается в onMounted.
onMounted(() => {
  // 3. Как только клиент "оживет", мы немедленно (immediate: true)
  //    синхронизируем наш локальный isAuthReady с реальным
  //    состоянием из твоего плагина.
  watch(nuxtApp.$auth.isAuthReady, (newValue) => {
    isAuthReady.value = newValue;
  }, { immediate: true }); // 'immediate' запустит это сразу, не дожидаясь изменений

  // --- Остальная логика твоего макета ---
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