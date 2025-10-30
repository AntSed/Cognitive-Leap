// app/composables/useHubMaterialsLogic.js

import { ref, computed, watch } from 'vue';
import { useSupabaseClient } from '#imports';
import { useI18n } from 'vue-i18n';

/**
 * Parses an age filter string (e.g., "7-10", "16+") into min/max values.
 * @param {string} ageRangeString 
 * @returns {{min: number | null, max: number | null}}
 */
const parseAgeRange = (ageRangeString) => {
  if (!ageRangeString || ageRangeString === 'all') {
    return { min: null, max: null }; // No filter
  }
  if (ageRangeString.includes('+')) {
    const min = parseInt(ageRangeString.replace('+', ''), 10);
    // Treat 16+ as 16-999 for overlap logic
    return { min: isNaN(min) ? null : min, max: 999 }; 
  }
  const parts = ageRangeString.split('-');
  if (parts.length === 2) {
    const min = parseInt(parts[0], 10);
    const max = parseInt(parts[1], 10);
    return { 
      min: isNaN(min) ? null : min, 
      max: isNaN(max) ? null : max 
    };
  }
  return { min: null, max: null };
};


export function useHubMaterialsLogic(selectedLesson, activeProgram, hubContext, user) {
  // --- SETUP ---
  const supabase = useSupabaseClient();
  const { t } = useI18n();

  // --- STATE ---
  const materials = ref([]);
  const isLoading = ref(true);
  const error = ref(null);

  // --- НОВОЕ СОСТОЯНИЕ ПАГИНАЦИИ ---
  const pageSize = 20; // 20 материалов на странице. Можно сделать ref(), если хочешь дать юзеру выбор
  const currentPage = ref(1);
  const totalMaterials = ref(0);

  // --- Filter state ---
  const searchQuery = ref('');
  const statusFilter = ref('');
  const typeFilter = ref('');
  const languageFilter = ref('');
  const ageFilter = ref('');
  const creatorFilter = ref('');

  // --- COMPUTED ---
  const displayedMaterials = computed(() => {
    return materials.value;
  });

  // --- METHODS ---
const fetchMaterials = async () => {
    isLoading.value = true;
    error.value = null;
    
    try {
      let query;
      const { min: ageFilterMin, max: ageFilterMax } = parseAgeRange(ageFilter.value);

      // --- ЛОГИКА ПАГИНАЦИИ ---
      const from = (currentPage.value - 1) * pageSize;
      const to = from + pageSize - 1;

      if (selectedLesson.value) {
        // --- Логика для ВЫБРАННОГО УРОКА ---
        
        // Запрос select с { count: 'exact' }
        query = supabase
          .from('lesson_materials')
          .select('position, learning_apps!inner ( * )', { count: 'exact' }) // <-- ДОБАВЛЕН COUNT
          .eq('lesson_id', selectedLesson.value.id)
          .eq('learning_apps.material_purpose', hubContext.value); 
        if (statusFilter.value) query = query.eq('learning_apps.status', statusFilter.value);
        if (typeFilter.value) query = query.eq('learning_apps.material_type', typeFilter.value);
        if (searchQuery.value) {
          const ftsQuery = searchQuery.value
            .trim()
            .split(/\s+/) 
            .filter(Boolean) 
            .map(word => word + ':*') 
            .join(' & '); 
          query = query.textSearch(
            'learning_apps.fts_all_languages',
             ftsQuery, 
            { config: 'simple' } 
          );
        }
        if (languageFilter.value) query = query.contains('learning_apps.languages', [languageFilter.value]);
        if (creatorFilter.value === 'me' && user.value) query = query.eq('learning_apps.developer_id', user.value.id);
        if (ageFilterMin !== null && ageFilterMax !== null) {
            query = query.lte('learning_apps.recommended_age_min', ageFilterMax);
            query = query.gte('learning_apps.recommended_age_max', ageFilterMin);
        }
        
        query = query
          .order('position', { ascending: true })
          .range(from, to); 

      } else {

        query = supabase
          .from('learning_apps')
          .select('*', { count: 'exact' }); 
        
        query = query.eq('material_purpose', hubContext.value);

        if (statusFilter.value) query = query.eq('status', statusFilter.value);
        if (typeFilter.value) query = query.eq('material_type', typeFilter.value);
        if (searchQuery.value) {
          const ftsQuery = searchQuery.value
            .trim()
            .split(/\s+/) 
            .filter(Boolean) 
            .map(word => word + ':*') 
            .join(' & '); 
          query = query.textSearch(
            'fts_all_languages',
            ftsQuery, 
            { config: 'simple' } 
          );
        }
        if (languageFilter.value) query = query.contains('languages', [languageFilter.value]);
        if (creatorFilter.value === 'me' && user.value) query = query.eq('developer_id', user.value.id);
        if (ageFilterMin !== null && ageFilterMax !== null) {
            query = query.lte('recommended_age_min', ageFilterMax);
            query = query.gte('recommended_age_max', ageFilterMin);
        }
        
        // Сортировка и .range()
        query = query
          .order('created_at', { ascending: false })
          .range(from, to); // <-- ДОБАВЛЕН RANGE
      }

      // Выполняем запрос и получаем { data, error, count }
      const { data, error: fetchError, count } = await query;
      
      if (fetchError) throw fetchError;

      // Сохраняем общее кол-во
      totalMaterials.value = count || 0;

      // ... (остальная логика обработки 'data' без изменений) ...
      if (selectedLesson.value) {
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
      totalMaterials.value = 0; // Сброс в случае ошибки
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
    const material = materials.value.find(m => m.id === materialId);
    if (!material) return;
    const oldPosition = material.position;
    if (oldPosition === newPosition || newPosition <= 0) return;
    const originalMaterials = JSON.parse(JSON.stringify(materials.value));
    materials.value.forEach(m => {
      if (m.id === materialId) {
        m.position = newPosition;
      } 
      else {
        if (newPosition < oldPosition && m.position >= newPosition && m.position < oldPosition) {
          m.position++;
        }
        else if (newPosition > oldPosition && m.position <= newPosition && m.position > oldPosition) {
          m.position--;
        }
      }
    });

    materials.value.sort((a, b) => a.position - b.position);
    try {
      const { error: rpcError } = await supabase.rpc('reorder_lesson_materials_context', {
        p_lesson_id: selectedLesson.value.id,
        p_material_id: materialId,
        p_new_position: newPosition,
        p_material_purpose: hubContext.value
      });

      if (rpcError) throw rpcError;
      
    } catch (e) {
      console.error('Failed to reorder material:', e);
      alert(t('hub.errors.reorderMaterialFailed'));
      materials.value = originalMaterials;
    }
  };


  watch([searchQuery, statusFilter, typeFilter, languageFilter, ageFilter, creatorFilter, hubContext], 
    () => {
      if (currentPage.value !== 1) {
        currentPage.value = 1;
      } else {
        fetchMaterials();
      }
    }, 
    { deep: true }
  );

  watch(currentPage, fetchMaterials);
  const resetPage = () => {
    currentPage.value = 1;
  };

  return {
    materials,
    isLoading,
    error,
    searchQuery,
    statusFilter,
    typeFilter,
    languageFilter,
    ageFilter,
    creatorFilter,
    displayedMaterials,
    fetchMaterials,
    handlePositionUpdate,
    currentPage,
    totalMaterials,
    pageSize,
    resetPage, 
  };
}