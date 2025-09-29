import { defineStore } from 'pinia';
import { markRaw, watch, computed, ref } from 'vue';
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
    // Если это первое открываемое окно, меняем хэш
    if (stack.value.length === 0) {
      window.location.hash = 'modal';
    }

    let componentModule;
    if (componentPath.startsWith('modals/')) {
      const componentName = componentPath.substring('modals/'.length);
      componentModule = await import(`~/components/modals/${componentName}.vue`);
    } else {
      componentModule = await import(`~/components/${componentPath}.vue`);
    }
    
    stack.value.push({
      id: Symbol('modal-id'),
      component: markRaw(componentModule.default),
      props: componentProps,
    });
  };

  const openLesson = (lessonId: string) => {
    open('modals/LessonDetails', { lessonId });
  };
  
  // Функция close теперь просто вызывает history.back(), чтобы убрать хэш
  const close = () => {
    history.back();
  };

  if (import.meta.client) {
    // Этот обработчик следит за изменением хэша
    const handleHashChange = () => {
      // Если хэш исчез, а у нас в стеке есть окна - значит, надо закрыть верхнее.
      if (window.location.hash === '' && stack.value.length > 0) {
        stack.value.pop();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && stack.value.length > 0) {
        close();
      }
    };
    
    // Вешаем слушатели один раз и навсегда
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('keydown', handleKeyDown);

    // Начальная проверка на случай, если пользователь перезагрузил страницу с хэшем
    if (window.location.hash === '') {
       // Убеждаемся, что стек пуст, если нет хэша
       stack.value = [];
    }
  }

  return {
    isOpen,
    currentStack,
    open,
    openLesson,
    close,
  };
});