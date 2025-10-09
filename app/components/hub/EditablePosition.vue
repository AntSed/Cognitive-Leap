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
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  cursor: pointer;
  min-width: 28px;
  text-align: center;
}
.position-display {
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 500;
  color: #7f8c8d;
  background-color: #ecf0f1;
  transition: background-color 0.2s;
}
.editable-position:hover .position-display {
  background-color: #bdc3c7;
  color: #2c3e50;
}
.position-input {
  width: 45px;
  padding: 3px;
  border: 2px solid #3498db;
  border-radius: 6px;
  text-align: center;
  font-weight: bold;
  outline: none;
}
</style>