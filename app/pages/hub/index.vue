<template>
  <div class="hub-layout" :class="{ 'sidebar-is-open': isSidebarOpen }">
    <aside class="hub-sidebar">
      <div class="tree-controls">
        <button @click="selectLesson(null)" :class="{ active: !selectedLesson }">
          Show All Materials
        </button>
      </div>

      <div v-if="isProgramOwner" class="add-controls">
        <input v-model="newSubjectName" placeholder="New subject name..." @keyup.enter="handleAddSubject" />
        <button @click="handleAddSubject">+</button>
      </div>

      <div v-for="subject in subjects" :key="subject.id" class="subject-group">
        <div class="subject-header" @click="toggleSubject(subject.id)">
          <h3 class="subject-title">{{ subject.name_translations?.en || 'Unnamed Subject' }}</h3>
          <button v-if="isProgramOwner" class="edit-btn" @click.stop="handleEditSubject(subject)">
            ✏️
          </button>
          <button v-if="isProgramOwner" class="delete-btn" @click.stop="handleDeleteSubject(subject)">
            &times;
          </button>
          
          <svg
            class="subject-chevron"
            :class="{ 'is-expanded': expandedSubjects.has(subject.id) }"
            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>

        <draggable
          v-if="expandedSubjects.has(subject.id)" tag="ul"
          :list="lessonsBySubject[subject.id]"
          :delay="250"
          :delay-on-touch-only="true"
          class="lesson-list"
          group="materials"
          item-key="id"
          @add="onDrop"
          @end="hoveredLesson = null"
          :sort="false"
          :ghost-class="'ghost-item'"
        >
          <template #item="{ element: lesson }">
            <li
              :class="{
                'drop-target': hoveredLesson?.id === lesson.id,
                'drop-error': errorLessonId === lesson.id
              }"
            >
              <a
                @click="selectLesson(lesson)"
                :class="{ active: selectedLesson?.id === lesson.id }"
                @dragenter.prevent="hoveredLesson = lesson"
              >
                <span class="lesson-position">{{ lesson.position }}.</span>
                <span class="lesson-title">{{ lesson.topic_translations?.en || 'Untitled Lesson' }}</span>
                  <button v-if="isProgramOwner" class="edit-btn" @click.stop="handleEditLesson(lesson)">
                    ✏️
                  </button>
                <button v-if="isProgramOwner" class="delete-btn" @click.stop="handleDeleteLesson(lesson)">
                  &times;
                </button>
                
                <span class="material-count">{{ lesson.material_count }}</span>
              </a>
            </li>
          </template>
        </draggable>

        <div v-if="isProgramOwner && expandedSubjects.has(subject.id)" class="add-controls lesson-add">
          <input 
            v-model="newLessonTopics[subject.id]" 
            placeholder="New lesson topic..." 
            @keyup.enter="handleAddLesson(subject)" 
          />
          <button @click="handleAddLesson(subject)">+</button>
        </div>
      </div>
    </aside>

    <div
      v-if="isSidebarOpen"
      class="sidebar-overlay"
      @click="isSidebarOpen = false">
    </div>

    <main class="hub-main-content">
      <div class="sidebar-toggle">
        <button @click="isSidebarOpen = !isSidebarOpen">
          ☰
        </button>
      </div>
      <header class="hub-header">
        <h1>Content Hub</h1>
        <div class="program-selector" @click="openProgramsModal">
          <span class="program-name">{{ activeProgram?.title || 'Default School Program' }}</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
          </svg>
        </div>
        <p v-if="selectedLesson">
          Showing materials for: <strong>{{ selectedLesson.topic_translations?.en }}</strong>
        </p>
        <p v-else>A central library for all learning materials.</p>
      </header>

      <div class="filters-container">
        <div class="filter-group">
          <label for="search">Search by Title</label>
          <input id="search" v-model="searchQuery" type="text" placeholder="e.g., Photosynthesis" />
        </div>
        <div class="filter-group">
          <label for="status">Status</label>
          <select id="status" v-model="statusFilter">
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="in_review">In Review</option>
            <option value="published">Published</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div class="filter-group">
          <label for="type">Material Type</label>
          <select id="type" v-model="typeFilter">
            <option value="">All</option>
            <option value="video">Video</option>
            <option value="game">Game</option>
            <option value="presentation">Presentation</option>
            <option value="article">Article</option>
          </select>
        </div>
      </div>

      <div v-if="currentUserProfile" class="materials-grid">
        <draggable
          class="draggable-container"
          :list="displayedMaterials"
          :delay="250"
          :delay-on-touch-only="true"
          :group="{ name: 'materials', pull: 'clone', put: false }"
          item-key="id"
          :sort="false"
          :drag-class="'dragging-card'"
        >
          <template #item="{ element: material }">
            <template v-if="material.isAddNewCard">
              <AddNewMaterialCard :lesson-id="selectedLesson?.id" />
            </template>
            <template v-else>
              <HubMaterialCard
                :material="material"
                :current-user="currentUserProfile"
                :selected-lesson-id="selectedLesson?.id"
                :on-update="handleMaterialUpdate"
                :active-program-id="activeProgram?.id"
                @update-position="handlePositionUpdate"
              />
            </template>
          </template>
        </draggable>
      </div>
    </main>
    <ModalWrapper />
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import draggable from 'vuedraggable';
import { useSupabaseUser, useSupabaseClient } from '#imports';
import { useModalStore } from '~/composables/useModalStore';
import AddNewMaterialCard from '~/components/hub/AddNewMaterialCard.vue';
import HubMaterialCard from '~/components/hub/MaterialCard.vue';

