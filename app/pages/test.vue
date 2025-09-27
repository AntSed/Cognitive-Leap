<template>
  <div class="test-page-container">
    <SceneKit v-if="skinId" :skin-id="skinId" :is-active="true" />
    <div v-else>Loading skin...</div>
    <LessonModal />
  </div>
</template>

<script setup>
import SceneKit from '~/components/SceneKit.client.vue';
import LessonModal from '~/components/LessonModal.client.vue';

// --- !!! ВАЖНО !!! ---
// Вставь сюда ID твоего нового скина "Tree V2" из Шага 1
const skinId = '38c24e69-24f9-4a7c-a003-84d298280c14';
</script>

<style scoped>
.test-page-container {
  width: 100vw;
  height: 100vh;
  background-color: #1a202c;
  color: white;
  position: relative; /* Добавляем, чтобы модальное окно позиционировалось корректно */
}
</style>
