<template>
  <component 
    :is="tag" 
    v-if="!isEditing" 
    :class="{ 'editable': canEdit }"
    @click.stop="startEditing"
  >
    {{ modelValue || placeholder }}
  </component>
  
  <component
    :is="inputType === 'textarea' ? 'textarea' : 'input'"
    v-else
    ref="inputRef"
    :value="editingValue"
    @input="handleInput"
    :class="['inline-input', inputClass, { 'number-input': inputType === 'number' }]"
    @blur="saveChanges"
    @keydown.enter.prevent="saveChanges"
    @keydown.esc.prevent="cancelEditing"
  />
</template>

<script setup>
import { ref, nextTick, onMounted, inject } from 'vue';

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  tag: { type: String, default: 'span' },
  canEdit: { type: Boolean, default: false },
  inputType: { type: String, default: 'text' },
  placeholder: { type: String, default: '...' },
  inputClass: { type: String, default: '' }
});
const setInlineEditingState = inject('setInlineEditingState', () => {});
const emit = defineEmits(['update:modelValue']);

const isEditing = ref(false);
const inputRef = ref(null);
const editingValue = ref('');

// Initialize state from props only after the component has mounted.
onMounted(() => {
  editingValue.value = props.modelValue || '';
});

const startEditing = async () => {
  if (!props.canEdit) return;
  setInlineEditingState(true);
  editingValue.value = props.modelValue || '';
  isEditing.value = true;
  
  await nextTick();
  inputRef.value?.focus();
};

// Manually implementing v-model logic for reliability with <component :is="...">.
const handleInput = (event) => {
  editingValue.value = event.target.value;
};

const saveChanges = () => {
  if (isEditing.value && editingValue.value !== (props.modelValue || '')) {
    emit('update:modelValue', editingValue.value);
  }
  isEditing.value = false;
  setInlineEditingState(false);
};

const cancelEditing = () => {
  isEditing.value = false;
  setInlineEditingState(false);
};
</script>

<style scoped>
.editable {
  cursor: pointer;
  border-radius: 3px;
  transition: background-color 0.2s;
  min-height: 1.2em;
}
.editable:hover {
  background-color: rgba(52, 152, 219, 0.1);
}
.inline-input {
  border: 1px solid #3498db;
  outline: none;
  padding: 2px 4px;
  border-radius: 4px;
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  width: 100%;
  box-sizing: border-box;
}

/* --- NEW STYLES FOR NUMBER INPUTS --- */
.number-input {
  width: 30px; /* Makes the input box small */
  text-align: center;
}

/* Hides spinners in Chrome, Safari, Edge & Opera */
.number-input::-webkit-outer-spin-button,
.number-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Hides spinners in Firefox */
.number-input[type=number] {
  -moz-appearance: textfield;
}
</style>