<template>
  <TransitionGroup name="modal-scale">
    <div
      v-for="modal in modalStore.currentStack"
      :key="modal.id"
      class="modal-backdrop"
      @click.self="modalStore.close()"
    >
      <component :is="modal.component" v-bind="modal.props" :key="locale" />
    </div>
  </TransitionGroup>
</template>

<script setup>
import { useModalStore } from '~/composables/useModalStore';

const modalStore = useModalStore();
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1001; /* Должен быть выше всего остального */
}

/* Анимация для появления */
.modal-scale-enter-active {
  transition: all 0.2s ease-out;
}
.modal-scale-leave-active {
  transition: all 0.2s ease-in;
}
.modal-scale-enter-from,
.modal-scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>