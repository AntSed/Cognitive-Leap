<template>
  <div class="prereq-modal">
    <header class="modal-header">
      <h2>Manage Prerequisites</h2>
      <button class="modal-close-button" @click="modalStore.close()">&times;</button>
    </header>
    <main class="modal-body">
      <p>This tool allows you to set the completion order for lessons.</p>
      
      <div class="action-box">
        <h4>Reset to Basic Sequence</h4>
        <p>This will automatically set all prerequisites for the entire program. In each subject, Lesson 2 will depend on Lesson 1, Lesson 3 on Lesson 2, and so on.</p>
        <p><strong>Warning:</strong> This will overwrite any existing prerequisites for this program.</p>
        <button class="button-primary" @click="handleSetBasic" :disabled="isSaving">
          {{ isSaving ? 'Applying...' : 'Apply Basic Sequence' }}
        </button>
      </div>

      <hr class="form-divider" />

      <div class="placeholder">
        <h4>Manual Editor</h4>
        <p>Coming soon...</p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useSupabaseClient } from '#imports';
import { useModalStore } from '~/composables/useModalStore';

const props = defineProps({
  program: { type: Object, required: true },
  onUpdateSuccess: { type: Function, default: () => {} }
});

const supabase = useSupabaseClient();
const modalStore = useModalStore();
const isSaving = ref(false);

const handleSetBasic = async () => {
  isSaving.value = true;
  try {
    const { error } = await supabase.rpc('rebuild_basic_prerequisites', {
      p_program_id: props.program.id
    });
    if (error) throw error;
    
    alert('Basic prerequisite sequence has been applied successfully!');
    props.onUpdateSuccess();
    modalStore.close();

  } catch (error) {
    console.error('Failed to apply basic prerequisites:', error);
    alert('An error occurred. Please try again.');
  } finally {
    isSaving.value = false;
  }
};
</script>

<style scoped>
.prereq-modal { width: 90vw; max-width: 600px; background-color: #27272A; color: #E4E4E7; border-radius: 12px; border: 1px solid #3F3F46; box-shadow: 0 10px 30px rgba(0,0,0,.5); }
.modal-header { padding: 1rem 1.5rem; border-bottom: 1px solid #3F3F46; display: flex; justify-content: space-between; align-items: center; }
.modal-header h2 { margin: 0; font-size: 1.25rem; }
.modal-close-button { background: none; border: none; color: #A1A1AA; font-size: 2rem; line-height: 1; cursor: pointer; transition: all .2s; }
.modal-close-button:hover { color: #fff; transform: rotate(90deg); }
.modal-body { padding: 1.5rem; }
.modal-body p { color: #A1A1AA; line-height: 1.6; }
.action-box { background-color: #18181B; padding: 1.5rem; border-radius: 8px; border: 1px solid #3F3F46; }
.action-box h4 { margin-top: 0; }
.action-box p { font-size: 0.9rem; }
.button-primary { background-color: #4f46e5; color: #fff; border: none; padding: .6rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: background-color .2s; margin-top: 1rem;}
.button-primary:hover:not(:disabled) { background-color: #4338ca; }
.button-primary:disabled { background-color: #3730a3; cursor: not-allowed; }
.form-divider { border: none; border-top: 1px solid #3F3F46; margin: 2rem 0; }
.placeholder { text-align: center; color: #52525B; }
</style>