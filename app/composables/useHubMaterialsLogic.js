// app/composables/useHubMaterialsLogic.js

import { ref, computed } from 'vue';
import { useSupabaseClient } from '#imports';
import { useI18n } from 'vue-i18n';

/**
 * Manages the state and logic for the Content Hub's main content area.
 * This includes fetching, filtering, and displaying the grid of learning materials.
 *
 * @param {import('vue').Ref<object | null>} selectedLesson - A ref holding the currently selected lesson to filter materials.
 * @param {import('vue').Ref<object | null>} activeProgram - A ref holding the currently active program.
 */
export function useHubMaterialsLogic(selectedLesson, activeProgram) {
  // --- SETUP ---
  const supabase = useSupabaseClient();
  const { t } = useI18n();

  // --- STATE ---

  /** @type {import('vue').Ref<Array<object>>} */
  const materials = ref([]);
  
  /** @type {import('vue').Ref<boolean>} */
  const isLoading = ref(true);
  
  /** @type {import('vue').Ref<Error | null>} */
  const error = ref(null);

  // Filter state
  /** @type {import('vue').Ref<string>} */
  const searchQuery = ref('');
  
  /** @type {import('vue').Ref<string>} */
  const statusFilter = ref('');
  
  /** @type {import('vue').Ref<string>} */
  const typeFilter = ref('');

  // --- COMPUTED ---

  /**
   * Prepends an "Add New" card to the materials list when a lesson is selected,
   * allowing users to add new content to the selected lesson.
   * @returns {Array<object>}
   */
  const displayedMaterials = computed(() => {
    // This logic can be expanded based on user permissions in the future.
    if (selectedLesson.value) {
      const addNewCard = { isAddNewCard: true, id: 'add-new-sentinel' };
      return [addNewCard, ...materials.value];
    }
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
        // Fetch materials specifically linked to the selected lesson.
        query = supabase
          .from('lesson_materials')
          .select('position, learning_apps ( * )')
          .eq('lesson_id', selectedLesson.value.id);
        
        // Apply filters to the nested learning_apps record.
        if (statusFilter.value) query = query.eq('learning_apps.status', statusFilter.value);
        if (typeFilter.value) query = query.eq('learning_apps.material_type', typeFilter.value);
        if (searchQuery.value) query = query.ilike('learning_apps.title_translations->>en', `%${searchQuery.value}%`);

        query = query.order('position', { ascending: true });

      } else {
        // Fetch all materials from the central library.
        // The query must be scoped to the program or be program-agnostic.
        // NOTE: This assumes that "Show All Materials" displays materials from all programs
        // unless a specific program-level filter is implemented.
        query = supabase.from('learning_apps').select('*');
        
        if (statusFilter.value) query = query.eq('status', statusFilter.value);
        if (typeFilter.value) query = query.eq('material_type', typeFilter.value);
        if (searchQuery.value) query = query.ilike('title_translations->>en', `%${searchQuery.value}%`);
        
        query = query.order('created_at', { ascending: false });
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      if (selectedLesson.value) {
        // Unpack the nested material data and combine it with the position from the join table.
        materials.value = data.map(item => ({
          ...item.learning_apps,
          position: item.position
        })).filter(Boolean); // Filter out any potential nulls if a material was deleted
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
   * Handles reordering of materials within a lesson via manual position input.
   * @param {object} payload - The event payload.
   * @param {string} payload.materialId - The ID of the material being moved.
   * @param {number} payload.newPosition - The new position for the material.
   */
  const handlePositionUpdate = async ({ materialId, newPosition }) => {
    if (!selectedLesson.value) return;

    try {
      const { error: rpcError } = await supabase.rpc('reorder_lesson_materials', {
        p_lesson_id: selectedLesson.value.id,
        p_material_id: materialId,
        p_new_position: newPosition
      });

      if (rpcError) throw rpcError;
      
      // Refresh the materials list to show the new order.
      await fetchMaterials();

    } catch (e) {
      console.error('Failed to reorder materials by input:', e);
      alert(t('hub.errors.reorderMaterialFailed'));
      // Re-fetch to revert the UI to the correct state from the database.
      await fetchMaterials();
    }
  };

  return {
    // State
    materials,
    isLoading,
    error,
    searchQuery,
    statusFilter,
    typeFilter,
    // Computed
    displayedMaterials,
    // Methods
    fetchMaterials,
    handlePositionUpdate,
  };
}