definePageMeta({
  middleware: 'auth'
});

// --- STATE ---
const user = useSupabaseUser();
const supabase = useSupabaseClient();
const modalStore = useModalStore();

const currentUserProfile = ref(null);
const materials = ref([]);
const isLoading = ref(true);
const error = ref(null);
const searchQuery = ref('');
const statusFilter = ref('');
const typeFilter = ref('');
const subjects = ref([]);
const lessons = ref([]);
const newLessonTopics = ref({}); 
const newSubjectName = ref('');
const selectedLesson = ref(null);
const expandedSubjects = ref(new Set());
const isSidebarOpen = ref(false);
const hoveredLesson = ref(null);
const errorLessonId = ref(null);
const activeProgram = ref(null); 
// --- PROGRAM MANAGEMENT ---
const selectProgram = (program) => {
  activeProgram.value = program;
  if (program) {
    localStorage.setItem('activeProgramId', program.id);
  } else {
    localStorage.removeItem('activeProgramId');
  }
};
const handleAddSubject = async () => {
  if (!newSubjectName.value.trim() || !isProgramOwner.value) return;

  try {
    const prefix = newSubjectName.value.trim().toLowerCase().slice(0, 4) + Math.random().toString(36).slice(-4);
    
    // TODO: The skin_id should be dynamically retrieved from the program's settings.
    // For now, we hardcode the default 'head' skin ID.
    const skinIdForStyle = '38c24e69-24f9-4a7c-a003-84d298280c14';

    const { error } = await supabase.rpc('create_subject_with_style', {
      p_program_id: activeProgram.value.id,
      p_name_en: newSubjectName.value.trim(),
      p_prefix: prefix,
      p_skin_id: skinIdForStyle
    });

    if (error) throw error;
    
    newSubjectName.value = '';
    await fetchTreeData();
  } catch (error) {
    console.error('Error adding subject:', error);
    alert('Failed to add subject.');
  }
};
const handleEditSubject = (subject) => {
  const skinId = activeProgram.value?.skin_id || '38c24e69-24f9-4a7c-a003-84d298280c14'; // Fallback to default head skin
  modalStore.open('hub/modals/EditSubjectModal', {
    subjectId: subject.id,
    skinId: skinId,
    onUpdateSuccess: () => {
      fetchTreeData();
    }
  });
};
const handleDeleteSubject = (subject) => {
  modalStore.open('hub/modals/ConfirmDeleteModal', {
    titleKey: 'hub.modals.deleteSubject.title',
    messageKey: 'hub.modals.deleteSubject.message',
    messageParams: { subjectName: subject.name_translations?.en || 'this subject' },
    onConfirm: async () => {
      try {
        const { error } = await supabase.from('subjects').delete().eq('id', subject.id);
        if (error) throw error;
        await fetchTreeData(); // Refresh the sidebar
      } catch (error) {
        console.error('Error deleting subject:', error);
        alert('Failed to delete subject.');
      }
    }
  });
};
const handleAddLesson = async (subject) => {
  const topic = newLessonTopics.value[subject.id]?.trim();
  if (!topic || !isProgramOwner.value) return;

  try {
    const currentLessons = lessonsBySubject.value[subject.id] || [];
    const newPosition = currentLessons.length + 1;
    const slug = topic.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).slice(-4);

    // TODO: The skin_id should be dynamically retrieved from the program's settings.
    const skinIdForLayout = '38c24e69-24f9-4a7c-a003-84d298280c14';

    const { error } = await supabase.rpc('create_lesson_with_layout', {
      p_program_id: activeProgram.value.id,
      p_subject_id: subject.id,
      p_topic_en: topic,
      p_position: newPosition,
      p_slug: slug,
      p_skin_id: skinIdForLayout
    });

    if (error) throw error;
    
    newLessonTopics.value[subject.id] = '';
    await fetchTreeData();
  } catch (error) {
    console.error('Error adding lesson:', error);
    alert('Failed to add lesson.');
  }
};
const handleEditLesson = (lesson) => {
  const skinId = activeProgram.value?.skin_id;
  modalStore.open('hub/modals/EditLessonModal', {
    lessonId: lesson.id,
    skinId: skinId,
    onUpdateSuccess: () => {
      fetchTreeData(); // Refresh sidebar to show new lesson name
    }
  });
};
const handleDeleteLesson = (lesson) => {
  modalStore.open('hub/modals/ConfirmDeleteModal', {
    titleKey: 'hub.modals.deleteLesson.title',
    messageKey: 'hub.modals.deleteLesson.message',
    messageParams: { lessonName: lesson.topic_translations?.en || 'this lesson' },
    onConfirm: async () => {
      try {
        // Use our new "smart" delete function
        const { error } = await supabase.rpc('delete_lesson_and_reorder', {
          p_lesson_id: lesson.id
        });
        if (error) throw error;
        await fetchTreeData();
      } catch (error) {
        console.error('Error deleting lesson:', error);
        alert('Failed to delete lesson.');
      }
    }
  });
};

