<template>
  <div class="edit-lesson-modal">
    <header class="modal-header">
      <h2>Edit Lesson</h2>
      <button class="modal-close-button" @click="modalStore.close()">&times;</button>
    </header>

    <div v-if="isLoading" class="state-indicator">Loading lesson data...</div>
    <form v-else class="edit-form" @submit.prevent="handleSave">
      <div class="form-group">
        <label for="lessonTopic">Topic (EN)</label>
        <input id="lessonTopic" v-model="editableLesson.topic_translations.en" type="text" required />
      </div>
      <div class="form-group">
        <label for="lessonDescription">Description (EN)</label>
        <textarea id="lessonDescription" v-model="editableLesson.description_translations.en" rows="3"></textarea>
      </div>
      <div class="form-group">
        <label for="lessonSlug">Slug</label>
        <input id="lessonSlug" v-model="editableLesson.slug" type="text" required />
      </div>
       <div class="form-group">
        <label for="lessonDifficulty">Difficulty</label>
        <input id="lessonDifficulty" v-model.number="editableLesson.difficulty" type="number" min="1" max="10" />
      </div>
        <hr class="form-divider" />
        
        <div class="coordinates-group">
            <div class="form-group">
            <label>X</label>
            <input v-model.number="editableLayout.coordinates.x" type="number" step="0.001" />
            </div>
            <div class="form-group">
            <label>Y</label>
            <input v-model.number="editableLayout.coordinates.y" type="number" step="0.001" />
            </div>
            <div class="form-group">
            <label>Z</label>
            <input v-model.number="editableLayout.coordinates.z" type="number" step="0.001" />
            </div>
        </div>

        <div class="form-group">
            <label>Scale</label>
            <input v-model.number="editableLayout.scale" type="number" step="0.001" />
        </div>

        <div class="form-group">
            <label>Rotation</label>
            <input v-model.number="editableLayout.rotation" type="number" step="0.001" />
        </div>
      <div class="form-actions">
        <button type="button" class="button-secondary" @click="modalStore.close()">Cancel</button>
        <button type="submit" class="button-primary" :disabled="isSaving">
          {{ isSaving ? 'Saving...' : 'Save Changes' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useSupabaseClient } from '#imports';
import { useModalStore } from '~/composables/useModalStore';

const props = defineProps({
  lessonId: { type: String, required: true },
  skinId: { type: String, default: null },
  onUpdateSuccess: { type: Function, default: () => {} }
});

const supabase = useSupabaseClient();
const modalStore = useModalStore();
const isLoading = ref(true);
const isSaving = ref(false);

const editableLesson = ref({
  topic_translations: { en: '' },
  description_translations: { en: '' },
  slug: '',
  difficulty: 1,
});
const editableLayout = ref({ 
  coordinates: { x: 0, y: 0, z: 0 },
  scale: 1.0,
  rotation: 0.0
});
const layoutId = ref(null);
onMounted(async () => {
  if (!props.skinId) {
    alert("Cannot edit layout: No skin is associated with this program.");
    modalStore.close();
    return;
  }
  try {
    const { data, error } = await supabase
      .from('lessons')
      .select(`
        *,
        skin_layouts ( id, coordinates, scale, rotation )
      `)
      .eq('id', props.lessonId)
      .eq('skin_layouts.skin_id', props.skinId)
      .single();

    if (error) throw error;
    
    const { skin_layouts, ...lessonDataFromDB } = data;

    // --- ИСПРАВЛЕНИЕ ЗДЕСЬ ---
    // Убеждаемся, что переводы всегда являются объектами, а не null
    const safeLessonData = {
      ...lessonDataFromDB,
      topic_translations: lessonDataFromDB.topic_translations || { en: '' },
      description_translations: lessonDataFromDB.description_translations || { en: '' }
    };
    editableLesson.value = safeLessonData;
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

    if (skin_layouts && skin_layouts.length > 0) {
      // Проверяем, что coordinates не null
      const layoutData = skin_layouts[0];
      editableLayout.value = {
          ...layoutData,
          coordinates: layoutData.coordinates || { x: 0, y: 0, z: 0 }
      };
      layoutId.value = layoutData.id;
    }
    
  } catch (error) {
    console.error("Failed to load lesson data:", error);
    alert("Could not load lesson data.");
    modalStore.close();
  } finally {
    isLoading.value = false;
  }
});

const handleSave = async () => {
  isSaving.value = true;
  let lessonUpdateError, layoutUpdateError;

  const lessonPayload = {
    topic_translations: editableLesson.value.topic_translations,
    description_translations: editableLesson.value.description_translations,
    slug: editableLesson.value.slug,
    difficulty: editableLesson.value.difficulty,
  };

  const layoutPayload = {
    coordinates: editableLayout.value.coordinates,
    scale: editableLayout.value.scale,
    rotation: editableLayout.value.rotation,
  };

  try {
    const { error: luError } = await supabase.from('lessons').update(lessonPayload).eq('id', props.lessonId);
    lessonUpdateError = luError;

    if (layoutId.value) { 
      const { error: slError } = await supabase.from('skin_layouts').update(layoutPayload).eq('id', layoutId.value);
      layoutUpdateError = slError;
    }


    if (lessonUpdateError) throw lessonUpdateError;
    if (layoutUpdateError) throw layoutUpdateError;

    props.onUpdateSuccess();
    modalStore.close();

  } catch (error) {
    console.error('Error updating lesson:', error);
    alert('Failed to update lesson. One or more parts could not be saved.');
  } finally {
    isSaving.value = false;
  }
};
</script>

<style scoped>

.edit-lesson-modal {
  display: flex;
  flex-direction: column;
  max-height: 95vh; 
  width: 90vw; 
  max-width: 500px; 
  background-color: #27272A;
  color: #E4E4E7; 
  border-radius: 12px; 
  border: 1px solid #3F3F46;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}


.edit-form {
  padding: 1.5rem;
  overflow-y: auto; 
  flex-grow: 1; 
}

.modal-header, .form-actions {
  flex-shrink: 0;
}

.modal-header {
  padding: 1rem 1.5rem; border-bottom: 1px solid #3F3F46;
  display: flex; justify-content: space-between; align-items: center;
}
.modal-header h2 { margin: 0; font-size: 1.25rem; }
.modal-close-button {
  background: none; border: none; color: #A1A1AA;
  font-size: 2rem; line-height: 1; cursor: pointer;
  transition: color 0.2s, transform 0.2s;
}
.modal-close-button:hover { color: #fff; transform: rotate(90deg); }

.state-indicator { text-align: center; color: #A1A1AA; padding: 2rem 0; }
.edit-form { padding: 1.5rem; }
.form-group { display: flex; flex-direction: column; margin-bottom: 1.5rem; }
.form-group label { margin-bottom: 0.5rem; font-weight: 500; color: #A1A1AA; }
.form-group input, .form-group textarea {
  background-color: #3F3F46; border: 1px solid #52525B;
  color: #fff; padding: 0.6rem 1rem; border-radius: 8px; font-size: 1rem;
}

.form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem;}
.button-secondary, .button-primary {
  border: none; padding: 0.6rem 1.2rem; border-radius: 8px;
  cursor: pointer; font-weight: 600; font-size: 0.95rem;
  transition: all 0.2s;
}
.button-secondary { background-color: #3F3F46; color: #fff; }
.button-secondary:hover { background-color: #52525B; }
.button-primary { background-color: #4f46e5; color: #fff; }
.button-primary:hover:not(:disabled) { background-color: #4338ca; }
.button-primary:disabled { background-color: #3730a3; cursor: not-allowed; }
</style>