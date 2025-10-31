<template>
  <div class="vue-player-overlay" @click="closeOnOverlayClick" ref="playerOverlayRef">
    <header class="player-header">
      <!-- Fullscreen Button Added -->
      <button @click="toggleFullscreen" :title="isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen & Rotate'" class="fullscreen-button">
        <svg v-if="!isFullscreen" class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"></path></svg>
        <svg v-else class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"></path></svg>
      </button>
      <button class="close-button" @click="modalStore.close()">×</button>
    </header>

    <div class="vue-player-content" @click.stop>
      <component 
        v-if="activeComponent"
        :is="activeComponent"
        :material="material" 
        @completed="handleMaterialCompleted"
      />
      
      <div v-else class="loading-error">
        <p><strong>Error: Component not found.</strong></p>
        <p>Could not find component at path:</p>
        <p><code>{{ componentPath }}</code></p>
        <p>(Check browser console for details)</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, shallowRef, defineAsyncComponent, onMounted, onUnmounted } from 'vue';
import { useModalStore } from '~/composables/useModalStore';
import { useSupabaseClient, useSupabaseUser } from '#imports';

const props = defineProps({
  material: { type: Object, required: true }
});

const modalStore = useModalStore();
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const isSubmitting = ref(false);

// --- Fullscreen State ---
const playerOverlayRef = ref(null);
const isFullscreen = ref(false);

// --- 1. DYNAMIC COMPONENT LOADER ---

const componentModules = import.meta.glob('~/components/**/*.vue');
const componentPath = `/components/${props.material.component_name}.vue`;
const importer = componentModules[componentPath];
const activeComponent = shallowRef(null);

if (importer) {
  activeComponent.value = defineAsyncComponent(importer);
} else {
  // Cleaned up error log
  console.error(`[VuePlayerModal] Component not found. Attempted key: ${componentPath}`);
}


// --- 2. HANDLE COMPLETION ---
async function handleMaterialCompleted(payload) {
  if (isSubmitting.value) return;
  console.log('[VuePlayerModal] Received @completed signal.', payload);

  if (!user.value) {
    console.warn('[VuePlayerModal] No user, closing modal without saving progress.');
    modalStore.close();
    return;
  }
  
  isSubmitting.value = true;
  try {
    const { data, error } = await supabase.functions.invoke('set-material-completed', {
      body: {
        materialId: props.material.id,
        score: payload?.score || 1.0 
      }
    });

    if (error) throw error;
    console.log('[VuePlayerModal] Edge function invoked successfully.', data);

  } catch (e) {
    console.error('[VuePlayerModal] Failed to invoke "set-material-completed":', e);
  } finally {
    isSubmitting.value = false;
  }
}

// --- 3. FULLSCREEN LOGIC ---

const onFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement;
};

const toggleFullscreen = async () => {
  const element = playerOverlayRef.value; 
  if (!element) return;

  if (!document.fullscreenElement) {
    try {
      await element.requestFullscreen();
      if ('orientation' in screen && typeof screen.orientation.lock === 'function') {
        await screen.orientation.lock('landscape');
      }
    } catch (err) { console.error('Failed to enter fullscreen:', err); }
  } else {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
      if ('orientation' in screen && typeof screen.orientation.unlock === 'function') {
        screen.orientation.unlock();
      }
    }
  }
};

// --- 4. UTILITIES & LIFECYCLE ---
const closeOnOverlayClick = (event) => {
  if (event.target === event.currentTarget) {
    modalStore.close();
  }
};

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange);
});

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange);
});
</script>

<style scoped>
.icon { 
  width: 24px; 
  height: 24px; 
}

.vue-player-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0,0,0,.9);
  z-index: 2000;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.player-header {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: .75rem 1.5rem;
  pointer-events: none;
}
.player-header > * {
  pointer-events: auto;
}

.fullscreen-button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: rgba(63,63,70,.8);
  border: none;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
}
.fullscreen-button .icon {
  width: 20px;
  height: 20px;
}

.close-button {
  background: none;
  border: none;
  color: #a1a1aa;
  font-size: 2.5rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
}

.vue-player-content {
  position: relative;
  z-index: 1;
  max-width: 90vw;
  max-height: 90vh;
}

.loading-error {
  color: #ffcccc;
  background: #330000;
  border: 1px solid #ff4444;
  padding: 2rem;
  border-radius: 8px;
  font-family: monospace;
}
.loading-error p {
  margin: 0.5rem 0;
}
.loading-error code {
  background: #550000;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
}
</style>

