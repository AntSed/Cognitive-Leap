<template>
  <div
    class="player-modal-overlay"
    @click="closeOnOverlayClick"
  >
    <div ref="scrollerRef" class="player-scroller" @click.stop>
      
      <header class="player-header">
        <h3>{{ material.title_translations?.en || 'Player' }}</h3>
        <div class="player-controls">
          
          <button @click="pan('left')" title="Pan Left">
            <svg class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"></path></svg>
          </button>
          <button @click="pan('up')" title="Pan Up">
            <svg class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8l-6 6h12z"></path></svg>
          </button>
          <button @click="pan('down')" title="Pan Down">
            <svg class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 16l-6-6h12z"></path></svg>
          </button>
          <button @click="pan('right')" title="Pan Right">
            <svg class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"></path></svg>
          </button>

          <div class="separator"></div>

          <button @click="zoomOut" title="Zoom Out">-</button>
          <span>{{ (manualZoomLevel * 100).toFixed(0) }}%</span>
          <button @click="zoomIn" title="Zoom In">+</button>

          <div class="separator"></div>

          <button v-if="isTouchDevice" @click="toggleFullscreen" :title="isFullscreen ? 'Exit Fullscreen' : 'Enter Native Fullscreen & Rotate'">
            <svg v-if="!isFullscreen" class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"></path></svg>
            <svg v-else class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"></path></svg>
          </button>
        </div>
        <button class="close-button" @click="modalStore.close()">×</button>
      </header>
      
      <div 
        ref="viewportRef"
        class="player-viewport" 
        :style="viewportStyle"
      >
        <iframe
          ref="iframeRef"
          :src="iframeSrc"
          width="100%"
          height="100%"
          frameborder="0"
          sandbox="allow-scripts allow-same-origin"
          allowfullscreen
        ></iframe>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useModalStore } from '~/composables/useModalStore';
import { useResizeObserver } from '@vueuse/core';
import { useGesture } from '@vueuse/gesture';

const props = defineProps({
  material: { type: Object, required: true }
});

const modalStore = useModalStore();

const manualZoomLevel = ref(1.0);
const autoScale = ref(0);
const scrollerRef = ref(null);
const viewportRef = ref(null);
const iframeRef = ref(null);
const iframeSrc = ref('');
const isFullscreen = ref(false);
const isTouchDevice = ref(false);

// НОВЫЕ REFS для хранения смещения при панорамировании
const panX = ref(0);
const panY = ref(0);

const isInteractive = computed(() => {
  const interactiveTypes = ['app', 'game', 'presentation'];
  return interactiveTypes.includes(props.material.material_type);
});
const nativeWidth = computed(() => props.material.player_options?.width || 1280);
const nativeHeight = computed(() => props.material.player_options?.height || 720);
const combinedScale = computed(() => autoScale.value * manualZoomLevel.value);

// ИЗМЕНЕНИЕ: Добавляем смещение (translate) в transform
const viewportStyle = computed(() => ({
  width: `${nativeWidth.value}px`,
  height: `${nativeHeight.value}px`,
  transform: `translate(${panX.value}px, ${panY.value}px) scale(${combinedScale.value})`,
  transformOrigin: 'center',
  willChange: 'transform',
}));

watch(() => props.material, (newMaterial) => {
  const oldSrc = iframeSrc.value;
  if (oldSrc && oldSrc.startsWith('blob:')) {
    URL.revokeObjectURL(oldSrc);
  }
  if (isInteractive.value && newMaterial.html_content) {
    const fullHtml = `<!DOCTYPE html><html><head><style>body,html{margin:0;padding:0;overflow:hidden;background-color:black;}</style></head><body>${newMaterial.html_content}</body></html>`;
    const blob = new Blob([fullHtml], { type: 'text/html' });
    iframeSrc.value = URL.createObjectURL(blob);
  } else {
    iframeSrc.value = newMaterial.url || '';
  }
}, { immediate: true, deep: true });