const openProgramsModal = () => {
  modalStore.open('hub/modals/ProgramsModal', {
    activeProgram: activeProgram.value,
    onSelect: selectProgram,
    onClose: () => modalStore.close()
  });
};
const applyProgramScope = (query) => {
  if (activeProgram.value) {
    return query.eq('program_id', activeProgram.value.id);
  } else {
    return query.is('program_id', null);
  }
};
// --- COMPUTED ---
const isProgramOwner = computed(() => {
  // The user must be logged in and a custom program must be active
  if (!user.value || !activeProgram.value) {
    return false;
  }
  // The logged-in user's ID must match the program's creator_id
  return user.value.id === activeProgram.value.creator_id;
});
const displayedMaterials = computed(() => {
  // Display logic: Prepend an "Add New" card when a lesson is selected.
  if (selectedLesson.value) {
    const addNewCard = { isAddNewCard: true, id: 'add-new' };
    return [addNewCard, ...materials.value];
  }
  return materials.value;
});

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

// --- METHODS ---
const toggleSubject = (subjectId) => {
  if (expandedSubjects.value.has(subjectId)) {
    expandedSubjects.value.delete(subjectId);
  } else {
    expandedSubjects.value.add(subjectId);
  }
};

const selectLesson = (lesson) => {
  selectedLesson.value = lesson;
  isSidebarOpen.value = false;
};

const fetchUserProfile = async () => {
  if (user.value) {
    const { data, error: fetchError } = await supabase
      .from('user_profiles')
      .select('user_id, hub_role')
      .eq('user_id', user.value.id)
      .single();

    if (fetchError) {
      console.error("Error fetching user profile:", fetchError.message);
    } else {
      currentUserProfile.value = data;
    }
  }
};

