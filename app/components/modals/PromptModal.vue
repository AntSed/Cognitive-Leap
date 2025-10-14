<template>
  <div class="modal-content" @click.stop>
    <h3>{{ $t('modals.prompt.title') }}</h3>
    <p>{{ message }}</p>
    <input
      ref="inputRef"
      v-model="inputValue"
      type="text"
      class="prompt-input"
      @keyup.enter="submit"
    >
    <div class="modal-actions">
      <button @click="cancel" class="btn btn-secondary">{{ $t('ui.buttons.cancel') }}</button>
      <button @click="submit" class="btn btn-primary">{{ $t('ui.buttons.ok') }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useModalStore } from '~/composables/useModalStore';

const props = defineProps({
  message: {
    type: String,
    required: true,
  },
  defaultValue: {
    type: String,
    default: '',
  },
});

const modalStore = useModalStore();
const inputValue = ref(props.defaultValue);
const inputRef = ref(null);

onMounted(() => {
  inputRef.value?.focus();
});

function submit() {
  // ИЗМЕНЕНО: Вызываем новый метод `submit`
  modalStore.submit(inputValue.value);
}

function cancel() {
  // ИЗМЕНЕНО: Вызываем новый метод `submit`
  modalStore.submit(null);
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
}

h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #f0f0f0;
}

p {
  margin-bottom: 15px;
  color: #ccc;
  font-size: 16px;
}

.prompt-input {
  width: 100%;
  padding: 10px;
  box-sizing: border-box;
  margin-bottom: 25px;
  border-radius: 5px;
  border: 1px solid #555;
  background-color: #1e1e1e;
  color: #f0f0f0;
  font-size: 16px;
}
.prompt-input:focus {
  outline: none;
  border-color: #3c8d53;
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