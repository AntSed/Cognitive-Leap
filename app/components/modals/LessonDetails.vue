<template>
  <div class="lesson-modal-content">
    <button class="modal-close-button" @click="close()">&times;</button>
    
    <div v-if="isLoading" class="loading-state">
        <p>{{ $t('loadingLesson') }}</p>
    </div>

    <div v-else-if="lessonData" class="lesson-container">
      <div class="modal-header">
        <h2 class="topic-title">{{ lessonData.topic }}</h2>
        <p class="topic-description" v-if="lessonData.description">{{ lessonData.description }}</p>
      </div>

      <div v-if="lessonData.quizzes && lessonData.quizzes.length > 0" class="tests-section" :class="{ 'is-expanded': isTestsSectionExpanded }">
        <div class="tests-header" @click="toggleTestsSection">
          <h3>{{ $t('proveYouKnow') }}</h3>
          <div class="header-right">
            <div class="progress-bar-container" title="Overall test progress">
              <div class="progress-bar-inner" :style="{ width: testProgress + '%' }">
                <span v-if="testProgress > 10">{{ Math.round(testProgress) }}%</span>
              </div>
            </div>
            <svg class="chevron-icon" :class="{ 'is-rotated': isTestsSectionExpanded }" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </div>
        <transition name="slide-fade">
          <div v-if="isTestsSectionExpanded" class="tests-body">
            <div class="test-card" v-for="test in lessonData.quizzes" :key="test.id">
              <div class="test-info">
                <p class="test-title">{{ test.title }}</p>
              </div>
              <button @click="handleToggleTestCompletion(test.id)" class="action-button test-button">
                  {{ $t('startTest') }}
              </button>
            </div>
          </div>
        </transition>
      </div>

      <div class="materials-grid">
        <div v-for="material in processedMaterials" :key="material.id" class="material-card" :class="{ 'is-locked': material.isLocked }">
          <span class="material-icon">{{ getIconForType(material.material_type) }}</span>
          <h3 class="material-title">{{ material.title }}</h3>
          <p class="material-description">{{ material.description }}</p>
          
          <button @click="handleMaterialClick(material)" class="action-button material-button" :disabled="material.isLocked">
            <!-- 
              FIX 1: Call getButtonText(material) from composable.
              We pass the whole material object, not just the type.
          -->
            <span>{{ getButtonText(material) }}</span>
            
            <!-- This logic can also be moved to the composable later if we want -->
            <svg v-if="!['app', 'game', 'presentation', 'video'].includes(material.material_type)" class="external-link-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-4.5 0V6M18 6h-6m6 0l-7.5 7.5" />
            </svg>
          </button>

          <div v-if="material.isLocked" class="lock-overlay">
            <svg class="lock-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 00-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useModalStore } from '~/composables/useModalStore';
import { useI18n } from 'vue-i18n';
// FIX 2: Import the composable
import { useMaterialPlayer } from '~/composables/useMaterialPlayer';

const props = defineProps({
  lessonId: { type: String, required: true }
});

const isLoading = ref(true);
const lessonData = ref(null);
const isTestsSectionExpanded = ref(false);

const supabase = useSupabaseClient();
const user = useSupabaseUser();
const { locale, t } = useI18n();
const modalStore = useModalStore();
// FIX 3: Instantiate the composable
const { getButtonText, playMaterial } = useMaterialPlayer();

const close = () => {
    if (modalStore.closeLesson) {
        modalStore.closeLesson();
    } else {
        modalStore.close();
    }
};

const fetchData = async (id) => {
  if (!id) return;
  isLoading.value = true;
  lessonData.value = null;
  try {
    const rpcArgs = {
        p_lesson_id: id,
        p_user_id: user.value?.id ?? null,
        p_lang_code: locale.value
    };
    const { data, error } = await supabase.rpc('get_lesson_details', rpcArgs);
    if (error) throw error;
    lessonData.value = data;
  } catch (error) {
    console.error("Error loading lesson data inside component:", error);
    close();
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchData(props.lessonId);
});

watch(() => lessonData.value, (newData) => {
  if (newData) {
    isTestsSectionExpanded.value = false;
  }
});

const testProgress = computed(() => {
  const quizzes = lessonData.value?.quizzes;
  if (!quizzes || quizzes.length === 0) return 0;
  const completedCount = quizzes.filter(q => q.completed).length;
  return (completedCount / quizzes.length) * 100;
});

const processedMaterials = computed(() => {
    if (!lessonData.value?.materials) return [];
    
    const materials = lessonData.value.materials;
    const completedMaterialIds = new Set(
        materials.filter(m => m.completed).map(m => m.id)
    );

    return materials.map(material => ({
        ...material,
        isLocked: material.prerequisite_ids ? !material.prerequisite_ids.every(id => completedMaterialIds.has(id)) : false
    }));
});

const getIconForType = (materialType) => {
    return {
        'presentation': '🖥️',
        'video': '🎬',
        'game': '🎮',
        'app': '🎮'
    }[materialType] || '📚';
};

// FIX 4: Delete the old, redundant getButtonTextForType function
/*
const getButtonTextForType = (materialType) => {
...
};
*/

