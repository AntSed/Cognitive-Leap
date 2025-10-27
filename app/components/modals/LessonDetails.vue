// app/components/modals/LessonDetails.vue
<template>
  <div
    @click.self="closeModal"
    class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center p-0 md:p-4 lg:p-8"
  >
    <div
      class="relative w-full h-full md:w-[98vw] md:h-[98vh] max-w-7xl bg-gray-50 text-gray-900 md:rounded-3xl shadow-2xl flex flex-col overflow-hidden transform transition-all duration-300"
    >
      <button
        @click="closeModal"
        class="absolute top-5 right-5 z-50 w-10 h-10 rounded-full bg-black/10 text-gray-600 hover:bg-black/20 hover:text-gray-900 transition-all flex items-center justify-center glow-focus"
        v-html="svgIcons.close"
      ></button>

      <div
        v-if="isLoading"
        class="loading-state flex items-center justify-center h-full w-full"
      >
        <p class="text-lg text-gray-600">{{ $t('loadingLesson') }}</p>
      </div>

      <div v-else-if="lessonData" class="flex flex-col h-full">
        <div ref="scrollContainer" class="flex-1 overflow-y-auto no-scrollbar">
          <div
            class="relative h-auto min-h-[18rem] md:min-h-0 md:h-80 lg:h-96 bg-gradient-to-br from-blue-900 to-gray-800 flex items-end p-8 md:p-12 overflow-hidden"
          >
            <div
              class="absolute inset-0 opacity-15 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"
            ></div>
            <div class="z-10">
              <h1
                class="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight drop-shadow-lg"
              >
                {{ lessonData.topic }}
              </h1>
              <p
                v-if="lessonData.description"
                class="text-lg text-gray-200 mt-3 max-w-4xl opacity-90 text-shadow-sm"
              >
                {{ lessonData.description }}
              </p>
            </div>
            <div
              class="absolute inset-0 bg-gradient-to-t from-gray-50/80 to-transparent"
            ></div>
          </div>

          <div
            class="sticky top-0 z-10 bg-white bg-gradient-to-r from-blue-50/80 to-red-50/80 backdrop-blur-lg shadow-md py-4 px-8 md:px-12 border-b border-gray-200"
          >
            <div class="flex justify-center space-x-6">
              <button
                @click="setSection('materials')"
                class="relative py-2 min-w-[150px] text-center text-xl font-semibold transition-colors duration-300 transform active:scale-95 focus:outline-none focus:scale-[1.02]"
                :class="
                  activeSection === 'materials'
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-900'
                "
              >
                {{ $t('studyMaterials') }}

                <div
                  class="absolute bottom-0 left-0 w-full h-1.5 rounded-full bg-gray-200"
                ></div>

                <div
                  class="absolute bottom-0 left-0 h-1.5 rounded-full transition-all duration-500 ease-out"
                  :class="
                    activeSection === 'materials'
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                      : 'bg-gray-400'
                  "
                  :style="{ width: materialProgressPercent + '%' }"
                ></div>
              </button>

              <button
                @click="setSection('exams')"
                class="relative py-2 min-w-[150px] text-center text-xl font-semibold transition-colors duration-300 transform active:scale-95 focus:outline-none focus:scale-[1.02]"
                :class="
                  activeSection === 'exams'
                    ? 'text-red-600'
                    : 'text-gray-500 hover:text-gray-900'
                "
              >
                {{ $t('proveYouKnow') }}

                <div
                  class="absolute bottom-0 left-0 w-full h-1.5 rounded-full bg-gray-200"
                ></div>

                <div
                  class="absolute bottom-0 left-0 h-1.5 rounded-full transition-all duration-500 ease-out"
                  :class="
                    activeSection === 'exams'
                      ? 'bg-gradient-to-r from-red-500 to-rose-500'
                      : 'bg-gray-400'
                  "
                  :style="{ width: testProgress + '%' }"
                ></div>
              </button>
            </div>
          </div>

          <div class="px-8 md:px-12 pb-8 pt-8">
            <transition name="section-transition" mode="out-in">
              <section
                v-if="activeSection === 'materials'"
                key="materials-content"
                class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                <LessonMaterialCard
                  v-for="material in processedStudyMaterials"
                  :key="material.id"
                  :material="material"
                  :isLocked="material.isLocked"
                  :is-exam="false"
                />
              </section>

              <section
                v-else-if="activeSection === 'exams'"
                key="exams-content"
                class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                <LessonMaterialCard
                  v-for="material in processedExamMaterials"
                  :key="material.id"
                  :material="material"
                  :isLocked="material.isLocked"
                  :is-exam="true"
                />
              </section>
            </transition>
          </div>
        </div>
        </div>
      </div>
    </div>
  </template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { useModalStore } from '~/composables/useModalStore';
import { useI18n } from 'vue-i18n';
import LessonMaterialCard from '~/components/LessonMaterialCard.vue';

