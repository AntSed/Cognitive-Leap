<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <ModalWrapper />

    <PlayerModal 
      v-if="modalStore.isPlayerOpen" 
      :url="modalStore.playerUrl" 
    />
  </div>
</template>

<script setup>
// Здесь только самые необходимые глобальные импорты
import { useModalStore } from '~/composables/useModalStore';
import { useI18n } from 'vue-i18n';
import ModalWrapper from '~/components/ModalWrapper.vue';
import PlayerModal from '~/components/modals/PlayerModal.vue'; // Убедись, что путь верный
const { locale } = useI18n();
const modalStore = useModalStore();

watch(locale, () => {
  // Если язык изменился и есть открытые модалки, закрываем их все
  if (modalStore.isOpen) {
    modalStore.closeAll();
  }
});
const handleStorageChange = (event) => {
  // Стандартный ключ, который использует @nuxtjs/i18n для хранения языка
  if (event.key === 'i18n:locale' && event.newValue) {
    // Принудительно устанавливаем новый язык в текущей вкладке
    setLocale(event.newValue);
  }
};

// Подписываемся на событие, когда компонент монтируется
onMounted(() => {
  window.addEventListener('storage', handleStorageChange);
});

// Отписываемся, когда компонент размонтируется, чтобы избежать утечек памяти
onUnmounted(() => {
  window.removeEventListener('storage', handleStorageChange);
});
</script>

