<template>
  <div class="edit-program-modal flex flex-col max-h-[85vh] w-11/12 max-w-lg bg-white text-zinc-900 rounded-xl border border-gray-200 shadow-xl shadow-black/10">
    
    <header class="px-6 py-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
      <h2 class="text-xl font-semibold">{{ t('hub.editProgram.title') }}</h2>
      <button 
        class="bg-transparent border-none text-gray-400 text-3xl leading-none cursor-pointer transition-all duration-200 hover:text-gray-700 hover:rotate-90"
        @click="modalStore.close()"
      >
        &times;
      </button>
    </header>

    <form class="flex-1 flex flex-col overflow-hidden" @submit.prevent="handleSave">
      
      <div class="flex-1 overflow-y-auto p-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        
        <div class="form-group mb-6 flex flex-col">
          <label for="programTitle" class="label-style">{{ t('hub.editProgram.form.titleLabel') }}</label>
          <input 
            id="programTitle" 
            v-model="editableProgram.title" 
            type="text" 
            required
            class="input-field"
            :placeholder="t('hub.editProgram.form.titlePlaceholder')"
          />
        </div>

        <div class="form-group mb-6 flex flex-col">
          <label for="programDescription" class="label-style">{{ t('hub.editProgram.form.descriptionLabel') }}</label>
          <textarea 
            id="programDescription" 
            v-model="editableProgram.description" 
            rows="3"
            class="input-field"
            :placeholder="t('hub.editProgram.form.descriptionPlaceholder')"
          ></textarea>
        </div>

        <div class="form-group mb-6 flex flex-col">
          <label for="programSkin" class="label-style">{{ t('hub.editProgram.form.skinLabel') }}</label>
          <select 
            id="programSkin" 
            v-model="editableProgram.skin_id"
            class="input-field appearance-none"
          >
            <option :value="null">{{ t('hub.editProgram.form.skinPlaceholder') }}</option>
            <option v-for="skin in skins" :key="skin.id" :value="skin.id">
              {{ skin.name_translations?.en || skin.id }}
            </option>
          </select>
        </div>

        <div class="form-group-checkbox mb-8 flex items-center flex-wrap">
          <input 
            id="isPublic" 
            v-model="editableProgram.is_public" 
            type="checkbox"
            class="w-5 h-5 mr-3 rounded text-indigo-600 bg-white border-gray-300 focus:ring-indigo-500 focus:ring-2"
          />
          <label for="isPublic" class="font-medium text-zinc-800">{{ t('hub.editProgram.form.publicLabel') }}</label>
          <p class="help-text w-full mt-2 ml-8">{{ t('hub.editProgram.form.publicHelp') }}</p>
        </div>

        <div class="form-group mb-6 flex flex-col">
          <label class="label-style">{{ t('hub.editProgram.form.prerequisitesLabel') }}</label>
          <p class="w-full mb-2 help-text">{{ t('hub.editProgram.form.prerequisitesHelp') }}</p>
          <button 
            type="button" 
            class="button-secondary"
            @click="openPrerequisitesModal"
          >
            {{ t('hub.editProgram.form.prerequisitesButton') }}
          </button>
        </div>

      </div>

      <div class="form-actions p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 flex-shrink-0 rounded-b-xl">
        <button 
          type="button" 
          class="button-secondary" 
          @click="modalStore.close()"
        >
          {{ t('hub.editProgram.buttons.cancel') }}
        </button>
        <button 
          type="submit" 
          class="button-primary" 
          :disabled="isSaving"
        >
          {{ isSaving ? t('hub.editProgram.buttons.saving') : t('hub.editProgram.buttons.save') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useSupabaseClient, useI18n } from '#imports';
import { useModalStore } from '~/composables/useModalStore';

const props = defineProps({
  program: { type: Object, required: true },
  onUpdateSuccess: { type: Function, default: () => {} }
});

const supabase = useSupabaseClient();
const modalStore = useModalStore();
const { t } = useI18n(); 
const isSaving = ref(false);

const skins = ref([]);
const editableProgram = ref({ ...props.program });

const openPrerequisitesModal = () => {
  modalStore.open('hub/modals/PrerequisitesModal', {
    program: props.program,
    onUpdateSuccess: props.onUpdateSuccess
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
    console.error('Error updating program:', error.message || error);
  } finally {
    isSaving.value = false;
  }
};
</script>

<style lang="css" scoped>
/* Стили для полей формы */
.label-style {
  @apply block mb-1.5 text-sm font-medium text-zinc-700;
}

.input-field {
  @apply block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-zinc-900;
  @apply placeholder:text-gray-400 transition-all duration-200;
  @apply focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30;
}

/* Поскольку ты используешь 'appearance-none' на select, 
  нам нужно добавить свою собственную стрелку-индикатор.
*/
select.input-field {
  @apply pr-10; /* Оставляем место для стрелки */
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.75rem center;
  background-repeat: no-repeat;
  background-size: 1.25em 1.25em;
}

textarea.input-field {
  @apply min-h-[80px];
}

.help-text {
  @apply text-xs text-zinc-500;
}

/* Стили для кнопок */
.button-primary {
  @apply px-5 py-2.5 rounded-lg font-semibold text-white bg-indigo-600;
  @apply transition-all duration-200 ease-in-out;
  @apply hover:bg-indigo-700;
  @apply focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
}

.button-secondary {
  @apply px-5 py-2.5 rounded-lg font-semibold text-zinc-800 bg-white;
  @apply border border-gray-300;
  @apply transition-all duration-200 ease-in-out;
  @apply hover:bg-gray-50 hover:border-gray-400;
  @apply focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2;
  @apply disabled:opacity-60 disabled:cursor-not-allowed;
}
</style>