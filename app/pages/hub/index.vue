// app\pages\hub\index.vue
<template>
  <div class="hub-layout" :class="{ 'sidebar-is-open': isSidebarOpen }">
    <aside class="hub-sidebar hide-scrollbar">
      <div class="tree-controls">
        <button @click="selectLesson(null)" :class="{ active: !selectedLesson }">
          {{ t('hub.sidebar.showAll') }}
        </button>
      </div>

      <div v-if="isProgramOwner" class="add-controls">
        <input v-model="newSubjectName" :placeholder="t('hub.sidebar.newSubjectPlaceholder')" @keyup.enter="handleAddSubject" />
        <button @click="handleAddSubject">+</button>
      </div>

      <div v-for="subject in subjects" :key="subject.id" class="subject-group">
        <div class="subject-header" @click="toggleSubject(subject.id)">
          <h3 class="subject-title">{{ subject.name_translations?.en || t('hub.unnamedSubject') }}</h3>
          <div class="sidebar-actions">
            <svg class="subject-chevron" :class="{ 'is-expanded': expandedSubjects.has(subject.id) }" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
            <button v-if="isProgramOwner" class="edit-btn" @click.stop="handleEditSubject(subject)">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
              </svg>
            </button>
            <button v-if="isProgramOwner" class="delete-btn" @click.stop="handleDeleteSubject(subject)">
              &times;
            </button>
          </div>
        </div>

        <draggable
          v-if="expandedSubjects.has(subject.id)" tag="ul"
          :list="lessonsBySubject[subject.id] || []"
          :delay="250" :delay-on-touch-only="true" :disabled="isInlineEditing"
          class="lesson-list" group="materials" item-key="id"
          @add="onDrop"
          @end="hoveredLesson = null"
          :sort="false"
          :ghost-class="'ghost-item'"
        >
          <template #item="{ element: lesson }">
            <li :class="{ 'drop-target': hoveredLesson?.id === lesson.id, 'drop-error': errorLessonId === lesson.id }">
              <a @click="selectLesson(lesson)" :class="{ active: selectedLesson?.id === lesson.id }" @dragenter.prevent="hoveredLesson = lesson">
                <EditablePosition v-if="isProgramOwner" :model-value="lesson.position" @update:modelValue="newPosition => handleLessonPositionUpdate(lesson, newPosition)" />
                <span v-else class="lesson-position">{{ lesson.position }}.</span>
                <span class="lesson-title">{{ lesson.topic_translations?.en || t('hub.untitledLesson') }}</span>
                <div class="sidebar-actions">
                  <span class="material-count">{{ lesson.material_count }}</span>
                  <button v-if="isProgramOwner" class="edit-btn" @click.stop="handleEditLesson(lesson)">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                  <button v-if="isProgramOwner" class="delete-btn" @click.stop="handleDeleteLesson(lesson)">
                    &times;
                  </button>
                </div>
              </a>
            </li>
          </template>
        </draggable>

        <div v-if="isProgramOwner && expandedSubjects.has(subject.id)" class="add-controls lesson-add">
          <input v-model="newLessonTopics[subject.id]" :placeholder="t('hub.sidebar.newLessonPlaceholder')" @keyup.enter="handleAddLesson(subject)" />
          <button @click="handleAddLesson(subject)">+</button>
        </div>
      </div>
    </aside>

    <div v-if="isSidebarOpen" class="sidebar-overlay" @click="isSidebarOpen = false"></div>

    <main class="hub-main-content">
      <div class="sidebar-toggle">
        <button @click="isSidebarOpen = !isSidebarOpen">☰</button>
      </div>
      <header class="hub-header">
        <h1>{{ t('hub.title') }}</h1>
        <div class="program-selector" @click="openProgramsModal">
          <span class="program-name">{{ activeProgram?.title || t('hub.defaultProgram') }}</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
          </svg>
        </div>
        <p v-if="selectedLesson">
          {{ t('hub.showingMaterialsFor') }} <strong>{{ selectedLesson.topic_translations?.en }}</strong>
        </p>
        <p v-else>{{ t('hub.centralLibrary') }}</p>
      </header>

      <div class="filters-container">
        <div class="filter-group">
          <label for="search">{{ t('hub.filters.search') }}</label>
          <input id="search" v-model="searchQuery" type="text" placeholder="e.g., Photosynthesis" />
        </div>
        <div class="filter-group">
          <label for="status">{{ t('hub.filters.status') }}</label>
          <select id="status" v-model="statusFilter">
            <option value="">{{ t('hub.filters.all') }}</option>
            <option value="draft">{{ t('statuses.draft') }}</option>
            <option value="in_review">{{ t('statuses.in_review') }}</option>
            <option value="published">{{ t('statuses.published') }}</option>
            <option value="rejected">{{ t('statuses.rejected') }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label for="type">{{ t('hub.filters.type') }}</label>
          <select id="type" v-model="typeFilter">
            <option value="">{{ t('hub.filters.all') }}</option>
            <option value="video">{{ t('types.video') }}</option>
            <option value="game">{{ t('types.game') }}</option>
            <option value="presentation">{{ t('types.presentation') }}</option>
            <option value="article">{{ t('types.article') }}</option>
          </select>
        </div>
      </div>

      <div v-if="currentUserProfile" class="materials-grid">
        <draggable
          class="draggable-container"
          :list="displayedMaterials"
          :disabled="isInlineEditing"
          :delay="250" :delay-on-touch-only="true"
          :group="{ name: 'materials', pull: 'clone', put: false }"
          item-key="id" :sort="false" :drag-class="'dragging-card'"
        >
          <template #item="{ element: material }">
            <template v-if="material.isAddNewCard">
              <AddNewMaterialCard 
                :selected-lesson-id="selectedLesson?.id"
                :all-program-lessons="lessons"
                :update-tools="hubUpdateTools"
              />
            </template>
            <template v-else>
              <HubMaterialCard
                :material="material"
                :current-user="currentUserProfile"
                :selected-lesson-id="selectedLesson?.id"
                :all-program-lessons="lessons"
                :update-tools="hubUpdateTools"
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
import { ref, onMounted, watch, computed, provide } from 'vue';
import draggable from 'vuedraggable';
import { useSupabaseUser, useSupabaseClient } from '#imports';
import { useModalStore } from '~/composables/useModalStore';
import { useI18n } from 'vue-i18n';
import AddNewMaterialCard from '~/components/hub/AddNewMaterialCard.vue';
import HubMaterialCard from '~/components/hub/MaterialCard.vue';
import EditablePosition from '~/components/hub/EditablePosition.vue';
import ModalWrapper from '~/components/ModalWrapper.vue';
// Logic Composables
import { useHubSidebarLogic } from '~/composables/useHubSidebarLogic';
import { useHubMaterialsLogic } from '~/composables/useHubMaterialsLogic';

// --- Page Meta & Middleware ---
definePageMeta({ middleware: 'auth' });

// --- Core Services ---
const user = useSupabaseUser();
const supabase = useSupabaseClient();
const modalStore = useModalStore();
const { t } = useI18n();

// --- Page-Level State ---
const currentUserProfile = ref(null);
const activeProgram = ref(null);
const isSidebarOpen = ref(false);
const isInlineEditing = ref(false); // Disables draggable when an input is focused

// --- Logic from Composables ---
const {
  lessons, subjects, lessonsBySubject, expandedSubjects, selectedLesson, newSubjectName,
  newLessonTopics, hoveredLesson, errorLessonId, fetchTreeData, toggleSubject,
  selectLesson, handleAddSubject, handleEditSubject, handleDeleteSubject,
  handleAddLesson, handleEditLesson, handleDeleteLesson, handleLessonPositionUpdate, onDrop,
  incrementMaterialCount, decrementMaterialCount
} = useHubSidebarLogic(activeProgram);

const {
  materials, isLoading, searchQuery, statusFilter, typeFilter,
  displayedMaterials, fetchMaterials, handlePositionUpdate
} = useHubMaterialsLogic(selectedLesson, activeProgram);

// Provide child components with a toolkit to refresh parent state
const hubUpdateTools = {
  increment: incrementMaterialCount,
  decrement: decrementMaterialCount,
  refreshMaterials: fetchMaterials,
  refreshTree: fetchTreeData
};

// --- Page-Specific Methods & Computed ---
const isProgramOwner = computed(() => {
  if (!user.value || !activeProgram.value) return false;
  return user.value.id === activeProgram.value.creator_id;
});

const fetchUserProfile = async () => {
  if (!user.value) return;
  const { data } = await supabase
    .from('user_profiles')
    .select('user_id, hub_role')
    .eq('user_id', user.value.id)
    .single();
  currentUserProfile.value = data;
};

const selectProgram = (program) => {
  if (activeProgram.value?.id === program?.id) return;
  
  selectedLesson.value = null; // Reset lesson selection before program change
  activeProgram.value = program; // Set new program, which will trigger the watcher

  if (program) {
    localStorage.setItem('activeProgramId', program.id);
  } else {
    localStorage.removeItem('activeProgramId');
  }
};

const openProgramsModal = () => {
  modalStore.open('hub/modals/ProgramsModal', {
    activeProgram: activeProgram.value,
    onSelect: selectProgram,
  });
};

const fetchAllHubData = async () => {
  isLoading.value = true;
  // Fetch tree first, then materials which might depend on the selected lesson
  await fetchTreeData();
  await fetchMaterials();
  isLoading.value = false;
};

// Provide a way for child components to disable dragging globally
provide('setInlineEditingState', (isEditing) => {
  isInlineEditing.value = isEditing;
});

// --- Watchers & Lifecycle Hooks ---
watch(
  [activeProgram, selectedLesson], 
  ([newProgram, newLesson], [oldProgram, oldLesson]) => {
    // Scenario 1: The program has changed. This requires a full data reload.
    if (newProgram?.id !== oldProgram?.id) {
      fetchAllHubData();
      return; // Exit to prevent the next condition from running unnecessarily
    }

    // Scenario 2: The program is the same, but the lesson has changed.
    // This only requires the materials grid to be reloaded.
    if (newLesson?.id !== oldLesson?.id) {
      fetchMaterials();
    }
  }, 
  { deep: true }
);

onMounted(async () => {
  await fetchUserProfile();
  const savedProgramId = localStorage.getItem('activeProgramId');
  let programLoaded = false;

  if (savedProgramId) {
    try {
      const { data: savedProgram } = await supabase
        .from('programs')
        .select('*')
        .eq('id', savedProgramId)
        .single();
      if (savedProgram) {
        // Setting activeProgram here triggers the watcher to fetch all data
        activeProgram.value = savedProgram; 
        programLoaded = true;
      }
    } catch (e) {
      console.error('Failed to restore active program, defaulting.', e);
      localStorage.removeItem('activeProgramId');
    }
  }

  // If no program was restored from storage (e.g., first visit),
  // fetch the default view (e.g., central material library).
  if (!programLoaded) {
    fetchAllHubData();
  }
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

/* --- Sidebar Content --- */
.tree-controls button {
  width: 100%;
  padding: 0.5rem;
  background-color: #374151;
  border: none;
  color: #f3f4f6;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 1rem;
  text-align: left;
}
.tree-controls button.active {
  background-color: #df6a8d;
  font-weight: bold;
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
  background-color: #1F2937;
  border: none;
  color: #c5bdbd;
  font-weight: bold;
  border-radius: 4px;
  width: 20px;
  height: 40px;
  cursor: pointer;
}
.lesson-add {
  margin-top: 0.5rem;
}

/* Subject & Lesson List */
.subject-group {
  margin-top: 1rem;
}
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
.subject-title {
  font-size: 1rem;
  font-weight: bold;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}
.lesson-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.lesson-list a {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0.1rem;
  text-decoration: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}
.lesson-list a:hover .lesson-title {
  color: #fff;
}
.lesson-list a.active {
  background-color: #4c4c53;
}
.lesson-list a.active .lesson-position {
  color: #cc68ae;
}
.lesson-list a.active .lesson-title {
  color: #fff;
}
.lesson-list a.active .material-count {
  background-color: #f3f4f6;
  color: #4f46e5;
}
.lesson-position {
  flex-shrink: 0;
  font-weight: bold;
  color: #e46ca8;
  width: 1.6rem;
  text-align: left;
  margin-left: -1rem;
}
.lesson-title {
  color: #d1d5db;
}

/* Sidebar Action Icons (New & Corrected) */
.sidebar-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0; /* Prevent icons from shrinking */
  margin-right: -1.3rem; 
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
.edit-btn {
  background: none; border: none; color: #9ca3af; margin-left: 0.2rem;
 cursor: pointer; border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
}
.edit-btn:hover {
  background-color: #1F2937;
  color: #fff;
}
.edit-btn svg {
  width: 16px;
  height: 16px;
}
.delete-btn {
  background: none; border: none; color: #9ca3af;
  font-size: 1.5rem; line-height: 1; padding: 0 0.2rem;
  cursor: pointer; border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
}
.delete-btn:hover {
  background-color: #ef4444;
  color: #fff;
}
.material-count {
  font-size: 0.7rem;
  padding: 1px 5px;
  background-color: #4b5563;
  color: #d1d5db;
  font-weight: bold;
  border-radius: 8px;
  min-width: 18px;
  text-align: center;
}

/* Sidebar States */
.lesson-list li.drop-target > a {
  background-color: #bebdc0; 
  outline: 2px dashed #fff;
  outline-offset: -2px;
}
.lesson-list li.drop-error > a {
  animation: flash-red 0.5s ease-in-out 3;
}
@keyframes flash-red {
  0%, 100% { box-shadow: none; }
  50% { box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.7); }
}
.lesson-list :deep(.editable-position) {
  flex-shrink: 0;
  width: 2.2rem;
  text-align: left;
  list-style-type: none;
  margin-left: -1rem;
}
.ghost-item {
  display: none;
}

/* --- Main Content Area --- */
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
.materials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  grid-auto-rows: min-content;
}
.draggable-container {
  display: contents; 
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

/* --- Responsive & Mobile Styles --- */
.sidebar-toggle {
  display: none;
}
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
}
@media (max-width: 768px) {
  .hub-layout {
    grid-template-columns: 1fr;
  }
  .filters-container {
    flex-direction: column;
  }
  .sidebar-toggle {
    position: fixed;
    top: 1rem;
    left: 1rem;
    z-index: 998;
    display: block;
    margin-bottom: 1rem;
  }
  .sidebar-toggle button {
    background-color: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(1px);
    border: 1px solid rgba(209, 213, 219, 0.5);
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-weight: 500;
    color: #111827;
  }
  .hub-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 280px;
    height: 100%;
    z-index: 1000;
    transform: translateX(-100%);
    transition: transform 0.3s ease-in-out;
    box-shadow: 5px 0px 15px rgba(0,0,0,0.2);
  }
  .hub-layout.sidebar-is-open .hub-sidebar {
    transform: translateX(0);
  }
}
</style>