// --- PROPS ---
const props = defineProps({
  lessonId: { type: String, required: true },
});

// --- STATE (CORE) ---
const isLoading = ref(true);
const lessonData = ref(null);
const realtimeChannel = ref(null);

// --- STATE (UI) ---
const activeSection = ref('materials'); // 'materials' or 'exams'
const scrollContainer = ref(null);
const svgIcons = {
  close: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`,
};

// --- COMPOSABLES ---
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const { locale, t } = useI18n();
const modalStore = useModalStore();

// --- HANDLERS (UI) ---
const setSection = (sectionName) => {
  activeSection.value = sectionName;
};

const closeModal = () => {
  if (modalStore.closeLesson) {
    modalStore.closeLesson();
  } else {
    modalStore.close();
  }
};

// --- DATA FETCHING ---
const fetchData = async (id) => {
  if (!id || !user.value?.id) return;
  isLoading.value = true;
  // Keep old data while loading to prevent full-screen flash
  // lessonData.value = null; 
  try {
    const rpcArgs = {
      p_lesson_id: id,
      p_user_id: user.value.id,
      p_lang_code: locale.value,
    };
    const { data, error } = await supabase.rpc('get_lesson_details', rpcArgs);
    if (error) throw error;
    lessonData.value = data;
  } catch (error) {
    console.error('Error loading lesson data inside component:', error);
    closeModal(); // Close if data fails to load
  } finally {
    isLoading.value = false;
  }
};

// --- LIFECYCLE & REALTIME ---
watch(
  user,
  (currentUser) => {
    // Wait until user.value is available
    if (currentUser) {
      // 1. Fetch initial data
      fetchData(props.lessonId);

      // 2. Subscribe to realtime channel
      const channelName = `user-progress:${currentUser.id}`;
      realtimeChannel.value = supabase.channel(channelName);

      realtimeChannel.value
        .on(
          'broadcast',
          { event: 'progress_updated' },
          (payload) => {
            console.log('Broadcast received, progress updated!', payload);
            fetchData(props.lessonId);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(
              `[LessonDetails] Subscribed to broadcast channel: ${channelName}`
            );
          }
        });
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  // Unsubscribe from channel
  if (realtimeChannel.value) {
    supabase.removeChannel(realtimeChannel.value);
  }
});

// --- COMPUTED (DATA PROCESSING) ---

/**
 * Single source of truth: Set of ALL completed material IDs
 */
const allCompletedMaterialIds = computed(() => {
  if (!lessonData.value) return new Set();

  const completedStudy =
    lessonData.value.study_materials
      ?.filter((m) => m.completed)
      .map((m) => m.id) || [];

  const completedExams =
    lessonData.value.exam_materials
      ?.filter((m) => m.completed)
      .map((m) => m.id) || [];

  return new Set([...completedStudy, ...completedExams]);
});

/**
 * Helper function to process materials and determine lock state.
 */
const processMaterials = (materials) => {
  if (!materials) return [];

  const completedIds = allCompletedMaterialIds.value; // Use single source of truth

  return materials.map((material) => ({
    ...material,
    isLocked: material.prerequisite_ids
      ? !material.prerequisite_ids.every((id) => completedIds.has(id))
      : false,
  }));
};

/**
 * Prepares the list of STUDY materials (with isLocked logic).
 */
const processedStudyMaterials = computed(() => {
  return processMaterials(lessonData.value?.study_materials);
});

/**
 * Prepares the list of EXAM materials (with isLocked logic).
 */
const processedExamMaterials = computed(() => {
  return processMaterials(lessonData.value?.exam_materials);
});

// --- COMPUTED (UI) ---

/**
 * Calculates progress for the EXAM materials tab.
 */
const testProgress = computed(() => {
  const exams = lessonData.value?.exam_materials;
  if (!exams || exams.length === 0) return 0;
  const completedCount = exams.filter((e) => e.completed).length;
  return (completedCount / (exams.length || 1)) * 100; // Protect against division by 0
});

/**
 * Calculates progress for the STUDY materials tab.
 */
const materialProgressPercent = computed(() => {
  const materials = lessonData.value?.study_materials;
  if (!materials || materials.length === 0) return 0;
  const completedCount = materials.filter((m) => m.completed).length;
  return (completedCount / (materials.length || 1)) * 100;
});
</script>

<style scoped>
/* Hide scrollbar */
.no-scrollbar::-webkit-scrollbar {
  display: none; /* For Chrome, Safari, Opera */
}
.no-scrollbar {
  -ms-overflow-style: none; /* For IE and Edge */
  scrollbar-width: none; /* For Firefox */
}

/* Custom transition for section switching */
.section-transition-enter-active,
.section-transition-leave-active {
  transition: opacity 0.3s ease;
}
.section-transition-enter-from,
.section-transition-leave-to {
  opacity: 0;
}

/* A subtle glow on focus for buttons/interactive elements */
.glow-focus:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.4); /* Tailwind's blue-500 with alpha */
}
</style>
