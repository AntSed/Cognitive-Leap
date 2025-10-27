// app/composables/useModalStore.ts
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
  resolve: (result?: any) => void;
  result?: any;
}


const modalComponents = import.meta.glob('~/components/**/*.vue');
let isInitialized = false;
export const useModalStore = defineStore('modal', () => {
  const stack = ref<ModalInstance[]>([]);
  const isOpening = ref(false);
  const isOpen = computed(() => stack.value.length > 0);
  const currentStack = computed(() => stack.value);

  const open = <T = any>(componentPath: string, componentProps: Record<string, any> = {}, options: ModalOptions = {}): Promise<T | undefined> => {
    return new Promise<T | undefined>(async (resolve) => {
      if (isOpening.value) {
        console.warn('Modal open call ignored, already opening.');
        return resolve(undefined);
      }
      isOpening.value = true;

      if (options.history !== false && stack.value.length === 0) {
        window.location.hash = 'modal';
      }

      const fullPath = `/components/${componentPath}.vue`;
      const componentImporter = modalComponents[fullPath];

      if (!componentImporter) {
        console.error(`Modal store error: Component at path "${componentPath}" not found. Looked for key: "${fullPath}"`);
        isOpening.value = false;
        return resolve(undefined);
      }

      try {
        const componentModule = await componentImporter() as { default: Component };
        
        stack.value.push({
          id: Symbol('modal-id'),
          component: markRaw(componentModule.default),
          props: componentProps,
          options: { history: true, ...options },
          resolve,
        });
      } catch (e) {
        console.error(`Modal store error: Could not load component at path: ${componentPath}`, e);
        resolve(undefined);
      } finally {
        isOpening.value = false;
      }
    });
  };

  const close = () => {
    if (stack.value.length === 0) return;
    const topModal = stack.value[stack.value.length - 1];

    if (topModal.options.history === false) {
      const poppedModal = stack.value.pop();
      poppedModal?.resolve(poppedModal.result);
    } else if (window.location.hash === '#modal') {
      history.back();
    }
  };

  const submit = (result: any) => {
    if (stack.value.length === 0) return;
    stack.value[stack.value.length - 1].result = result; 
    close(); 
  };



const initializeModalListeners = () => {
    if (isInitialized) return; 
    isInitialized = true;

    const handleHashChange = () => {
      if (window.location.hash === '' && stack.value.length > 0) {
        const topHistoryModalIndex = stack.value.findIndex(m => m.options.history !== false);
        if (topHistoryModalIndex !== -1) {
          const closingModals = stack.value.splice(topHistoryModalIndex);
          closingModals.forEach(m => {
            m.resolve(m.result); 
          });
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && stack.value.length > 0) {
        close();
      }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('keydown', handleKeyDown);

    if (window.location.hash !== '#modal') {
      stack.value = [];
    }
  };

  return {
    isOpen,
    currentStack,
    open,
    close,
    submit,
    initializeModalListeners,
  };
});