const toggleTestsSection = () => { isTestsSectionExpanded.value = !isTestsSectionExpanded.value; };

const handleToggleTestCompletion = (testId) => {
  console.log(`DEMO: Toggling completion for test ${testId}`);
};

// FIX 5: Rewrite handleMaterialClick to use the composable
const handleMaterialClick = (material) => {
  if (material.isLocked) return;
  
  // All the logic is now centralized in playMaterial
  playMaterial(material);
};
</script>

<style scoped>
.lesson-modal-content {
  background: #18181B; /* Darker background */
  color: #E4E4E7; /* Light gray text */
  padding: 2rem;
  border-radius: 16px;
  width: 90%;
  max-width: 850px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  border: 1px solid #3F3F46;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
  font-family: 'Inter', sans-serif;
}
.lesson-modal-content::-webkit-scrollbar { width: 8px; }
.lesson-modal-content::-webkit-scrollbar-track { background: #18181B; }
.lesson-modal-content::-webkit-scrollbar-thumb { background-color: #581C87; border-radius: 10px; }

.modal-close-button {
  position: absolute;
  top: 15px;
  right: 15px;
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  font-size: 1.5rem;
  line-height: 32px;
  text-align: center;
  color: #A1A1AA;
  cursor: pointer;
  transition: all 0.2s;
}
.modal-close-button:hover { color: #fff; background: #9333EA; transform: rotate(90deg); }

.modal-header {
  text-align: center;
  margin-bottom: 2.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #27272A;
}
.topic-title {
  font-size: 2.75rem;
  font-weight: 800;
  color: #fff;
  margin: 0;
  background: -webkit-linear-gradient(45deg, #A855F7, #D946EF);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.topic-description { font-size: 1.1rem; color: #A1A1AA; max-width: 600px; margin: 0.75rem auto 0; line-height: 1.6; }

.tests-section {
  background: #27272A;
  border-radius: 12px;
  margin-bottom: 2.5rem;
  border: 1px solid #3F3F46;
  overflow: hidden;
  transition: all 0.3s ease;
}
.tests-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 1rem 1.5rem;
}
.tests-header h3 { font-size: 1.2rem; font-weight: 600; color: #E4E4E7; margin: 0; }
.header-right { display: flex; align-items: center; gap: 1rem; }
.progress-bar-container {
  width: 120px;
  background: #3F3F46;
  border-radius: 10px;
  height: 18px;
  overflow: hidden;
}
.progress-bar-inner {
  background: linear-gradient(90deg, #7E22CE, #A855F7);
  height: 100%;
  transition: width 0.5s ease;
  text-align: center;
  color: white;
  font-weight: 600;
  font-size: 0.75rem;
  line-height: 18px;
}
.chevron-icon { width: 24px; height: 24px; color: #71717A; transition: transform 0.3s ease; }
.chevron-icon.is-rotated { transform: rotate(180deg); }

.tests-body { 
  padding: 0 1.5rem 1.5rem 1.5rem;
}
.test-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #18181B;
  padding: 1rem;
  border-radius: 8px;
  margin-top: 0.75rem;
}
.test-info p { margin: 0; color: #A1A1AA; }
.test-info p.test-title { font-weight: 500; color: #E4E4E7; }

.materials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.5rem;
}
.material-card {
  background: #27272A;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  text-align: center;
  transition: all 0.2s;
  border: 1px solid #3F3F46;
  position: relative;
  overflow: hidden;
}
.material-card:hover:not(.is-locked) {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.5);
  border-color: #A855F7;
}
.material-card.is-locked {
  filter: saturate(0.5);
  cursor: not-allowed;
}
.material-icon { 
  font-size: 3rem;
  margin-bottom: 1rem;
  line-height: 1;
}
.material-title { margin: 0.5rem 0 0; font-size: 1.25rem; font-weight: 600; color: #fff; }
.material-description { font-size: 0.9rem; color: #A1A1AA; flex-grow: 1; margin-bottom: 1.5rem; }

.action-button {
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  outline: none;
}
.action-button:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
}
.action-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.material-button {
  background: #7E22CE;
  color: white;
  margin-top: auto;
}
.material-button:hover:not(:disabled) {
  background: #9333EA;
}
.test-button {
  background: #16A34A;
  color: white;
  padding: 0.6rem 1.2rem;
}
.test-button:hover:not(:disabled) {
  background: #22C55E;
}
.external-link-icon { width: 16px; height: 16px; }

.loading-state {
    display: flex; justify-content: center; align-items: center;
    height: 200px; font-size: 1.2rem; color: #A1A1AA;
}
.lock-overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background-color: rgba(24, 24, 27, 0.8);
    backdrop-filter: blur(4px);
    border-radius: 12px;
    display: flex;
    justify-content: center;
    align-items: center;
    pointer-events: all;
}
.lock-icon {
    width: 50px;
    height: 50px;
    color: rgba(228, 228, 231, 0.6);
}

.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}
.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}

/* Hide scrollbar on smaller screens */
@media (max-width: 768px) {
  .lesson-modal-content {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
  .lesson-modal-content::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }
}
</style>
