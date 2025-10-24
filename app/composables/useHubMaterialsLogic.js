// app\composables\useHubMaterialsLogic.js
import { ref, computed, watch } from 'vue';
import { useSupabaseClient } from '#imports';
import { useI18n } from 'vue-i18n';

/**
 * Manages the state and logic for the Content Hub's main content area.
 * This includes fetching, filtering, and displaying the grid of learning materials.
 *
 * @param {import('vue').Ref<object | null>} selectedLesson - A ref holding the currently selected lesson to filter materials.
 * @param {import('vue').Ref<object | null>} activeProgram - A ref holding the currently active program.
 */
export function useHubMaterialsLogic(selectedLesson, activeProgram, hubContext) {
  // --- SETUP ---
  const supabase = useSupabaseClient();
  const { t } = useI18n();

  // --- STATE ---
  const materials = ref([]);
  const isLoading = ref(true);
  const error = ref(null);

  // Filter state
  const searchQuery = ref('');
  const statusFilter = ref('');
  const typeFilter = ref('');

  // --- COMPUTED ---


  const displayedMaterials = computed(() => {
  return materials.value;
  });

  // --- METHODS ---

  /**
   * Fetches learning materials from the database.
   * If a lesson is selected, it fetches materials linked to that lesson.
   * Otherwise, it fetches all materials, applying any active filters.
   */
  const fetchMaterials = async () => {
    isLoading.value = true;
    error.value = null;
    
    try {
      let query;

      if (selectedLesson.value) {
        // --- Логика для ВЫБРАННОГО УРОКА ---
        query = supabase
          .from('lesson_materials')
          .select('position, learning_apps!inner ( * )')
          .eq('lesson_id', selectedLesson.value.id)
          .eq('learning_apps.material_purpose', hubContext.value); 
        
        if (statusFilter.value) query = query.eq('learning_apps.status', statusFilter.value);
        if (typeFilter.value) query = query.eq('learning_apps.material_type', typeFilter.value);
        if (searchQuery.value) query = query.ilike('learning_apps.title_translations->>en', `%${searchQuery.value}%`);

        query = query.order('position', { ascending: true });

      } else {
        // --- Логика для ВСЕЙ БИБЛИОТЕКИ (урок не выбран) ---
        query = supabase.from('learning_apps').select('*');
        
        // НОВАЯ СТРОКА: Фильтруем по 'material_purpose'
        query = query.eq('material_purpose', hubContext.value);

        // ... (старые фильтры по статусу, типу, поиску) ...
        if (statusFilter.value) query = query.eq('status', statusFilter.value);
        if (typeFilter.value) query = query.eq('material_type', typeFilter.value);
        if (searchQuery.value) query = query.ilike('title_translations->>en', `%${searchQuery.value}%`);
        
        query = query.order('created_at', { ascending: false });
      }
      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      if (selectedLesson.value) {
        // Unpack the nested material data
        materials.value = data.map(item => ({
          ...item.learning_apps,
          position: item.position
        })).filter(Boolean);
      } else {
        materials.value = data;
      }

    } catch (e) {
      error.value = e;
      console.error("Error fetching materials:", e);
    } finally {
      isLoading.value = false;
    }
  };

/**
   * Handles reordering of materials within a lesson (optimistic update).
   * @param {object} payload - The event payload.
   * @param {string} payload.materialId - The ID of the material being moved.
   * @param {number} payload.newPosition - The new position for the material.
   */
  const handlePositionUpdate = async ({ materialId, newPosition }) => {
    if (!selectedLesson.value) return;

    // 1. Находим материал и его старую позицию
    const material = materials.value.find(m => m.id === materialId);
    if (!material) return;
    const oldPosition = material.position;
    if (oldPosition === newPosition || newPosition <= 0) return;

    // 2. Сохраняем "бэкап" для отката в случае ошибки
    const originalMaterials = JSON.parse(JSON.stringify(materials.value));

    // 3. ОПТИМИСТИЧНОЕ ОБНОВЛЕНИЕ UI
    // Применяем изменения к локальному состоянию (materials.value)
    materials.value.forEach(m => {
      // Это наш материал, ставим ему новую позицию
      if (m.id === materialId) {
        m.position = newPosition;
      } 
      // Другие материалы, которые нужно "подвинуть"
      else {
        // Сдвигаем ВНИЗ (освобождаем место)
        if (newPosition < oldPosition && m.position >= newPosition && m.position < oldPosition) {
          m.position++;
        }
        // Сдвигаем ВВЕРХ (заполняем пустоту)
        else if (newPosition > oldPosition && m.position <= newPosition && m.position > oldPosition) {
          m.position--;
        }
      }
    });

    // Сортируем массив в UI по новым позициям
    materials.value.sort((a, b) => a.position - b.position);

    // 4. ВЫЗОВ RPC В ФОНОВОМ РЕЖИМЕ
    try {
      const { error: rpcError } = await supabase.rpc('reorder_lesson_materials_context', {
        p_lesson_id: selectedLesson.value.id,
        p_material_id: materialId,
        p_new_position: newPosition,
        p_material_purpose: hubContext.value // <-- Передаем 'study' или 'exam'
      });

      if (rpcError) throw rpcError;
      
      // Успех! UI уже обновлен, ничего делать не нужно.

    } catch (e) {
      console.error('Failed to reorder material:', e);
      alert(t('hub.errors.reorderMaterialFailed'));
      // 5. ОТКАТ UI В СЛУЧАЕ ОШИБКИ
      materials.value = originalMaterials;
    }
  };

  // Watch for filter changes and refetch materials
  watch([searchQuery, statusFilter, typeFilter], () => {
    fetchMaterials();
  }, { deep: true });
  watch(hubContext, () => {
    fetchMaterials();
  });
  return {
    materials,
    isLoading,
    error,
    searchQuery,
    statusFilter,
    typeFilter,
    displayedMaterials,
    fetchMaterials,
    handlePositionUpdate,
  };
}

