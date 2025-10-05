<template>
  <div class="hub-layout" :class="{ 'sidebar-is-open': isSidebarOpen }">
    <aside class="hub-sidebar">
      <div class="tree-controls">
        <button @click="selectLesson(null)" :class="{ active: !selectedLesson }">
          Show All Materials
        </button>
      </div>
      <div v-for="subject in subjects" :key="subject.id" class="subject-group">
  
        <div class="subject-header" @click="toggleSubject(subject.id)">
            <h3 class="subject-title">{{ subject.name_translations?.en || 'Unnamed Subject' }}</h3>
            
            <svg 
            class="subject-chevron" 
            :class="{ 'is-expanded': expandedSubjects.has(subject.id) }" 
            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
        </div>
        
        <ul v-if="expandedSubjects.has(subject.id)" class="lesson-list">
            <li v-for="lesson in lessonsBySubject[subject.id]" :key="lesson.id">
            <a @click="selectLesson(lesson)" :class="{ active: selectedLesson?.id === lesson.id }">
                <span class="lesson-position">{{ lesson.position }}.</span>
                <span class="lesson-title">{{ lesson.topic_translations?.en || 'Untitled Lesson' }}</span>
                <span class="material-count">{{ lesson.material_count }}</span>
            </a>
            </li>
        </ul>

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

      <div v-if="isLoading" class="state-indicator">
        <p>Loading materials...</p>
      </div>
      <div v-else-if="error" class="state-indicator error">
        <p>Failed to load materials: {{ error.message }}</p>
      </div>
      <div v-else-if="materials.length === 0" class="state-indicator">
        <p>No materials found for this selection.</p>
      </div>
      <div v-else class="materials-grid">
        <HubMaterialCard
          v-for="material in materials"
          :key="material.id"
          :material="material"
        />
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';

definePageMeta({
  middleware: 'auth'
});
const supabase = useSupabaseClient();

const materials = ref([]);
const isLoading = ref(true);
const error = ref(null);

// --- Filter State (typeFilter is back) ---
const searchQuery = ref('');
const statusFilter = ref('');
const typeFilter = ref('');

// --- Tree State ---
const subjects = ref([]);
const lessons = ref([]);
const selectedLesson = ref(null);
const expandedSubjects = ref(new Set());

const isSidebarOpen = ref(false);
// This function will add or remove a subject's ID from our Set
const toggleSubject = (subjectId) => {
  if (expandedSubjects.value.has(subjectId)) {
    expandedSubjects.value.delete(subjectId);
  } else {
    expandedSubjects.value.add(subjectId);
  }
};
// --- MODIFIED: Fetching tree data now uses RPC for lessons ---
const fetchTreeData = async () => {
  try {
    const [subjectsRes, lessonsRes] = await Promise.all([
      supabase.from('subjects').select('*').order('name_translations->>en'),
      supabase.rpc('get_lessons_with_material_count') // Using our new function
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

// --- MODIFIED: The fetch function is now fixed and smarter ---
const fetchMaterials = async () => {
  isLoading.value = true;
  error.value = null;
  try {
    let query;

    if (selectedLesson.value) {
      // --- A. A lesson IS selected ---
      query = supabase
        .from('lesson_materials')
        .select('learning_apps ( * )')
        .eq('lesson_id', selectedLesson.value.id);

      if (statusFilter.value) query = query.eq('learning_apps.status', statusFilter.value);
      if (typeFilter.value) query = query.eq('learning_apps.material_type', typeFilter.value);
      if (searchQuery.value) query = query.ilike('learning_apps.title_translations->>en', `%${searchQuery.value}%`);
      
      // FIX: Apply referencedTable only when needed
      query = query.order('created_at', { referencedTable: 'learning_apps', ascending: false });

    } else {
      // --- B. No lesson selected (Show All) ---
      query = supabase.from('learning_apps').select('*');
      
      if (statusFilter.value) query = query.eq('status', statusFilter.value);
      if (typeFilter.value) query = query.eq('material_type', typeFilter.value);
      if (searchQuery.value) query = query.ilike('title_translations->>en', `%${searchQuery.value}%`);

      // FIX: Do NOT use referencedTable when querying the base table
      query = query.order('created_at', { ascending: false });
    }

    const { data, error: fetchError } = await query;
    if (fetchError) throw fetchError;
    
    if (selectedLesson.value) {
      materials.value = data.map(item => item.learning_apps).filter(Boolean);
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

const selectLesson = (lesson) => {
  selectedLesson.value = lesson;
  isSidebarOpen.value = false; // NEW: Close sidebar after a lesson is selected on mobile
};

// Watch all filters now
watch([searchQuery, statusFilter, typeFilter, selectedLesson], fetchMaterials, { deep: true });

onMounted(() => {
  fetchTreeData();
  fetchMaterials();
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