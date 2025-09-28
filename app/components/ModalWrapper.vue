<template>
  <div class="modal-wrapper">
    <transition name="fade">
      <div v-if="isOpen" class="modal-overlay" @click="close"></div>
    </transition>

    <transition-group name="modal-scale">
      <div 
        v-for="(modal, index) in currentStack" 
        :key="modal.id" 
        class="modal-content-container" 
        :style="{ zIndex: 10000 + index }"
      >
        <component :is="modal.component" v-bind="modal.props" />
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { useModalStore } from '~/composables/useModalStore';
import { storeToRefs } from 'pinia';

const modalStore = useModalStore();
const { isOpen, currentStack } = storeToRefs(modalStore);

// ---> Нам нужна функция close из стора <---
const { close } = modalStore; 
</script>

<style scoped>
/* ... стили без изменений ... */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  z-index: 9999;
}
.modal-content-container {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  /* Это важно, чтобы клики не проходили сквозь контейнер на оверлей */
  pointer-events: none;
}
/* Восстанавливаем pointer-events для дочерних элементов, которые являются нашими модальными окнами */
.modal-content-container > :deep(*) {
  pointer-events: auto;
}
.modal-scale-enter-active, .modal-scale-leave-active {
  transition: all 0.3s ease;
}
.modal-scale-enter-from, .modal-scale-leave-to {
  opacity: 0;
  transform: scale(1.1);
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>