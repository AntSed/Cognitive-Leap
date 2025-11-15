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

  // Pagination state.
  const pageSize = 20; // Number of materials per page. Can be made ref() for user choice.
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

      // Pagination logic.
      const from = (currentPage.value - 1) * pageSize;
      const to = from + pageSize - 1;

      if (selectedLesson.value) {
        // Logic for a SELECTED LESSON.
        
        // Request select with { count: 'exact' }
        query = supabase
          .from('lesson_materials')
          // Request order_index instead of position.
          .select('order_index, learning_apps!inner ( * )', { count: 'exact' }) 
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
          .order('order_index', { ascending: true }) 
          .order('id', { ascending: true, foreignTable: 'learning_apps' })
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
        
        // Sorting and ranging.
        query = query
          .order('created_at', { ascending: false })
          .range(from, to);
      }

      // Execute the query and get { data, error, count }
      const { data, error: fetchError, count } = await query;
      
      if (fetchError) throw fetchError;

      // Save total count.
      totalMaterials.value = count || 0;

      // Rest of 'data' processing logic unchanged.
      if (selectedLesson.value) {
        materials.value = data.map(item => ({
          ...item.learning_apps,
          order_index: item.order_index
        })).filter(Boolean);
      } else {
        materials.value = data;
      }

    } catch (e) {
      error.value = e;
      console.error("Error fetching materials:", e);
      totalMaterials.value = 0; // Reset in case of error.
    } finally {
      isLoading.value = false;
    }
  };
/**
 * Handles reordering based on "virtual" display index.
 * Calculates a new float order_index and calls the new RPC.
 * @param {object} payload - The event payload.
 * @param {string} payload.materialId - The ID of the material being moved.
 * @param {number} payload.newPosition - The new *virtual* (1-based) position.
 */
const handlePositionUpdate = async ({ materialId, newPosition }) => {
  if (!selectedLesson.value) return;
  const totalItems = materials.value.length;
  const clampedNewPosition = Math.max(1, Math.min(newPosition, totalItems));
  // 1. Find material and its current *virtual* index.
  const materialToMove = materials.value.find(m => m.id === materialId);
  if (!materialToMove) return;

  const oldVirtualIndex = materials.value.indexOf(materialToMove);
  const newVirtualIndex = clampedNewPosition - 1; // 1-based to 0-based

  if (oldVirtualIndex === newVirtualIndex) return; 

  // Save for rollback in case of error.
  const originalMaterials = JSON.parse(JSON.stringify(materials.value));

  // 2. Calculate new float order_index.
  let newOrderIndex;

  if (newVirtualIndex === 0) {
    // Move to BEGINNING.
    const firstItemOrder = materials.value[0].order_index;
    newOrderIndex = firstItemOrder / 2;
  } else if (newVirtualIndex === materials.value.length - 1) {
    // Move to END.
    const lastItemOrder = materials.value[materials.value.length - 1].order_index;
    newOrderIndex = lastItemOrder + 1.0;
  } else {
    // Move to MIDDLE.
    // We need neighbors *in the new* position.
    
    // If moving UP (e.g., 5 -> 2).
    // 'neighbors' are [index 1] and [index 2].
    if (newVirtualIndex < oldVirtualIndex) {
      const orderBefore = materials.value[newVirtualIndex - 1].order_index;
      const orderAfter = materials.value[newVirtualIndex].order_index;
      newOrderIndex = (orderBefore + orderAfter) / 2;
    } 
    // If moving DOWN (e.g., 2 -> 5).
    else {
      const orderBefore = materials.value[newVirtualIndex].order_index;
      const orderAfter = materials.value[newVirtualIndex + 1]?.order_index;
      
      if (orderAfter) {
         newOrderIndex = (orderBefore + orderAfter) / 2;
      } else {
         // Fallback if something went wrong (e.g., reached the end, but not via newVirtualIndex === length - 1).
         newOrderIndex = orderBefore + 1.0;
      }
    }
  }

  // 3. Optimistic update.
  materialToMove.order_index = newOrderIndex;
  // Resort the local array. 'displayedMaterials' (computed) will pick it up.
  materials.value.sort((a, b) => a.order_index - b.order_index);

  // 4. Asynchronous RPC call.
  try {
    const { error: rpcError } = await supabase.rpc('update_material_order', {
      p_lesson_id: selectedLesson.value.id,
      p_material_id: materialId,
      p_new_order_index: newOrderIndex // Send float!
    });

    if (rpcError) throw rpcError;
    
  } catch (e) {
    console.error('Failed to reorder material:', e);
    alert(t('hub.errors.reorderMaterialFailed'));
    // Rollback.
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