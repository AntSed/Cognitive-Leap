<template>
  <transition name="fade">
    <div
      v-if="visible"
      :class="['notification', type, { 'is-action': !!actionCallback }]"
      @click="handleActionClick"
    >
      <p>
        {{ message }}
        <span v-if="actionText" class="action-text">{{ actionText }}</span>
      </p>
    </div>
  </transition>
</template>

<script setup>
import { ref } from 'vue';

const visible = ref(false);
const message = ref('');
const type = ref('info');
const actionText = ref('');
const actionCallback = ref(null);
let timeoutId = null;

function show(options) {
  const { 
    message: msg, 
    type: msgType = 'info', 
    duration = 3000, 
    action = null 
  } = options;

  message.value = msg;
  type.value = msgType;
  actionCallback.value = action ? action.callback : null;
  actionText.value = action ? action.text : '';
  
  clearTimeout(timeoutId);
  visible.value = true;
  
  if (duration) {
    timeoutId = setTimeout(() => {
      hide();
    }, duration);
  }
}

function hide() {
  visible.value = false;
  // Сбрасываем, чтобы не "моргнуло" старым текстом при следующем показе
  actionCallback.value = null; 
  actionText.value = '';
}

function handleActionClick() {
  if (typeof actionCallback.value === 'function') {
    actionCallback.value();
    hide();
  }
}

defineExpose({ show });
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
  max-width: 350px; /* Добавим max-width для длинных сообщений */
  transition: all 0.3s ease-in-out;
}

.notification.is-action {
  cursor: pointer;
  border-left-color: #3b82f6; /* Blue for action */
}

.notification.is-action:hover {
  background-color: #444;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

.notification p {
  margin: 0;
}

.action-text {
  font-weight: bold;
  text-decoration: underline;
  margin-left: 8px;
  color: #a5c8ff; /* Светло-голубой для акцента */
}

.notification.success { border-left-color: #4CAF50; }
.notification.error { border-left-color: #f44336; }

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s, transform 0.5s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateX(calc(100% + 20px));
}
</style>