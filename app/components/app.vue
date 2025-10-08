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
import ModalWrapper from '~/components/ModalWrapper.vue';
import PlayerModal from '~/components/modals/PlayerModal.vue'; // Убедись, что путь верный

const modalStore = useModalStore();

// Глобальные настройки для <head> или <body> можно оставить здесь,
// например, useHead для классов body, если это нужно на всех страницах.
</script>

