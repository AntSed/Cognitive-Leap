// app/composables/useHubSidebarLogic.js

import { ref, computed } from 'vue';
import { useSupabaseClient } from '#imports';
import { useModalStore } from '~/composables/useModalStore';
import { useI18n } from 'vue-i18n';

/**
 * Manages the state and logic for the Content Hub's sidebar.
 * This includes fetching and displaying the program structure (subjects and lessons),
 * handling all CRUD operations for them, and managing the drop logic for materials.
 *
 * @param {import('vue').Ref<object | null>} activeProgram - A ref holding the currently active program.
 */
export function useHubSidebarLogic(activeProgram) {
  // --- SETUP ---
  const supabase = useSupabaseClient();
  const modalStore = useModalStore();
  const { t } = useI18n();

  // --- STATE ---

  /** @type {import('vue').Ref<Array<object>>} */
  const subjects = ref([]);
  
  /** @type {import('vue').Ref<Array<object>>} */
  const lessons = ref([]);

  /** @type {import('vue').Ref<object | null>} */
  const selectedLesson = ref(null);

  /** @type {import('vue').Ref<Set<string>>} */
  const expandedSubjects = ref(new Set());

  /** @type {import('vue').Ref<string>} */
  const newSubjectName = ref('');
  
  /** @type {import('vue').Ref<Record<string, string>>} */
  const newLessonTopics = ref({});

  /** @type {import('vue').Ref<object | null>} */
  const hoveredLesson = ref(null);
  
  /** @type {import('vue').Ref<string | null>} */
  const errorLessonId = ref(null);

  // --- COMPUTED ---

  /**
   * Groups lessons by their subject ID for efficient rendering in the sidebar tree.
   * @returns {Record<string, Array<object>>}
   */
  const lessonsBySubject = computed(() => {
    if (!lessons.value) return {};
    return lessons.value.reduce((acc, lesson) => {
      if (!acc[lesson.subject_id]) {
        acc[lesson.subject_id] = [];
      }
      acc[lesson.subject_id].push(lesson);
      return acc;
    }, {});
  });
// --- INTERNAL STATE MUTATIONS ---

  const incrementMaterialCount = (lessonId) => {
    if (!lessonId) return;
    const lesson = lessons.value.find(l => l.id === lessonId);
    if (lesson) {
      lesson.material_count = (lesson.material_count || 0) + 1;
    }
  };

  const decrementMaterialCount = (lessonId) => {
    if (!lessonId) return;
    const lesson = lessons.value.find(l => l.id === lessonId);
    if (lesson && lesson.material_count > 0) {
      lesson.material_count -= 1;
    }
  };
  // --- METHODS ---

  /**
   * Fetches the subjects and lessons for the currently active program.
   */
const fetchTreeData = async () => {
    try {
        const programId = activeProgram.value ? activeProgram.value.id : null;

        // ШАГ 1: Создаем и настраиваем запрос ЗАРАНЕЕ
        let subjectsQuery = supabase.from('subjects').select('*').order('name_translations->>en');

        if (programId) {
            subjectsQuery = subjectsQuery.eq('program_id', programId);
        } else {
            subjectsQuery = subjectsQuery.is('program_id', null);
        }

        // ШАГ 2: Передаем уже готовую переменную с запросом в Promise.all
        const [subjectsRes, lessonsRes] = await Promise.all([
            subjectsQuery, // <-- Вот здесь используется переменная
            supabase.rpc('get_lessons_with_material_count', { p_program_id: programId })
        ]);

        // ... остальной код функции ...
        if (subjectsRes.error) throw subjectsRes.error;
        if (lessonsRes.error) throw lessonsRes.error;

        subjects.value = subjectsRes.data;
        lessons.value = lessonsRes.data;

    } catch (e) {
        console.error("Error fetching tree data:", e);
    }
};

  /**
   * Toggles the expanded/collapsed state of a subject in the sidebar.
   * @param {string} subjectId - The ID of the subject to toggle.
   */
  const toggleSubject = (subjectId) => {
    if (expandedSubjects.value.has(subjectId)) {
      expandedSubjects.value.delete(subjectId);
    } else {
      expandedSubjects.value.add(subjectId);
    }
  };

  /**
   * Sets the currently selected lesson.
   * @param {object | null} lesson - The lesson object to select, or null to deselect.
   */
  const selectLesson = (lesson) => {
    selectedLesson.value = lesson;
    // Closing sidebar on mobile is handled in the component
  };

  /**
   * Creates a new subject within the active program.
   */
  const handleAddSubject = async () => {
    if (!newSubjectName.value.trim() || !activeProgram.value?.id) return;
    
    // The skin_id should be dynamically retrieved from the program's settings.
    const skinId = activeProgram.value.skin_id;
    if (!skinId) {
        alert(t('hub.errors.programMissingSkin'));
        return;
    }

    try {
      const prefix = newSubjectName.value.trim().toLowerCase().slice(0, 4) + Math.random().toString(36).slice(-4);
      
      const { error } = await supabase.rpc('create_subject_with_style', {
        p_program_id: activeProgram.value.id,
        p_name_en: newSubjectName.value.trim(),
        p_prefix: prefix,
        p_skin_id: skinId
      });

      if (error) throw error;
      
      newSubjectName.value = '';
      await fetchTreeData();
    } catch (error) {
      console.error('Error adding subject:', error);
      alert(t('hub.errors.addSubjectFailed'));
    }
  };

  /**
   * Opens a modal to edit an existing subject.
   * @param {object} subject - The subject object to edit.
   */
  const handleEditSubject = (subject) => {
    const skinId = activeProgram.value?.skin_id;
    if (!skinId) {
        alert(t('hub.errors.programMissingSkin'));
        return;
    }
    modalStore.open('hub/modals/EditSubjectModal', {
      subjectId: subject.id,
      skinId: skinId,
      onUpdateSuccess: fetchTreeData
    });
  };

  /**
   * Opens a confirmation modal and deletes a subject if confirmed.
   * @param {object} subject - The subject object to delete.
   */
  const handleDeleteSubject = (subject) => {
    modalStore.open('hub/modals/ConfirmDeleteModal', {
      titleKey: 'hub.modals.deleteSubject.title',
      messageKey: 'hub.modals.deleteSubject.message',
      messageParams: { subjectName: subject.name_translations?.en || 'this subject' },
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('subjects').delete().eq('id', subject.id);
          if (error) throw error;
          await fetchTreeData();
        } catch (error) {
          console.error('Error deleting subject:', error);
          alert(t('hub.errors.deleteSubjectFailed'));
        }
      }
    });
  };

  /**
   * Creates a new lesson within a given subject.
   * @param {object} subject - The subject to which the new lesson will be added.
   */
  const handleAddLesson = async (subject) => {
    const topic = newLessonTopics.value[subject.id]?.trim();
    if (!topic || !activeProgram.value?.id) return;

    const skinId = activeProgram.value.skin_id;
    if (!skinId) {
        alert(t('hub.errors.programMissingSkin'));
        return;
    }

    try {
      const currentLessons = lessonsBySubject.value[subject.id] || [];
      const newPosition = currentLessons.length + 1;
      const slug = topic.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).slice(-4);

      const { error } = await supabase.rpc('create_lesson_with_layout', {
        p_program_id: activeProgram.value.id,
        p_subject_id: subject.id,
        p_topic_en: topic,
        p_position: newPosition,
        p_slug: slug,
        p_skin_id: skinId
      });

      if (error) throw error;
      
      newLessonTopics.value[subject.id] = '';
      await fetchTreeData();
    } catch (error) {
      console.error('Error adding lesson:', error);
      alert(t('hub.errors.addLessonFailed'));
    }
  };

  /**
   * Opens a modal to edit an existing lesson.
   * @param {object} lesson - The lesson object to edit.
   */
  const handleEditLesson = (lesson) => {
    const skinId = activeProgram.value?.skin_id;
    modalStore.open('hub/modals/EditLessonModal', {
      lessonId: lesson.id,
      skinId: skinId, // Can be null, modal should handle it
      onUpdateSuccess: fetchTreeData
    });
  };

  /**
   * Opens a confirmation modal and deletes a lesson if confirmed.
   * @param {object} lesson - The lesson object to delete.
   */
  const handleDeleteLesson = (lesson) => {
    modalStore.open('hub/modals/ConfirmDeleteModal', {
      titleKey: 'hub.modals.deleteLesson.title',
      messageKey: 'hub.modals.deleteLesson.message',
      messageParams: { lessonName: lesson.topic_translations?.en || 'this lesson' },
      onConfirm: async () => {
        try {
          const { error } = await supabase.rpc('delete_lesson_and_reorder', { p_lesson_id: lesson.id });
          if (error) throw error;
          await fetchTreeData();
        } catch (error) {
          console.error('Error deleting lesson:', error);
          alert(t('hub.errors.deleteLessonFailed'));
        }
      }
    });
  };

  /**
   * Reorders lessons within a subject based on user input.
   * @param {object} lesson - The lesson being moved.
   * @param {number} newPosition - The new position for the lesson.
   */
  const handleLessonPositionUpdate = async (lesson, newPosition) => {
    if (!newPosition || newPosition < 1) {
      alert(t('hub.errors.invalidPosition'));
      return;
    }

    try {
      const { error } = await supabase.rpc('reorder_lessons', {
        p_lesson_id: lesson.id,
        p_new_position: newPosition
      });
      if (error) throw error;
      await fetchTreeData();
    } catch (error) {
      console.error('Failed to reorder lesson:', error);
      alert(t('hub.errors.reorderLessonFailed'));
      await fetchTreeData(); // Re-fetch to revert UI
    }
  };

  /**
   * Handles the drop event when a material is dragged onto a lesson.
   * @param {DragEvent} event - The event object from vuedraggable.
   */
  const onDrop = async (event) => {
    const droppedMaterial = event.item.__draggable_context.element;
    const targetLesson = hoveredLesson.value;

    // Immediately remove the visual item vuedraggable adds to the list
    if (targetLesson) {
      const lessonList = lessonsBySubject.value[targetLesson.subject_id];
      if (lessonList) {
        const index = lessonList.findIndex(item => item.id === droppedMaterial.id);
        if (index !== -1) lessonList.splice(index, 1);
      }
    }

    if (!droppedMaterial || !targetLesson || droppedMaterial.isAddNewCard) {
      hoveredLesson.value = null;
      return;
    }

    try {
      const { data: existingLink, error: checkError } = await supabase
        .from('lesson_materials')
        .select('lesson_id')
        .match({ material_id: droppedMaterial.id, lesson_id: targetLesson.id })
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingLink) {
        errorLessonId.value = targetLesson.id;
        setTimeout(() => { errorLessonId.value = null; }, 1500);
        return;
      }

      const { count, error: countError } = await supabase
        .from('lesson_materials')
        .select('*', { count: 'exact', head: true })
        .eq('lesson_id', targetLesson.id);

      if (countError) throw countError;
      const newPosition = (count ?? 0) + 1;

      const { error: insertError } = await supabase
        .from('lesson_materials')
        .insert({
          lesson_id: targetLesson.id,
          material_id: droppedMaterial.id,
          position: newPosition
        });

      if (insertError) throw insertError;
      incrementMaterialCount(targetLesson.id);

    } catch (e) {
      console.error("Error linking material:", e);
      alert(t('hub.errors.linkMaterialFailed'));
    } finally {
      hoveredLesson.value = null;
    }
  };


  return {
    // State
    subjects,
    lessons,
    selectedLesson,
    expandedSubjects,
    newSubjectName,
    newLessonTopics,
    hoveredLesson,
    errorLessonId,
    // Computed
    lessonsBySubject,
    // Methods
    incrementMaterialCount, 
    decrementMaterialCount,
    fetchTreeData,
    toggleSubject,
    selectLesson,
    handleAddSubject,
    handleEditSubject,
    handleDeleteSubject,
    handleAddLesson,
    handleEditLesson,
    handleDeleteLesson,
    handleLessonPositionUpdate,
    onDrop,
  };
}