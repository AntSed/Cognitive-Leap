// app/composables/useHubSidebarLogic.js
import { ref, computed } from 'vue';
import { useSupabaseClient } from '#imports';
import { useModalStore } from '~/composables/useModalStore';
import { useI18n } from 'vue-i18n';


export function useHubSidebarLogic(activeProgramRef) { 
  // --- SETUP ---
  const supabase = useSupabaseClient();
  const modalStore = useModalStore();
  const { t, locale } = useI18n();

  // --- STATE ---
  const subjects = ref([]);
  const lessons = ref([]);
  const selectedLesson = ref(null);
  const expandedSubjects = ref(new Set());
  const newSubjectName = ref('');
  const newLessonTopics = ref({});
  const hoveredLesson = ref(null);
  const errorLessonId = ref(null);

  // --- COMPUTED ---
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

  // --- INTERNAL STATE MUTATIONS (ОБНОВЛЕНО) ---

  /**
   * Increments the correct material counter for a lesson.
   * @param {string} lessonId - The ID of the lesson.
   * @param {'study' | 'exam'} context - The context of the material.
   */
  const incrementMaterialCount = (lessonId, context = 'study') => {
    if (!lessonId) return;
    const lesson = lessons.value.find(l => l.id === lessonId);
    if (lesson) {
      if (context === 'exam') {
        lesson.exam_count = (lesson.exam_count || 0) + 1;
      } else {
        lesson.study_count = (lesson.study_count || 0) + 1;
      }
    }
  };

  /**
   * Decrements the correct material counter for a lesson.
   * @param {string} lessonId - The ID of the lesson.
   * @param {'study' | 'exam'} context - The context of the material.
   */
  const decrementMaterialCount = (lessonId, context = 'study') => {
    if (!lessonId) return;
    const lesson = lessons.value.find(l => l.id === lessonId);
    if (lesson) {
      if (context === 'exam' && lesson.exam_count > 0) {
              lesson.exam_count -= 1;
         } else if (context === 'study' && lesson.study_count > 0) {
              lesson.study_count -= 1; // Стало как exam_count
         }
    }
  };
  
  // --- METHODS ---

  /**
   * Fetches the subjects and lessons for the currently active program.
   */
  const fetchTreeData = async () => {
    try {
      const programId = activeProgramRef.value ? activeProgramRef.value.id : null;

      let subjectsQuery = supabase.from('subjects').select('*').order('name_translations->>en');
      if (programId) {
        subjectsQuery = subjectsQuery.eq('program_id', programId);
      } else {
        subjectsQuery = subjectsQuery.is('program_id', null);
      }

      const [subjectsRes, lessonsRes] = await Promise.all([
        subjectsQuery,
        supabase.rpc('get_lessons_with_counts_and_subject', { p_program_id: programId })
      ]);

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
   */
  const selectLesson = (lesson) => {
    selectedLesson.value = lesson;
  };

  // ... (handleAddSubject, handleEditSubject, handleDeleteSubject без изменений) ...
  const handleAddSubject = async () => {
    if (!newSubjectName.value.trim() || !activeProgramRef.value?.id) return;
    const skinId = activeProgramRef.value.skin_id;
    if (!skinId) {
        alert(t('hub.errors.programMissingSkin'));
        return;
    }
    try {
      const prefix = newSubjectName.value.trim().toLowerCase().slice(0, 4) + Math.random().toString(36).slice(-4);
      const { error } = await supabase.rpc('create_subject_with_style', {
        p_program_id: activeProgramRef.value.id,
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

  const handleEditSubject = (subject) => {
    const skinId = activeProgramRef.value?.skin_id;
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

  const handleDeleteSubject = (subject) => {
    modalStore.open('hub/modals/ConfirmDeleteModal', {
      titleKey: 'hub.modals.deleteSubject.title',
      messageKey: 'hub.modals.deleteSubject.message',
      messageParams: { subjectName: subject.name_translations?.[locale.value] || subject.name_translations?.en || 'this subject' },
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

  // ... (handleAddLesson, handleEditLesson, handleDeleteLesson без изменений) ...
  const handleAddLesson = async (subject) => {
    const topic = newLessonTopics.value[subject.id]?.trim();
    if (!topic || !activeProgramRef.value?.id) return;

    const skinId = activeProgramRef.value.skin_id;
    if (!skinId) {
        alert(t('hub.errors.programMissingSkin'));
        return;
    }

    try {
      const currentLessons = lessonsBySubject.value[subject.id] || [];
      const newPosition = currentLessons.length + 1;
      const slug = topic.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).slice(-4);

      const { error } = await supabase.rpc('create_lesson_with_layout', {
        p_program_id: activeProgramRef.value.id,
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

  const handleEditLesson = (lesson) => {
    const skinId = activeProgramRef.value?.skin_id;
    modalStore.open('hub/modals/EditLessonModal', {
      lessonId: lesson.id,
      skinId: skinId,
      onUpdateSuccess: fetchTreeData
    });
  };

  const handleDeleteLesson = (lesson) => {
    modalStore.open('hub/modals/ConfirmDeleteModal', {
      titleKey: 'hub.modals.deleteLesson.title',
      messageKey: 'hub.modals.deleteLesson.message',
      messageParams: { lessonName: lesson.topic_translations?.[locale.value] || lesson.topic_translations?.en || 'this lesson' },
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
      await fetchTreeData(); 
    }
  };

  /**
   * Handles the drop event when a material is dragged onto a lesson.
   * @param {DragEvent} event - The event object from vuedraggable.
   * @param {'study' | 'exam'} hubContext - The current UI context.
   */
  const onDrop = async (event, hubContext = 'study') => { // ИЗМЕНЕНО: Добавлен hubContext
    const droppedMaterial = event.item.__draggable_context.element;
    const targetLesson = hoveredLesson.value;

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

    if (droppedMaterial.material_purpose !== hubContext) {
        console.warn(`Mismatched drop context. UI: ${hubContext}, Material: ${droppedMaterial.material_purpose}`);
        alert(t('hub.errors.mismatchedDrop')); // Ошибка: Попытка перетащить учебный материал в экзамены
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

      const { data: newOrderIndex, error: indexError } = await supabase
        .rpc('get_next_material_order_index', {
          p_lesson_id: targetLesson.id,
          p_material_purpose: hubContext // hubContext тут уже есть!
        });

      if (indexError) throw indexError;
      
      const { error: insertError } = await supabase
        .from('lesson_materials')
        .insert({
          lesson_id: targetLesson.id,
          material_id: droppedMaterial.id,
          order_index: newOrderIndex // <-- Используем order_index
        });

      if (insertError) throw insertError;
      
      incrementMaterialCount(targetLesson.id, hubContext);

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