<template>
  <div class="edit-subject-modal">
    <header class="modal-header">
      <h2>Edit Subject</h2>
      <button class="modal-close-button" @click="modalStore.close()">&times;</button>
    </header>

    <div v-if="isLoading" class="state-indicator">Loading subject data...</div>
    <form v-else class="edit-form" @submit.prevent="handleSave">
      <div class="form-group">
        <label for="subjectName">Subject Name (EN)</label>
        <input id="subjectName" v-model="editableSubject.name_translations.en" type="text" required />
      </div>
      <div class="form-group">
        <label for="subjectPrefix">Prefix (e.g., MATH)</label>
        <input id="subjectPrefix" v-model="editableSubject.prefix" type="text" required maxlength="4" />
      </div>
      
      <hr class="form-divider" />
      <h3>Visual Style</h3>

      <div class="form-group">
        <label for="subjectShape">Node Shape</label>
        <select id="subjectShape" v-model="editableStyle.shape">
            <option v-for="shapeName in availableShapes" :key="shapeName" :value="shapeName">
                {{ shapeName }}
            </option>
        </select>
      </div>

      <div class="form-group">
        <label for="subjectColor">Base Color</label>
        <div class="color-picker-wrapper">
          <input id="subjectColor" v-model="editableStyle.base_color" type="color" />
          <span>{{ editableStyle.base_color }}</span>
        </div>
      </div>
        <div class="form-group">
        <label for="scaleMultiplier">Scale Multiplier</label>
        <input 
            id="scaleMultiplier" 
            v-model.number="editableStyle.scale_multiplier" 
            type="number" 
            step="0.01" 
            min="0.01" 
        />
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
  subjectId: { type: String, required: true },
  skinId: { type: String, required: true },
  onUpdateSuccess: { type: Function, default: () => {} }
});

const supabase = useSupabaseClient();
const modalStore = useModalStore();
const isLoading = ref(true);
const isSaving = ref(false);

const availableShapes = ['Box', 'Sphere', 'Circle', 'Icon_Mathematics', 'Icon_Geography', 'Icon_History', 'Icon_Chemistry', 'Icon_Astronomy', 'Icon_Physics', 'Icon_Biology', 'Icon_Logic', 'Icon_Psychology', 'Icon_CompSci', 'Icon_Civics', 'Icon_Economics'];

const editableSubject = ref({ name_translations: { en: '' }, prefix: '' });
// 1. Добавляем scale_multiplier в начальное состояние
const editableStyle = ref({ shape: 'Circle', base_color: '#ffffff', scale_multiplier: 1.0 });

onMounted(async () => {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select(`
        name_translations,
        prefix,
        skin_subject_styles ( id, shape, base_color, scale_multiplier )
      `) // 2. Запрашиваем scale_multiplier
      .eq('id', props.subjectId)
      .eq('skin_subject_styles.skin_id', props.skinId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (data) {
        const { skin_subject_styles, ...subjectData } = data;
        editableSubject.value = subjectData;
        if (skin_subject_styles && skin_subject_styles.length > 0) {
            editableStyle.value = skin_subject_styles[0];
        }
    }
  } catch (error) {
    console.error("Failed to load subject data:", error);
  } finally {
    isLoading.value = false;
  }
});

const handleSave = async () => {
  isSaving.value = true;
  try {
    const { error: subjectError } = await supabase
      .from('subjects')
      .update(editableSubject.value)
      .eq('id', props.subjectId);
    if (subjectError) throw subjectError;

    const { error: styleError } = await supabase
      .from('skin_subject_styles')
      .upsert({
        id: editableStyle.value.id,
        subject_id: props.subjectId,
        skin_id: props.skinId,
        shape: editableStyle.value.shape,
        base_color: editableStyle.value.base_color,
        scale_multiplier: editableStyle.value.scale_multiplier // 3. Сохраняем scale_multiplier
      }, { onConflict: 'subject_id, skin_id' });
      
    if (styleError) throw styleError;

    props.onUpdateSuccess();
    modalStore.close();
  } catch (error) {
    console.error('Error updating subject:', error);
    alert('Failed to update subject.');
  } finally {
    isSaving.value = false;
  }
};
</script>
<style scoped>
.edit-subject-modal {   display: flex;  flex-direction: column;  max-height: 85vh; width: 90vw; max-width: 500px; background-color: #27272A; color: #E4E4E7; border-radius: 12px; border: 1px solid #3F3F46; box-shadow: 0 10px 30px rgba(0,0,0,.5); }
.edit-form { padding: 1.5rem;  overflow-y: auto;  flex-grow: 1; }
.modal-header, .form-actions {  flex-shrink: 0; }
.modal-header { padding: 1rem 1.5rem; border-bottom: 1px solid #3F3F46; display: flex; justify-content: space-between; align-items: center; }
.modal-header h2 { margin: 0; font-size: 1.25rem; }
.modal-close-button { background: none; border: none; color: #A1A1AA; font-size: 2rem; line-height: 1; cursor: pointer; transition: color .2s, transform .2s; }
.modal-close-button:hover { color: #fff; transform: rotate(90deg); }
.state-indicator { text-align: center; color: #A1A1AA; padding: 2rem 0; }
.edit-form { padding: 1.5rem; }
.form-group { display: flex; flex-direction: column; margin-bottom: 1.5rem; }
.form-group label { margin-bottom: 0.5rem; font-weight: 500; color: #A1A1AA; }
.form-group input, .form-group select { background-color: #3F3F46; border: 1px solid #52525B; color: #fff; padding: .6rem 1rem; border-radius: 8px; font-size: 1rem; }
.form-divider { border: none; border-top: 1px solid #3F3F46; margin: 2rem 0; }
.color-picker-wrapper { display: flex; align-items: center; gap: 1rem; }
.color-picker-wrapper input[type="color"] { width: 50px; height: 30px; border: none; padding: 0; border-radius: 4px; }
.form-actions { display: flex; justify-content: flex-end; gap: .75rem; margin-top: 1rem; }
.button-secondary, .button-primary { border: none; padding: .6rem 1.2rem; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: .95rem; transition: all .2s; }
.button-secondary { background-color: #3F3F46; color: #fff; }
.button-secondary:hover { background-color: #52525B; }
.button-primary { background-color: #4f46e5; color: #fff; }
.button-primary:hover:not(:disabled) { background-color: #4338ca; }
.button-primary:disabled { background-color: #3730a3; cursor: not-allowed; }
</style>