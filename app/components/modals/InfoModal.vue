// app/components/modals/InfoModal.vue
<template>
  <div class="info-modal-content">
    <button class="modal-close-button" @click="close()">&times;</button>
    <h3 v-if="title">{{ title }}</h3>
    <p>{{ message }}</p>
    
    <!-- This button will now only render if the `buttonText` prop is provided -->
    <button v-if="buttonText" class="action-button" @click="close()">
      {{ buttonText }}
    </button>
  </div>
</template>

<script setup>
import { useModalStore } from '~/composables/useModalStore';

defineProps({
  title: { type: String, required: false },
  message: { type: String, required: true },
  // This prop now controls the existence of the button
  buttonText: { type: String, required: false, default: 'OK' }
});

const { close } = useModalStore();
</script>

<style scoped>
.info-modal-content {
  padding: 2rem;
  text-align: center;
  background: #2c3e50; 
  color: #ecf0f1;
  border-radius: 15px; 
  width: 90%; 
  max-width: 500px;
  position: relative;
}
h3 { 
  margin-top: 0; 
  color: #3498db; 
}
p { 
  font-size: 1.1em; 
  min-height: 50px; 
}
.modal-close-button {
  position: absolute; 
  top: 10px; 
  right: 15px; 
  background: none;
  border: none; 
  font-size: 2rem; 
  color: #7f8c8d; 
  cursor: pointer;
}
.action-button {
  background: #3498db; 
  color: white; 
  border: none;
  padding: 0.75rem 1.5rem; 
  border-radius: 8px; 
  cursor: pointer;
  font-weight: bold; 
  font-size: 1rem; 
  margin-top: 1rem;
}
</style>
