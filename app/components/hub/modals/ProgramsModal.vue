// app\components\hub\modals\ProgramsModal.vue
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

<style lang="css" scoped>
/* * 1. ОСНОВНАЯ СТРУКТУРА МОДАЛКИ
 * Задаем размеры, фон, тень и вертикальное flex-расположение,
 * как в EditProgramModal.
 */
.programs-modal {
  @apply flex flex-col max-h-[85vh] w-11/12 max-w-lg;
  @apply bg-white text-zinc-900 rounded-xl border border-gray-200 shadow-xl shadow-black/10;
}

/* * 2. ШАПКА
 * Фиксированная шапка с отступами и разделителем.
 */
.modal-header {
  @apply px-6 py-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0;
}
.modal-header h2 {
  @apply text-xl font-semibold;
}
.modal-close-button {
  @apply bg-transparent border-none text-gray-400 text-3xl leading-none cursor-pointer;
  @apply transition-all duration-200 hover:text-gray-700 hover:rotate-90;
}

/* * 3. ТЕЛО
 * Самая важная часть: заставляет контент прокручиваться,
 * если он не помещается по высоте.
 */
.modal-body {
  @apply flex-1 overflow-y-auto p-6;
  /* Скрываем полосу прокрутки */
  @apply [scrollbar-width:none] [&::-webkit-scrollbar]:hidden;
}

/* Состояния загрузки / пустого списка */
.state-indicator {
  @apply text-center text-gray-500 py-8;
}

/* * 4. СПИСОК ПРОГРАММ
 */
.programs-list {
  @apply flex flex-col gap-2;
}
.program-item {
  @apply flex justify-between items-center p-3 rounded-lg cursor-pointer;
  @apply transition-all duration-150 hover:bg-gray-100;
}
.program-item.active {
  @apply bg-indigo-50 text-indigo-700 font-semibold;
}
.program-title {
  @apply flex-1 truncate pr-4; /* Обрезаем длинные названия */
}
.program-actions {
  @apply flex gap-1 sm:gap-2 flex-shrink-0; /* Кнопки не сжимаются */
}

/* Кнопки действий (Редакт., Удалить) */
.action-button {
  @apply text-xs font-medium rounded p-1.5 transition-all;
}
.share-button {
  @apply text-blue-600 hover:bg-blue-100;
  /* Для состояния "Скопировано!" */
  @apply disabled:text-gray-400 disabled:bg-transparent disabled:cursor-default;
}
.edit-button {
  @apply text-indigo-600 hover:bg-indigo-100;
}
.delete-button {
  @apply text-red-600 hover:bg-red-100;
}

/* * 5. ПОДВАЛ (ФУТЕР)
 * Фиксированный подвал с формой создания.
 */
.modal-footer {
  @apply p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0 rounded-b-xl;
}

/* * 6. АДАПТИВНАЯ ФОРМА СОЗДАНИЯ
 * Ключевой фикс для мобильных:
 * - По умолчанию: flex-col (инпут над кнопкой)
 * - На экранах sm и больше: flex-row (инпут слева от кнопки)
 */
.create-form {
  @apply flex flex-col sm:flex-row gap-3;
}
.create-form input {
  @apply flex-1; /* Инпут занимает все доступное место */
}
.create-form button {
  @apply w-full sm:w-auto flex-shrink-0; /* Кнопка во всю ширину на мобилке */
}


/* * 7. ОБЩИЕ СТИЛИ (из прошлого файла)
 * Добавляем базовые стили для инпутов и кнопок,
 * чтобы форма выглядела единообразно.
 */
.create-form input {
  @apply block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-zinc-900;
  @apply placeholder:text-gray-400 transition-all duration-200;
  @apply focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30;
}

.create-form button {
  @apply px-5 py-2.5 rounded-lg font-semibold text-white bg-indigo-600;
  @apply transition-all duration-200 ease-in-out;
  @apply hover:bg-indigo-700;
  @apply focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
}

</style>