useResizeObserver(scrollerRef, (entries) => {
  if (!isInteractive.value) return;
  const entry = entries[0];
  const { width: containerWidth, height: containerHeight } = entry.contentRect;
  if (containerWidth > 0 && containerHeight > 0) {
    const scaleX = containerWidth / nativeWidth.value;
    const scaleY = containerHeight / nativeHeight.value;
    autoScale.value = Math.min(scaleX, scaleY);
    manualZoomLevel.value = 1.0; 
  }
});

watch(autoScale, async () => {
  await nextTick();
  // При ресайзе сбрасываем панораму в центр
  panX.value = 0;
  panY.value = 0;
  
  const scroller = scrollerRef.value;
  if (scroller) {
    scroller.scrollLeft = (scroller.scrollWidth - scroller.clientWidth) / 2;
    scroller.scrollTop = (scroller.scrollHeight - scroller.clientHeight) / 2;
  }
});

let initialZoomOnPinch = 1.0;
useGesture({
  onPinchStart: () => { initialZoomOnPinch = manualZoomLevel.value; },
  onPinch: ({ offset: [scale] }) => { 
    manualZoomLevel.value = Math.max(0.3, Math.min(initialZoomOnPinch * scale, 4.0));
  },
}, { 
  target: scrollerRef,
});

// ИЗМЕНЕНИЕ: Полностью переписанная функция панорамирования
const pan = (direction) => {
  const panStep = 100; // Расстояние для панорамирования в пикселях

  switch (direction) {
    case 'up':    panY.value -= panStep; break;
    case 'down':  panY.value += panStep; break;
    case 'left':  panX.value -= panStep; break;
    case 'right': panX.value += panStep; break;
  }
};

const onFullscreenChange = () => { isFullscreen.value = !!document.fullscreenElement; };
const zoomIn = () => manualZoomLevel.value = Math.min(4.0, manualZoomLevel.value + 0.2);
const zoomOut = () => manualZoomLevel.value = Math.max(0.3, manualZoomLevel.value - 0.2);
const closeOnOverlayClick = (event) => { if (event.target === event.currentTarget) { modalStore.close(); } };
const toggleFullscreen = async () => {
  const element = scrollerRef.value;
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

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange);
  isTouchDevice.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
});

onUnmounted(() => {
  if (iframeSrc.value.startsWith('blob:')) { URL.revokeObjectURL(iframeSrc.value); }
  document.removeEventListener('fullscreenchange', onFullscreenChange);
});
</script>

<style scoped>
.icon { 
  width: 24px; 
  height: 24px; 
}
.player-header {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 10;
  display: flex;
  align-items: center;
  padding: .75rem 1.5rem;
  color: #e4e4e7;
  background: linear-gradient(to bottom, rgba(0,0,0,.6), transparent);
  pointer-events: none;
}
.player-header > * {
  pointer-events: auto;
}
.player-header h3 {
  font-weight: 600;
  margin-right: auto; /* Заголовок занимает все свободное место слева */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.player-controls {
  display: flex;
  align-items: center;
  gap: .5rem; /* Уменьшаем отступы */
  font-weight: 500;
  flex-shrink: 0; /* Панель не будет сжиматься */
  margin-left: 1rem;
}
.player-controls button {
  width: 32px; /* Увеличиваем размер кнопок для удобства */
  height: 32px;
  border-radius: 50%;
  background-color: rgba(63,63,70,.8);
  border: none;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.player-controls .icon {
  width: 20px;
  height: 20px;
}
.separator {
  width: 1px;
  height: 20px;
  background-color: rgba(255, 255, 255, 0.2);
  margin: 0 0.5rem;
}
.close-button {
  background: none;
  border: none;
  color: #a1a1aa;
  font-size: 2.5rem;
  line-height: 1;
  cursor: pointer;
  margin-left: 1.5rem;
  padding: 0;
}
.player-modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0,0,0,.9);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.player-scroller {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  overflow: hidden; 
  cursor: grab;
  touch-action: none;
}
.player-scroller:active {
  cursor: grabbing;
}
.player-viewport {
  position: relative;
  background-color: #000;
  transition: transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  flex-shrink: 0;
}
.player-viewport iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 0;
}
</style>