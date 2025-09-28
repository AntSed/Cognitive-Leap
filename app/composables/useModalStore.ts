// File: composables/useModalStore.ts
import { toRefs, watch } from 'vue' 
import { useI18n } from 'vue-i18n'

// --- TYPE DEFINITIONS ---
interface LessonDataFromServer {
  id: string;
  topic: string; 
  materials: any[];
  quizzes: any[];
}


// --- COMPOSABLE FUNCTION ---
export const useModalStore = () => {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();
  const { locale } = useI18n();

  const state = useState('modal-state', () => ({
    isOpen: false,
    isLoading: false,
    lessonData: null,
  }));

  /**
   * Opens the modal and fetches lesson data.
   */
  const open = async (lessonId: string) => {
    if (!lessonId) {
        console.error("Modal opened without lessonId!");
        return;
    }

    state.value.isOpen = true;
    state.value.isLoading = true;
    state.value.lessonData = null;

    try {
        const rpcArgs = {
            p_lesson_id: lessonId,
            p_user_id: user.value?.id ?? null,
            p_lang_code: locale.value
        };

        const { data, error } = await supabase.rpc('get_lesson_details', rpcArgs as any);
        if (error) throw error;
        state.value.lessonData = data;

    } catch (error) {
        console.error("Error loading lesson data:", error);
        close();
    } finally {
        state.value.isLoading = false;
    }
  }

  /**
   * Closes the modal window.
   */
  const close = () => {
    state.value.isOpen = false;
    // Данные теперь очищаются в watch, чтобы избежать гонки состояний
  }
  
  // --- НОВАЯ ЛОГИКА УПРАВЛЕНИЯ ЗАКРЫТИЕМ (Escape, кнопка "назад") ---

  if (import.meta.client) { // Выполняем этот код только в браузере
    
    let isPopStateClosing = false; // Флаг для избежания двойных вызовов

    // Обработчик для клавиши Escape
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };

    // Обработчик для кнопки "назад" в браузере
    const handlePopState = () => {
      isPopStateClosing = true;
      close();
    };

    watch(() => state.value.isOpen, (isOpen) => {
      if (isOpen) {
        // --- ДЕЙСТВИЯ ПРИ ОТКРЫТИИ ОКНА ---
        history.pushState({ modal: true }, '');
        window.addEventListener('popstate', handlePopState);
        window.addEventListener('keydown', handleKeyDown);
      } else {
        // --- ДЕЙСТВИЯ ПРИ ЗАКРЫТИИ ОКНА ---
        window.removeEventListener('popstate', handlePopState);
        window.removeEventListener('keydown', handleKeyDown);
        
        // Если окно закрылось НЕ через кнопку "назад", убираем запись из истории
        if (!isPopStateClosing) {
          // Проверяем, что мы не на главной странице, чтобы избежать выхода
          if (history.state && history.state.modal) { 
            history.back();
          }
        }
        
        isPopStateClosing = false; // Сбрасываем флаг

        // Очищаем данные с задержкой для анимации
        setTimeout(() => {
          state.value.lessonData = null;
        }, 300);
      }
    });
  }

  const toggleTestCompletion = (testId: string) => {
    console.log(`DEMO test ${testId} marked as complete/incomplete.`);
  }

  const completeMaterial = (materialId: string) => {
     console.log(`DEMO material ${materialId} marked as complete.`);
  }


  return {
    ...toRefs(state.value),
    open,
    close,
    toggleTestCompletion,
    completeMaterial,
  }
}