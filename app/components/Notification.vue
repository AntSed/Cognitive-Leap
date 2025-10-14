<template>
  <transition name="fade">
    <div v-if="visible" :class="['notification', type]">
      <p>{{ message }}</p>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  message: String,
  type: {
    type: String,
    default: 'info' // 'info', 'success', 'error'
  },
  duration: {
    type: Number,
    default: 3000
  }
});

const visible = ref(false);
let timeout = null;

// Эта функция будет вызываться из родительского компонента
function show() {
  clearTimeout(timeout);
  visible.value = true;
  timeout = setTimeout(() => {
    visible.value = false;
  }, props.duration);
}

// Раскрываем функцию для родителя
defineExpose({
  show
});
</script>

<style scoped>
.notification {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background-color: #333;
  color: white;
  padding: 15px 25px;
  border-radius: 8px;
  border-left: 5px solid #555;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  min-width: 250px;
}

.notification.success {
  border-left-color: #4CAF50; /* Зеленый */
}

.notification.error {
  border-left-color: #f44336; /* Красный */
}

/* Анимация появления/исчезновения */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s, transform 0.5s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>