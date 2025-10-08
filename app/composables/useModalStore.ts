import { defineStore } from 'pinia';
import { markRaw, computed, ref } from 'vue';
import type { Component } from 'vue';

// --- ИНТЕРФЕЙСЫ ОСТАЮТСЯ БЕЗ ИЗМЕНЕНИЙ ---
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

// --- НОВОЕ РЕШЕНИЕ С import.meta.glob ---
// 1. Vite находит ВСЕ .vue файлы внутри папки /components и её подпапок.
const modalComponents = import.meta.glob('../components/**/*.vue');


export const useModalStore = defineStore('modal', () => {
  const stack = ref<ModalInstance[]>([]);
  const quickTip = ref<QuickTip | null>(null);

  const isOpen = computed(() => stack.value.length > 0);
  const currentStack = computed(() => stack.value);

  const open = async (componentPath: string, componentProps: Record<string, any> = {}, options: ModalOptions = {}) => {
    if (options.history !== false && stack.value.length === 0) {
      window.location.hash = 'modal';
    }

    // 2. Мы строим полный путь к файлу, который будет ключом в нашей "карте".
    const fullPath = `../components/${componentPath}.vue`;

    // 3. Проверяем, есть ли такой компонент в нашей "карте".
    if (!modalComponents[fullPath]) {
      console.error(`Modal store error: Component at path "${componentPath}" not found.`);
      return;
    }

    try {
      // 4. Загружаем нужный компонент из "карты". Это работает с любой вложенностью.
      const componentModule = await modalComponents[fullPath]();
      
      stack.value.push({
        id: Symbol('modal-id'),
        component: markRaw(componentModule.default),
        props: componentProps,
        options: options,
      });

    } catch (e) {
      console.error(`Modal store error: Could not load component at path: ${componentPath}`, e);
    }
  };



  const openLesson = (lessonId: string) => {
    open('modals/LessonDetails', { lessonId });
  };

  const openPlayer = (material: Record<string, any>) => {
    const interactiveTypes = ['app', 'game', 'presentation'];
    
    let playerProps = {};

    if (interactiveTypes.includes(material.material_type)) {
      playerProps = {
        htmlContent: material.html_content,
        contentType: 'interactive', 
      };
    } else {
      // For other types like video, we just pass the URL.
      playerProps = {
        url: material.url,
        contentType: material.material_type, // e.g., 'video'
      };
    }
    open('modals/PlayerModal', playerProps, { history: false });
  };
  
  const close = () => {
    if (stack.value.length === 0) return;
    const topModal = stack.value[stack.value.length - 1];

    if (topModal.options.history === false) {
      stack.value.pop();
    } else if (window.location.hash === '#modal') {
      history.back();
    }
  };

  const setQuickTip = (tip: QuickTip | null) => {
    quickTip.value = tip;
  };

  if (import.meta.client) {
    const handleHashChange = () => {
      if (window.location.hash === '' && stack.value.length > 0) {
        const topHistoryModalIndex = stack.value.findIndex(m => m.options.history !== false);
        if (topHistoryModalIndex !== -1) {
            stack.value.splice(topHistoryModalIndex);
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
    openPlayer,
    close,
    setQuickTip,
  };
});