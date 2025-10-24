// app/components/hub/EditablePosition.vue
<template>
  <div class="editable-position" @click.stop="startEditing">
    <input
      v-if="isEditing"
      ref="inputRef"
      v-model.number="editablePosition"
      type="number"
      class="position-input"
      @blur="finishEditing"
      @keydown.enter.prevent="finishEditing"
      @keydown.esc.prevent="cancelEditing"
    />
    <span v-else class="position-display">
      {{ modelValue }}
    </span>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue';

const props = defineProps({
  modelValue: { type: Number, required: true }
});

const emit = defineEmits(['update:modelValue']);

const isEditing = ref(false);
const editablePosition = ref(props.modelValue);
const inputRef = ref(null);

const startEditing = async () => {
  editablePosition.value = props.modelValue;
  isEditing.value = true;
  await nextTick(); // Ждем, пока input появится в DOM
  inputRef.value?.focus();
  inputRef.value?.select();
};

const finishEditing = () => {
  if (isEditing.value && editablePosition.value !== props.modelValue && editablePosition.value > 0) {
    emit('update:modelValue', editablePosition.value);
  }
  isEditing.value = false;
};

const cancelEditing = () => {
  editablePosition.value = props.modelValue;
  isEditing.value = false;
};
</script>

<style scoped>
.editable-position {
  cursor: pointer;
  min-width: 28px;
  text-align: center;
}
.position-display {
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 500;
  transition: background-color 0.2s, color 0.2s;
  color: var(--editable-position-color, #7f8c8d);
  background-color: var(--editable-position-bg, #ecf0f1);
}
.editable-position:hover .position-display {
  color: var(--editable-position-hover-color, #2c3e50);
  background-color: var(--editable-position-hover-bg, #bdc3c7);
}
.position-input {
  width: 45px;
  padding: 3px;
  border: 2px solid #3498db;
  border-radius: 6px;
  text-align: center;
  font-weight: bold;
  outline: none;
  background-color: #374151;
  color: #f3f4f6;
}

/* --- НОВЫЕ ПРАВИЛА ДЛЯ УДАЛЕНИЯ СТРЕЛОК --- */
/* Для Chrome, Safari, Edge, Opera */
.position-input::-webkit-outer-spin-button,
.position-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
/* Для Firefox */
.position-input[type=number] {
  -moz-appearance: textfield;
}
</style>