const fetchTreeData = async () => {
  try {
    let subjectsQuery = supabase.from('subjects').select('*').order('name_translations->>en');
    // Apply program scope to the subjects query
    subjectsQuery = applyProgramScope(subjectsQuery);

    const [subjectsRes, lessonsRes] = await Promise.all([
      subjectsQuery,
      // Pass the program ID to the RPC function
      supabase.rpc('get_lessons_with_material_count', {
        p_program_id: activeProgram.value ? activeProgram.value.id : null
      })
    ]);

    if (subjectsRes.error) throw subjectsRes.error;
    if (lessonsRes.error) throw lessonsRes.error;

    subjects.value = subjectsRes.data;
    lessons.value = lessonsRes.data;

  } catch (e) {
    console.error("Error fetching tree data:", e);
    error.value = e;
  }
};
const handleMaterialUpdate = async () => {
  // This function refreshes both the main content and the sidebar.
  await fetchMaterials();
  await fetchTreeData();
};
const fetchMaterials = async () => {
  isLoading.value = true;
  error.value = null;
  try {
    let query;

    if (selectedLesson.value) {
      // Fetch materials for the selected lesson, ordered by position.
      query = supabase
        .from('lesson_materials')
        .select('position, learning_apps ( * )')
        .eq('lesson_id', selectedLesson.value.id);

      if (statusFilter.value) query = query.eq('learning_apps.status', statusFilter.value);
      if (typeFilter.value) query = query.eq('learning_apps.material_type', typeFilter.value);
      if (searchQuery.value) query = query.ilike('learning_apps.title_translations->>en', `%${searchQuery.value}%`);

      query = query.order('position', { ascending: true });
    } else {
      // Fetch all materials if no lesson is selected.
      query = supabase.from('learning_apps').select('*');

      if (statusFilter.value) query = query.eq('status', statusFilter.value);
      if (typeFilter.value) query = query.eq('material_type', typeFilter.value);
      if (searchQuery.value) query = query.ilike('title_translations->>en', `%${searchQuery.value}%`);

      query = query.order('created_at', { ascending: false });
    }

    const { data, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    if (selectedLesson.value) {
      // Map the RPC result, combining the material data with its position.
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

const handlePositionUpdate = async ({ materialId, newPosition }) => {
  // Handles reordering materials via manual input on the card component.
  if (!selectedLesson.value) return;

  try {
    const { error: rpcError } = await supabase.rpc('reorder_lesson_materials', {
      p_lesson_id: selectedLesson.value.id,
      p_material_id: materialId,
      p_new_position: newPosition
    });

    if (rpcError) throw rpcError;
    await fetchMaterials();

  } catch (e) {
    console.error('Failed to reorder materials by input:', e);
    await fetchMaterials();
  }
};

const onDrop = async (event) => {
  // Handles dropping a material onto a lesson in the sidebar.
  const { newIndex } = event;
  const droppedMaterial = event.item.__draggable_context.element;
  const targetLesson = hoveredLesson.value;

  // Immediately remove the item vuedraggable adds to the lesson list to prevent UI glitches.
  if (targetLesson) {
    const lessonList = lessonsBySubject.value[targetLesson.subject_id];
    if (lessonList) {
      lessonList.splice(newIndex, 1);
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

    // Optimistically update the material count in the UI.
    const lessonInUI = lessons.value.find(l => l.id === targetLesson.id);
    if (lessonInUI) {
      lessonInUI.material_count = (lessonInUI.material_count || 0) + 1;
    }

    await fetchTreeData();

  } catch (e) {
    console.error("Error linking material:", e);
  } finally {
    hoveredLesson.value = null;
  }
};

// This new function will be our main data loader.
const fetchAllHubData = async () => {
  isLoading.value = true;
  await fetchTreeData();
  await fetchMaterials();
  isLoading.value = false;
};

watch([selectedLesson, activeProgram], (newValue, oldValue) => {
  const oldProgramId = oldValue[1]?.id;
  const newProgramId = newValue[1]?.id;

  // If the program has changed, we must reset the selected lesson
  // to avoid showing a lesson that doesn't belong to the new program.
  if (oldProgramId !== newProgramId) {
    selectedLesson.value = null;
  }

  // Refetch all data whenever the lesson or program changes.
  fetchAllHubData();
}, {
  deep: true // Use deep watch for objects
});

onMounted(async () => {
  await fetchUserProfile();
  const savedProgramId = localStorage.getItem('activeProgramId');
  if (savedProgramId) {
    try {
      const { data: savedProgram, error } = await supabase
        .from('programs')
        .select('*')
        .eq('id', savedProgramId)
        .single();
      
      if (error) throw error;
      if (savedProgram) {
        activeProgram.value = savedProgram;
      }
    } catch (e) {
      console.error('Failed to restore active program, defaulting.', e);
      localStorage.removeItem('activeProgramId');
    }
  }
  await fetchAllHubData(); 
});
</script>

<style scoped>
/* Main Layout */
.hub-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  height: 100vh;
}

.hub-sidebar {
  background-color: #1f2937;
  padding: 1.5rem;
  overflow-y: auto;
  border-right: 1px solid #374151;
}

.hub-main-content {
  overflow-y: auto;
  padding: 2rem;
  background-color: #f0f2f5;
}

.hub-header {
  margin-bottom: 2rem;
  text-align: center;
  color: #262e3d;
}

.hub-header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  color: #262e3d;
}

/* Sidebar Tree Styles */
.hub-sidebar h2 {
  font-size: 1.2rem;
  color: #d1d5db;
  margin-bottom: 1rem;
}

.tree-controls button {
  width: 100%;
  padding: 0.5rem;
  background-color: #374151;
  border: none;
  color: #f3f4f6;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 1.5rem;
  text-align: left;
}

.tree-controls button.active {
  background-color: #df6a8d;
  font-weight: bold;
}

.subject-title {
  font-size: 1rem;
  font-weight: bold;
  color: #9ca3af;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
/* Add this to your style block */
.subject-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 0.25rem 0;
}

.subject-header:hover .subject-title {
  color: #fff;
}

.subject-chevron {
  width: 16px;
  height: 16px;
  color: #9ca3af;
  transition: transform 0.2s ease-in-out;
}

.subject-chevron.is-expanded {
  transform: rotate(180deg);
}
.lesson-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.lesson-list a {
  position: relative;
  display: flex;
  align-items: baseline;
 
  padding: 0.1rem;
  text-decoration: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}
.lesson-list li.drop-target > a {
  background-color: #6d28d9; 
  outline: 2px dashed #fff;
  outline-offset: -2px;
}
.lesson-position {
  flex-shrink: 0;
  font-weight: bold;
  color: #e46ca8;
  
  /* NEW: Fixed width for perfect alignment */
  width: 1.6rem; /* Задаем фиксированную ширину */
  text-align: left; /* Выравниваем текст номера по левому краю */
}

.lesson-title {
  flex-grow: 1; /* Allow title to take up available space */
  color: #d1d5db; /* Main color for the title */
  /* The right padding is now handled by the counter's position */
}
/* --- Hover and Active States --- */

.lesson-list a:hover .lesson-title {
  color: #fff;
}

.lesson-list a.active {
  background-color: #4f46e5;
}

.lesson-list a.active .lesson-position {
  color: #cc68ae; /* Lighter color for number when active */
}

.lesson-list a.active .lesson-title {
  color: #fff; /* White title when active */
}
.lesson-list li.drop-error > a {
  /* Мигающая красная рамка для обратной связи */
  animation: flash-red 0.5s ease-in-out 3;
}

@keyframes flash-red {
  0%, 100% {
    box-shadow: none;
  }
  50% {
    box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.7);
  }
}
.ghost-item {
  opacity: 0;
  height: 0;
  display: none;
}
.add-controls {
  display: flex;
  gap: 0.5rem;
  margin: 1rem 0 0.5rem;
}
.add-controls input {
  flex-grow: 1;
  background-color: #374151;
  border: 1px solid #4b5563;
  color: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}
.add-controls button {
  flex-shrink: 0;
  background-color: #4f46e5;
  border: none;
  color: #fff;
  font-weight: bold;
  border-radius: 4px;
  width: 30px;
  height: 30px;
  cursor: pointer;
}
.lesson-add {
  margin-top: 0.5rem;
}
.delete-btn {
  background: none;
  border: none;
  color: #9ca3af;
  font-size: 1.5rem;
  line-height: 1;
  padding: 0 0.5rem;
  cursor: pointer;
  border-radius: 4px;
  margin: 0 0.5rem;
}
.delete-btn:hover {
  background-color: #ef4444;
  color: #fff;
}
.edit-btn {
  background: none;
  border: none;
  color: #9ca3af;
  font-size: 1rem; /* Smaller than delete button */
  line-height: 1;
  padding: 0 0.25rem;
  cursor: pointer;
  border-radius: 4px;
}
.edit-btn:hover {
  background-color: #2563eb;
  color: #fff;
}
/* Make sure delete button on lesson is positioned correctly */
.lesson-list a {
  align-items: center; /* This helps center the delete button vertically */
}
.lesson-title {
  margin-right: auto; /* Push delete button and count to the right */
}
/* The material-count style remains the same */
.material-count {
  position: absolute;
  top: 15px;
  right: -15px;
  font-size: 0.7rem;
  padding: 1px 5px;
  background-color: #4b5563;
  color: #d1d5db;
  font-weight: bold;
  border-radius: 8px;
  min-width: 18px;
  text-align: center;
}

.lesson-list a.active .material-count {
  background-color: #f3f4f6;
  color: #4f46e5;
}
.program-selector {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  cursor: pointer;
  margin: 0.5rem 0;
  transition: all 0.2s ease;
}
.program-selector:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}
.program-name {
  font-weight: 600;
  color: #262e3d;
}
.program-selector svg {
  width: 1rem;
  height: 1rem;
  color: #9ca3af;
}
/* Filters Styles */
.filters-container {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-width: 180px;
}

.filter-group label {
  font-size: 0.8rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
  color: #374151;
}

.filter-group input,
.filter-group select {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background-color: #fff;
  color: #111827;
}

@media (max-width: 768px) {
  .filters-container {
    flex-direction: column;
  }
}

/* Main Content Grid & States */
.materials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  grid-auto-rows: min-content;
}
.draggable-container {
  display: contents; 
}
.ghost-item {
  display: none;
}
.state-indicator {
  text-align: center;
  margin-top: 4rem;
  color: #555;
  font-size: 1.2rem;
}

