<template>
  <div class="edit-program-modal">
    <header class="modal-header">
      <h2>Edit Program</h2>
      <button class="modal-close-button" @click="modalStore.close()">&times;</button>
    </header>
    <form class="edit-form" @submit.prevent="handleSave">
      <div class="form-group">
        <label for="programTitle">Title</label>
        <input id="programTitle" v-model="editableProgram.title" type="text" required />
      </div>
      <div class="form-group">
        <label for="programDescription">Description</label>
        <textarea id="programDescription" v-model="editableProgram.description" rows="3"></textarea>
      </div>
        <div class="form-group">
            <label for="programSkin">Skin for Program</label>
            <select id="programSkin" v-model="editableProgram.skin_id">
            <option :value="null">-- Select a skin --</option>
            <option v-for="skin in skins" :key="skin.id" :value="skin.id">
                {{ skin.name_translations?.en || skin.id }}
            </option>
            </select>
        </div>
      <div class="form-group-checkbox">
        <input id="isPublic" v-model="editableProgram.is_public" type="checkbox" />
        <label for="isPublic">Make this program public</label>
        <p class="checkbox-help">Anyone with the link will be able to view a public program.</p>
      </div>
        <div class="form-group">
            <label>Lesson Prerequisites</label>
            <p class="checkbox-help" style="width: 100%; margin: 0 0 0.5rem 0;">Set up the sequence in which lessons must be completed.</p>
            <button type="button" class="button-secondary" @click="openPrerequisitesModal">
            Manage Prerequisites
            </button>
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
import { ref, onMounted  } from 'vue';
import { useSupabaseClient } from '#imports';
import { useModalStore } from '~/composables/useModalStore';

const props = defineProps({
  program: { type: Object, required: true },
  onUpdateSuccess: { type: Function, default: () => {} }
});

const supabase = useSupabaseClient();
const modalStore = useModalStore();
const isSaving = ref(false);

const skins = ref([]);
const editableProgram = ref({ ...props.program });
const openPrerequisitesModal = () => {
  modalStore.open('hub/modals/PrerequisitesModal', {
    program: props.program,
    onUpdateSuccess: props.onUpdateSuccess // Передаем коллбэк дальше
  });
};
onMounted(async () => {
  try {
    const { data, error } = await supabase.from('skins').select('id, name_translations');
    if (error) throw error;
    skins.value = data;
  } catch (error) {
    console.error('Error fetching skins:', error);
  }
});
const handleSave = async () => {
  isSaving.value = true;
  try {
    const { error } = await supabase
      .from('programs')
      .update({
        title: editableProgram.value.title,
        description: editableProgram.value.description,
        is_public: editableProgram.value.is_public,
        skin_id: editableProgram.value.skin_id 
      })
      .eq('id', props.program.id);

    if (error) throw error;

    props.onUpdateSuccess();
    modalStore.close();
  } catch (error) {
    console.error('Error updating program:', error);
    alert('Failed to update program.');
  } finally {
    isSaving.value = false;
  }
};
</script>

<style scoped>
/* Using a similar style to ProgramsModal for consistency */
.edit-program-modal {
  width: 90vw; max-width: 500px; background-color: #27272A;
  color: #E4E4E7; border-radius: 12px; border: 1px solid #3F3F46;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
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

.edit-form { padding: 1.5rem; }
.form-group { display: flex; flex-direction: column; margin-bottom: 1.5rem; }
.form-group label { margin-bottom: 0.5rem; font-weight: 500; color: #A1A1AA; }
.form-group input, .form-group textarea {
  background-color: #3F3F46; border: 1px solid #52525B;
  color: #fff; padding: 0.6rem 1rem; border-radius: 8px; font-size: 1rem;
}
.form-group select {
  background-color: #3F3F46; border: 1px solid #52525B;
  color: #fff; padding: 0.6rem 1rem; border-radius: 8px; font-size: 1rem;
}
.form-group-checkbox { display: flex; align-items: center; flex-wrap: wrap; margin-bottom: 2rem; }
.form-group-checkbox input { width: 1.2rem; height: 1.2rem; margin-right: 0.75rem; }
.form-group-checkbox label { font-weight: 500; }
.checkbox-help { font-size: 0.8rem; color: #A1A1AA; width: 100%; margin: 0.5rem 0 0 2rem; }

.form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; }
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