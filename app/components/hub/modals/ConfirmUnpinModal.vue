<template>
  <div class="confirm-modal-content">
    <div class="modal-header">
      <h3 class="modal-title">{{ t(titleKey) }}</h3>
      <button class="modal-close-button" @click="modalStore.close()">&times;</button>
    </div>
    <div class="modal-body">
      <p class="modal-message">{{ t(messageKey, messageParams) }}</p>
    </div>
    <div class="modal-footer">
      <button class="button secondary" @click="modalStore.close()">{{ t('common.cancel') }}</button>
      <button class="button danger" @click="handleConfirm">{{ t('common.confirm') }}</button>
    </div>
  </div>
</template>

<script setup>
import { useModalStore } from '~/composables/useModalStore';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const modalStore = useModalStore();

const props = defineProps({
  titleKey: { type: String, required: true },
  messageKey: { type: String, required: true },
  messageParams: { type: Object, default: () => ({}) },
  onConfirm: { type: Function, required: true },
});

const handleConfirm = () => {
  props.onConfirm();
  modalStore.close();
};
</script>

<style scoped>
/* A fresh, modern style for the confirmation dialog */
.confirm-modal-content {
  background-color: #27272A; /* dark-zinc-800 */
  color: #E4E4E7; /* light-zinc-200 */
  border-radius: 12px;
  width: 90%;
  max-width: 480px;
  border: 1px solid #3F3F46; /* dark-zinc-700 */
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  font-family: 'Inter', sans-serif;
  overflow: hidden;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #3F3F46;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #fff;
}

.modal-close-button {
  background: none;
  border: none;
  color: #A1A1AA; /* zinc-400 */
  font-size: 2rem;
  line-height: 1;
  cursor: pointer;
  transition: color 0.2s, transform 0.2s;
}
.modal-close-button:hover {
  color: #fff;
  transform: rotate(90deg);
}

.modal-body {
  padding: 1.5rem;
}

.modal-message {
  margin: 0;
  font-size: 1rem;
  line-height: 1.6;
  color: #D4D4D8; /* zinc-300 */
}

.modal-footer {
  background-color: #18181B; /* zinc-900 */
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  border-top: 1px solid #3F3F46;
}

.button {
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.2s;
  outline: none;
}
.button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0,0,0,0.3);
}

.button.secondary {
  background-color: #3F3F46;
  color: #fff;
}
.button.secondary:hover {
  background-color: #52525B; /* zinc-600 */
}

.button.danger {
  background-color: #DC2626; /* red-600 */
  color: #fff;
}
.button.danger:hover {
  background-color: #EF4444; /* red-500 */
}
</style>