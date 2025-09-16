// File: composables/useModalStore.ts
import { toRefs } from 'vue'
import { useI18n } from 'vue-i18n' // Импортируем useI18n

// --- TYPE DEFINITIONS ---
interface LessonDataFromServer {
  id: string;
  topic: string; 
  materials: any[];
  quizzes: any[];
}

interface ModalState {
  isOpen: boolean;
  isLoading: boolean;
  lessonData: LessonDataFromServer | null;
  // currentLanguage теперь не нужен, мы будем использовать locale из i18n
}

interface GetLessonDetailsArgs {
  p_lesson_id: string;
  p_lang_code: string;
  p_user_id: string | null;
}

// --- COMPOSABLE FUNCTION ---
export const useModalStore = () => {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();
  const { locale } = useI18n(); // Получаем доступ к глобальному состоянию языка

  const state = useState<Omit<ModalState, 'currentLanguage'>>('modal-state', () => ({
    isOpen: false,
    isLoading: false,
    lessonData: null,
  }));

  /**
   * Opens the modal and fetches lesson data from the database.
   * @param {string} lessonId - The UUID of the lesson to open.
   */
  const open = async (lessonId: string) => {
    if (!lessonId) {
        console.error("Попытка открыть модальное окно без lessonId!");
        return;
    }

    state.value.isOpen = true;
    state.value.isLoading = true;
    state.value.lessonData = null;

    try {
        const rpcArgs: GetLessonDetailsArgs = {
            p_lesson_id: lessonId,
            p_user_id: user.value?.id ?? null,
            // --- ИСПРАВЛЕНИЕ: Передаем текущий язык напрямую из i18n ---
            p_lang_code: locale.value
        };

        const { data, error } = await supabase.rpc('get_lesson_details', rpcArgs as any);

        if (error) throw error;

        state.value.lessonData = data;

    } catch (error) {
        console.error("Ошибка при загрузке данных урока:", error);
        close();
    } finally {
        state.value.isLoading = false;
    }
  }

  /**
   * Closes the modal window and clears its data.
   */
  const close = () => {
    state.value.isOpen = false;
    setTimeout(() => {
        state.value.lessonData = null;
    }, 300);
  }
  
  // Функция setLanguage больше не нужна, так как язык управляется глобально
  // const setLanguage = ...

  const toggleTestCompletion = (testId: string) => {
    console.log(`(демо) Тест ${testId} отмечен как пройденный/не пройденный.`);
  }

  const completeMaterial = (materialId: string) => {
     console.log(`(демо) Материал ${materialId} отмечен как пройденный.`);
  }

  return {
    ...toRefs(state.value),
    open,
    close,
    // setLanguage больше не экспортируется
    toggleTestCompletion,
    completeMaterial,
  }
}
