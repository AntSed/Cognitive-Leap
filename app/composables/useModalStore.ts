import { defineStore } from 'pinia';
import { markRaw, computed, ref } from 'vue';
import type { Component } from 'vue';

interface ModalOptions {
  history?: boolean;
}

interface ModalInstance {
  id: symbol;
  component: Component;
  props: Record<string, any>;
  options: ModalOptions;
}

interface QuickTip {
  title: string;
  message: string;
  buttonText?: string | null;
}

export const useModalStore = defineStore('modal', () => {
  const stack = ref<ModalInstance[]>([]);
  const quickTip = ref<QuickTip | null>(null);

  const isOpen = computed(() => stack.value.length > 0);
  const currentStack = computed(() => stack.value);

  /**
   * Asynchronously loads and opens a modal component.
   * @param componentPath Path to the component (e.g., 'modals/InfoModal').
   * @param componentProps Props to pass to the modal.
   * @param options Optional settings, e.g., { history: false } to disable URL hash changes.
   */
  const open = async (componentPath: string, componentProps: Record<string, any> = {}, options: ModalOptions = {}) => {
    // Set the URL hash only if history is not disabled and it's the first modal.
    if (options.history !== false && stack.value.length === 0) {
      window.location.hash = 'modal';
    }

    let componentModule;
    try {
      if (componentPath.startsWith('modals/')) {
        const componentName = componentPath.substring('modals/'.length);
        componentModule = await import(`~/components/modals/${componentName}.vue`);
      } else {
        componentModule = await import(`~/components/${componentPath}.vue`);
      }
    } catch (e) {
      console.error(`Modal store error: Could not load component at path: ${componentPath}`, e);
      return;
    }
    
    stack.value.push({
      id: Symbol('modal-id'),
      component: markRaw(componentModule.default),
      props: componentProps,
      options: options, // Store the options with the modal instance
    });
  };

  const openLesson = (lessonId: string) => {
    open('modals/LessonDetails', { lessonId });
  };
  
  /**
   * Closes the top-most modal.
   * It intelligently decides whether to use browser history or just pop from the stack.
   */
  const close = () => {
    if (stack.value.length === 0) return;

    const topModal = stack.value[stack.value.length - 1];

    // If the modal was opened with history: false, just pop it from the stack.
    if (topModal.options.history === false) {
      stack.value.pop();
    } else if (window.location.hash === '#modal') {
      // Otherwise, use the standard browser history mechanism.
      history.back();
    }
  };

  /**
   * Action called by the quick-tip plugin to store the pre-fetched tip.
   */
  const setQuickTip = (tip: QuickTip | null) => {
    quickTip.value = tip;
  };

  // --- CLIENT-SIDE EVENT LISTENERS ---
  if (import.meta.client) {
    const handleHashChange = () => {
      if (window.location.hash === '' && stack.value.length > 0) {
        // Find the topmost modal that uses history and remove it and all above it.
        // This handles the case where a history-less modal is on top of a history-enabled one.
        const topHistoryModalIndex = stack.value.findIndex(m => m.options.history !== false);
        if (topHistoryModalIndex !== -1) {
             stack.value.splice(topHistoryModalIndex);
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && stack.value.length > 0) {
        close(); // The smart close function is now called here.
      }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('keydown', handleKeyDown);

    if (window.location.hash === '') {
        stack.value = [];
    }
  }

  return {
    isOpen,
    currentStack,
    quickTip,
    open,
    openLesson,
    close,
    setQuickTip,
  };
});

