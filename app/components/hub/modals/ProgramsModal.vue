<template>
  <div class="programs-modal">
    <header class="modal-header">
      <h2>{{ t('hub.modals.programs.title') }}</h2>
      <button class="modal-close-button" @click="modalStore.close()">&times;</button>
    </header>

    <main class="modal-body">
      <div v-if="isLoading" class="state-indicator">{{ t('common.loading') }}...</div>

      <div v-else>
        <ul class="programs-list">
          <li
            class="program-item"
            :class="{ active: !activeProgram }"
            @click="handleSelectProgram(null)"
          >
            <span class="program-title">{{ t('hub.defaultProgram') }}</span>
          </li>

          <li
            v-for="program in programs"
            :key="program.id"
            class="program-item"
            :class="{ active: activeProgram?.id === program.id }"
            @click="handleSelectProgram(program)"
          >
            <span class="program-title">{{ program.title }}</span>
            <div class="program-actions">
              <button
                class="action-button share-button"
                @click.stop="handleShareProgram($event, program)"
              >
                {{ t('common.share') }}
              </button>
              <button
                class="action-button edit-button"
                @click.stop="handleEditProgram(program)"
              >
                {{ t('common.edit') }}
              </button>
              <button
                class="action-button delete-button"
                @click.stop="handleDeleteProgram(program)"
              >
                {{ t('common.delete') }}
              </button>
            </div>
          </li>
        </ul>

        <div v-if="programs.length === 0" class="state-indicator" style="padding-top: 1rem; font-size: 0.9rem;">
          <p>{{ t('hub.modals.programs.noPrograms') }}</p>
        </div>
      </div>
    </main>

    <footer class="modal-footer">
      <form class="create-form" @submit.prevent="handleCreateProgram">
        <input
          v-model="newProgramTitle"
          type="text"
          :placeholder="t('hub.modals.programs.createPlaceholder')"
          required
        />
        <button type="submit" :disabled="isCreating">
          {{ isCreating ? t('common.creating') : t('hub.modals.programs.createButton') }}
        </button>
      </form>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useSupabaseClient, useSupabaseUser, useI18n } from '#imports';
import { useModalStore } from '~/composables/useModalStore';

// FIX: The 'onClose' prop is no longer needed, as the component closes itself.
const props = defineProps({
  activeProgram: { type: Object, default: null },
  onSelect: { type: Function, required: true },
});

const supabase = useSupabaseClient();
const user = useSupabaseUser();
const modalStore = useModalStore();
const { t } = useI18n(); // i18n hook

const programs = ref([]);
const isLoading = ref(true);
const newProgramTitle = ref('');
const isCreating = ref(false);

const fetchUserPrograms = async () => {
  isLoading.value = true;
  try {
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('creator_id', user.value.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    programs.value = data;
  } catch (error) {
    console.error('Error fetching programs:', error);
  } finally {
    isLoading.value = false;
  }
};

const handleCreateProgram = async () => {
  if (!newProgramTitle.value.trim() || isCreating.value) return;
  isCreating.value = true;
  try {
    const { data, error } = await supabase
      .from('programs')
      .insert({ title: newProgramTitle.value })
      .select()
      .single();
    if (error) throw error;
    programs.value.unshift(data);
    newProgramTitle.value = '';
    handleSelectProgram(data);
  } catch (error) {
    console.error('Error creating program:', error);
    alert(t('hub.errors.createProgramFailed'));
  } finally {
    isCreating.value = false;
  }
};

const handleDeleteProgram = (programToDelete) => {
  modalStore.open('hub/modals/ConfirmDeleteModal', {
    titleKey: 'hub.modals.deleteProgram.title',
    messageKey: 'hub.modals.deleteProgram.message',
    messageParams: { programName: programToDelete.title },
    onConfirm: async () => {
      try {
        const { error } = await supabase.from('programs').delete().eq('id', programToDelete.id);
        if (error) throw error;
        // If the deleted program was active, switch to the default program.
        if (props.activeProgram?.id === programToDelete.id) {
          handleSelectProgram(null);
        }
        await fetchUserPrograms();
      } catch (error) {
        console.error('Error deleting program:', error);
        alert(t('hub.errors.deleteProgramFailed'));
      }
    }
  });
};

const handleSelectProgram = (program) => {
  props.onSelect(program);
  // FIX: The component now closes itself directly using the modal store.
  modalStore.close();
};

const handleShareProgram = async (event, program) => {
  const shareUrl = `${window.location.origin}/program/${program.id}`;
  try {
    await navigator.clipboard.writeText(shareUrl);
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = t('common.copied');
    button.disabled = true;
    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy text: ', err);
    alert('Could not copy link to clipboard.');
  }
};
const handleEditProgram = (programToEdit) => {
  modalStore.open('hub/modals/EditProgramModal', {
    program: programToEdit,
    onUpdateSuccess: fetchUserPrograms
  });
};
onMounted(() => {
  fetchUserPrograms();
});
</script>

<style scoped>
.programs-modal {
  width: 90vw;
  max-width: 600px;
  background-color: #27272A;
  color: #E4E4E7;
  border-radius: 12px;
  border: 1px solid #3F3F46;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  max-height: 80vh;
}
.modal-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #3F3F46;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}
.modal-header h2 { margin: 0; font-size: 1.25rem; }
.modal-close-button {
  background: none; border: none; color: #A1A1AA;
  font-size: 2rem; line-height: 1; cursor: pointer;
  transition: color 0.2s, transform 0.2s;
}
.modal-close-button:hover { color: #fff; transform: rotate(90deg); }
.modal-body { padding: 1.5rem; overflow-y: auto; flex-grow: 1; }
.state-indicator { text-align: center; color: #A1A1AA; padding: 2rem 0; }
.programs-list { list-style: none; padding: 0; margin: 0; }
.program-item {
  display: flex; align-items: center; padding: 1rem;
  border-radius: 8px; cursor: pointer;
  transition: background-color 0.2s; border: 2px solid transparent;
}
.program-item:hover { background-color: #3F3F46; }
.program-item.active {
  background-color: #3F3F46; border-color: #4f46e5; font-weight: bold;
}
.program-title { flex-grow: 1; }
.program-actions { display: flex; gap: 0.75rem; }
.edit-button:hover {
  background-color: #1d4ed8;
  border-color: #2563eb;
}
.action-button {
  background: none; border: 1px solid #52525B; color: #D4D4D8;
  padding: 0.25rem 0.75rem; border-radius: 6px; cursor: pointer;
  font-size: 0.85rem; transition: all 0.2s;
}
.action-button:hover:not(:disabled) { background-color: #52525B; color: #fff; }
.action-button:disabled { opacity: 0.7; cursor: default; }
.delete-button:hover { background-color: #991B1B; border-color: #DC2626; }
.modal-footer {
  padding: 1.5rem; border-top: 1px solid #3F3F46;
  background-color: #18181B; flex-shrink: 0;
}
.create-form { display: flex; gap: 0.75rem; }
.create-form input {
  flex-grow: 1; background-color: #3F3F46; border: 1px solid #52525B;
  color: #fff; padding: 0.6rem 1rem; border-radius: 8px; font-size: 1rem;
}
.create-form input::placeholder { color: #A1A1AA; }
.create-form button {
  background-color: #4f46e5; color: #fff; border: none;
  padding: 0.6rem 1.5rem; border-radius: 8px; font-weight: 600;
  cursor: pointer; transition: background-color 0.2s;
}
.create-form button:hover { background-color: #4338ca; }
.create-form button:disabled { background-color: #3730a3; cursor: not-allowed; }
</style>