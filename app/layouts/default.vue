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

// HYDRATION FIX:
// 1. Always start with 'false' (both server and client) to ensure loader is rendered consistently.
// This prevents hydration mismatches.
const isAuthReady = ref(false);

// 2. All browser and plugin-dependent logic remains in onMounted.
onMounted(() => {
  // 3. Once the client is hydrated, immediately synchronize local isAuthReady with the actual plugin state.
  watch(nuxtApp.$auth.isAuthReady, (newValue) => {
    isAuthReady.value = newValue;
  }, { immediate: true }); // 'immediate' ensures this runs once on mount without waiting for changes.

  // Rest of the layout logic.
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