import { defineStore } from 'pinia';
// ---> 1. Импортируем markRaw из vue <---
import { shallowRef, watch, computed, ref, markRaw } from 'vue';
import type { Component } from 'vue';

interface ModalInstance {
  id: symbol;
  component: Component;
  props: Record<string, any>;
}

export const useModalStore = defineStore('modal', () => {
  const stack = ref<ModalInstance[]>([]);

  const isOpen = computed(() => stack.value.length > 0);
  const currentStack = computed(() => stack.value);

  const open = async (componentPath: string, componentProps: Record<string, any> = {}) => {
    let componentModule;

    if (componentPath.startsWith('modals/')) {
      const componentName = componentPath.substring('modals/'.length);
      componentModule = await import(`~/components/modals/${componentName}.vue`);
    } else {
      componentModule = await import(`~/components/${componentPath}.vue`);
    }
    
    stack.value.push({
      id: Symbol('modal-id'),
      // ---> 2. Оборачиваем компонент в markRaw <---
      component: markRaw(componentModule.default),
      props: componentProps,
    });
  };

  // ... остальная часть файла без изменений ...
  const openLesson = (lessonId: string) => {
    open('modals/LessonDetails', { lessonId });
  };
  
  const close = () => {
    if (stack.value.length > 0) {
      stack.value.pop();
    }
  };

  if (import.meta.client) {
    let isPopStateClosing = false;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const handlePopState = () => {
      isPopStateClosing = true;
      close();
    };

    watch(isOpen, (isNowOpen, wasOpen) => {
      if (isNowOpen && !wasOpen) {
        history.pushState({ modal: true }, '');
        window.addEventListener('popstate', handlePopState);
        window.addEventListener('keydown', handleKeyDown);
      } 
      else if (!isNowOpen && wasOpen) {
        window.removeEventListener('popstate', handlePopState);
        window.removeEventListener('keydown', handleKeyDown);
        if (!isPopStateClosing && history.state?.modal) {
          history.back();
        }
        isPopStateClosing = false;
      }
    });
  }

  return {
    isOpen,
    currentStack,
    open,
    openLesson,
    close,
  };
});