.state-indicator.error {
  color: #e74c3c;
}
/* Hide the toggle button by default on larger screens */
.sidebar-toggle {
  display: none;
}
/* =================================== */
/* === NEW: Mobile Responsive Styles === */
/* =================================== */

@media (max-width: 768px) {
  
  /* The layout becomes a single column */
  .hub-layout {
    grid-template-columns: 1fr;
  }

  /* The toggle button, hidden on desktop, now appears */
  .sidebar-toggle {
    position: fixed;
    top: 1rem;
    left: 1rem;
    z-index: 998;
    display: block;
    margin-bottom: 1rem;
  }
  
.sidebar-toggle button {
  /* MODIFIED: Glassmorphism effect */
  background-color: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(1px);

  border: 1px solid rgba(209, 213, 219, 0.5);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 500;
  color: #111827;
}

  /* The sidebar is now positioned absolutely, off-screen */
  .hub-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 280px; /* Same width as before */
    height: 100%;
    z-index: 1000;
    transform: translateX(-100%); /* Hidden by default */
    transition: transform 0.3s ease-in-out;
    box-shadow: 5px 0px 15px rgba(0,0,0,0.2);
  }

  /* When the .sidebar-is-open class is added, the sidebar slides in */
  .hub-layout.sidebar-is-open .hub-sidebar {
    transform: translateX(0);
  }
}
/* NEW: Style for the clickable overlay */
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999; /* Below sidebar, above content */
}

</style>