<template>
  <div class="player-modal-overlay" @click="closeOnOverlayClick">
    <button class="close-button" @click="modalStore.close()">&times;</button>
    
    <div class="player-content" @click.stop>
      <!-- Case 1: Interactive content (game, app, presentation) uses srcdoc -->
      <iframe 
        v-if="contentType === 'interactive'"
        :srcdoc="htmlContent"
        frameborder="0"
        allowfullscreen
        sandbox="allow-scripts allow-same-origin"
      ></iframe>
      
      <!-- Case 2: Other content (like video) uses the direct URL -->
      <iframe
        v-else
        :src="url"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
    </div>
  </div>
</template>

<script setup>
import { useModalStore } from '~/composables/useModalStore';

// The component now accepts different props based on the content type
const props = defineProps({
  htmlContent: {
    type: String,
    required: false,
    default: ''
  },
  url: {
    type: String,
    required: false,
    default: ''
  },
  contentType: {
    type: String,
    required: true,
  }
});

const modalStore = useModalStore();

const closeOnOverlayClick = (event) => {
  if (event.target === event.currentTarget) {
    modalStore.close();
  }
};
</script>

<style scoped>
.player-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.85);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer; /* Indicates the overlay is clickable */
}

.close-button {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  background-color: #333;
  color: #fff;
  border: none;
  border-radius: 50%;
  font-size: 2rem;
  line-height: 40px;
  text-align: center;
  cursor: pointer;
  z-index: 2002;
}

.player-content {
  width: 95%;
  height: 95%;
  background-color: #000;
  border-radius: 10px;
  overflow: hidden;
  cursor: default; /* The content area itself is not a close button */
}

iframe {
  width: 100%;
  height: 100%;
}
</style>

