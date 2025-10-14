import { defineStore } from 'pinia';
import { markRaw, computed, ref } from 'vue';
import type { Component } from 'vue';

// --- ТИПЫ И ИНТЕРФЕЙСЫ ---

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

interface QuickTip {
  title: string;
  message: string;
  buttonText?: string | null;
  // Новые поля для управления состоянием
  show: boolean;
  loading: boolean;
}

const modalComponents = import.meta.glob('~/components/**/*.vue');

export const useModalStore = defineStore('modal', () => {
  // --- STATE ---
  
  const stack = ref<ModalInstance[]>([]);
  // QuickTip теперь объект для более гибкого управления
  const quickTip = ref<QuickTip | null>(null);

  // --- GETTERS ---

  const isOpen = computed(() => stack.value.length > 0);
  const currentStack = computed(() => stack.value);

  // --- ACTIONS (управление стеком модальных окон) ---

  const open = <T = any>(componentPath: string, componentProps: Record<string, any> = {}, options: ModalOptions = {}): Promise<T | undefined> => {
    return new Promise<T | undefined>(async (resolve) => {
      if (options.history !== false && stack.value.length === 0) {
        window.location.hash = 'modal';
      }

      const fullPath = `/components/${componentPath}.vue`;
      const componentImporter = modalComponents[fullPath];

      if (!componentImporter) {
        console.error(`Modal store error: Component at path "${componentPath}" not found. Looked for key: "${fullPath}"`);
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

  // --- ACTIONS (бизнес-логика) ---
  
  const openLesson = (lessonId: string) => open('modals/LessonDetails', { lessonId });
  const openPlayer = (material: Record<string, any>) => open('modals/PlayerModal', { material }, { history: false });

  // --- ACTIONS (QuickTip) ---
  
  const setQuickTip = (tipData: { title: string; message: string; buttonText?: string | null; }) => {
    quickTip.value = {
      ...tipData,
      show: true,
      loading: false,
    };
  };
  
  const showQuickTipShell = () => {
    quickTip.value = {
      title: 'Pro-Tip',
      message: '',
      show: true,
      loading: true,
      buttonText: null,
    };
  };

  const hideQuickTip = () => {
    if (quickTip.value) {
      quickTip.value.show = false;
    }
  };


  if (import.meta.client) {
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

    // Очистка стека при перезагрузке страницы
    if (window.location.hash !== '#modal') {
      stack.value = [];
    }
  }

  return {
    isOpen,
    currentStack,
    quickTip,
    open,
    close,
    submit,
    openLesson,
    openPlayer,
    setQuickTip,
    showQuickTipShell,
    hideQuickTip,
  };
});