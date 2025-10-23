// app/components/QuickTip.vue
<template>
  <Transition name="tip-fade">
   <div v-show="isVisible" class="quick-tip-overlay">
      <div class="quick-tip-card" ref="quickTipCardRef">
        <div v-if="isLoading" class="spinner"></div>
        <div v-else-if="tip">
          <button class="close-button" @click="isDismissed = true">&times;</button>
          <h3>{{ tip.title }}</h3>
          <p>{{ tip.message }}</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch, computed, nextTick } from 'vue';
import { useQuickTip } from '~/composables/useQuickTip';
import { useI18n } from 'vue-i18n';

// --- PROP ---
const props = defineProps({
  isPlayActive: {
    type: Boolean,
    default: false,
  },
});

// --- REFS and COMPOSABLES ---
const { tip, isLoading, fetchTip } = useQuickTip(); 
const { locale } = useI18n();
const isDismissed = ref(false);
const quickTipCardRef = ref(null);

// --- HANDLER ---
const handleInteractionOutside = (event) => {
  if (quickTipCardRef.value && !quickTipCardRef.value.contains(event.target)) {
    isDismissed.value = true;
  }
};

// --- WATCHER (Отвечает за навигацию) ---
watch(
  () => props.isPlayActive, 
  (isPlayNow) => {
    if (isPlayNow) {
      fetchTip(locale.value);
    }
  },
  {
    immediate: false, 
  }
);

// --- COMPUTED (Отвечает за v-show) ---
const isVisible = computed(() => {
  // 3. ВОЗВРАЩАЕМ 'isLoading' В ПРОВЕРКУ
  // Подсказка видна, если ее не закрыли И (она грузится ИЛИ данные загружены)
  return !isDismissed.value && (isLoading.value || tip.value);
});

// --- WATCH (Отвечает за слушатель "клика снаружи") ---
// (Этот код из прошлого раза у тебя верный, не меняем)
watch(isVisible, (isNowVisible) => {
  if (isNowVisible) {
    nextTick(() => {
      document.addEventListener('pointerdown', handleInteractionOutside);
    });
  } else {
    document.removeEventListener('pointerdown', handleInteractionOutside);
  }
});
</script>

<style scoped>
.quick-tip-overlay {
  position: fixed;
  bottom: 60px;
  right: 10px;
  z-index: 1000;
}

/* The main card component styling.
  Includes colors, rounded corners, shadow, and a decorative border.
*/
.quick-tip-card {
  background-color: #2c3e50;
  color: #ecf0f1;
  border-radius: 12px;
  padding: 1.5rem;
  width: 320px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  border-left: 5px solid #3498db;
  position: relative;
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Title styling */
h3 {
  margin: 0 0 0.5rem 0;
  color: #3498db;
}

/* Paragraph styling for the tip's message */
p {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.5;
}

/* The 'x' button to close the tip manually */
.close-button {
  position: absolute;
  top: 8px;
  right: 10px;
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #7f8c8d;
  cursor: pointer;
}

/* Loading indicator styling.
  A simple CSS spinner.
*/
.spinner {
  border: 4px solid rgba(255, 255, 255, 0.2);
  border-left-color: #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

/* Keyframes for the spinner's rotation animation */
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Vue Transition classes for the fade/slide effect.
  'tip-fade' is the name we provided in the <Transition> component.
*/
.tip-fade-enter-active,
.tip-fade-leave-active {
  /* Defines the duration and easing of the animation */
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.tip-fade-enter-from,
.tip-fade-leave-to {
  /* The state before entering or after leaving: invisible and slightly moved down */
  opacity: 0;
  transform: translateY(20px);
}
</style>