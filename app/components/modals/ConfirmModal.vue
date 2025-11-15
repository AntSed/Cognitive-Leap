<template>
  <div class="modal-content" @click.stop>
    <h3>{{ $t('modals.confirm.title') }}</h3>
    <p>{{ message }}</p>
    <div class="modal-actions">
      <button @click="cancel" class="btn btn-secondary">{{ $t('ui.buttons.cancel') }}</button>
      <button @click="confirm" class="btn btn-primary">{{ $t('ui.buttons.confirm') }}</button>
    </div>
  </div>
</template>

<script setup>
import { useModalStore } from '~/composables/useModalStore';

defineProps({
  message: {
    type: String,
    required: true,
  },
});

const modalStore = useModalStore();

function confirm() {
  modalStore.submit(true);
}

function cancel() {
  modalStore.submit(false);
}
</script>

<style scoped>
.modal-content {
  background-color: #2c2c2c;
  padding: 25px;
  border-radius: 12px;
  border: 1px solid #444;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
  width: 90%;
  max-width: 400px;
  text-align: center;
}

h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #f0f0f0;
}

p {
  margin-bottom: 25px;
  color: #ccc;
  font-size: 16px;
  white-space: pre-wrap;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
}

.btn {
  padding: 10px 20px;
  border-radius: 5px;
  border: none;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-secondary {
  background-color: #555;
  color: white;
}
.btn-secondary:hover {
  background-color: #666;
}

.btn-primary {
  background-color: #2a643b;
  color: white;
}
.btn-primary:hover {
  background-color: #3c8d53;
}
</style>