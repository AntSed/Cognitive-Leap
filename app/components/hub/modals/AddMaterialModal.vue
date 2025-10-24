// app\components\hub\modals\AddMaterialModal.vue
<template>
  <div class="add-material-modal">
    <form @submit.prevent="handleSubmit" class="add-form">
      <div class="form-section">
        <label class="form-label">{{ $t('hub.add.chooseType') }}</label>
        <div class="type-selector">
          <button type="button" :class="{ active: selectedType === 'external_link' }" @click="selectedType = 'external_link'">
            🔗 {{ $t('hub.add.typeExternal') }}
          </button>
          <button type="button" :class="{ active: selectedType === 'internal_video' }" @click="selectedType = 'internal_video'">
            🎬 {{ $t('hub.add.typeVideoInternal') }}
          </button>
          <button type="button" :class="{ active: selectedType === 'upload_app' }" @click="selectedType = 'upload_app'">
            📦 {{ $t('hub.add.typeApp') }}
          </button>
          <button type="button" :class="{ active: selectedType === 'upload_presentation' }" @click="selectedType = 'upload_presentation'">
            🖥️ {{ $t('hub.add.typePresentation') }}
          </button>
        </div>
        
        <div class="type-explanation">
          <p v-show="selectedType === 'external_link'">
            {{ $t('hub.add.typeExternal_desc') }}
          </p>
          <p v-show="selectedType === 'internal_video'">
            {{ $t('hub.add.typeVideoInternal_desc') }}
          </p>
           <p v-show="selectedType === 'upload_app'">
            {{ $t('hub.add.typeApp_desc') }}
          </p>
           <p v-show="selectedType === 'upload_presentation'">
            {{ $t('hub.add.typePresentation_desc') }}
          </p>
        </div>
      </div>

      <div class="form-section">
        <label class="form-label">{{ $t('hub.add.provideSource') }}</label>
        <div v-if="['external_link', 'internal_video'].includes(selectedType)">
          <input v-model="formData.url" type="url" placeholder="https://..." required class="form-input" />
        </div>
        <div v-if="['upload_app', 'upload_presentation'].includes(selectedType)">
          <input @change="handleFileUpload" type="file" accept=".zip" required class="form-input-file" />
        </div>
        <div v-if="formData.file" class="file-preview">
          {{ $t('hub.add.selectedFile') }}: <strong>{{ formData.file.name }}</strong> ({{ (formData.file.size / 1024 / 1024).toFixed(2) }} MB)
        </div>
      </div>

      <div class="form-section">
        <label class="form-label">{{ $t('hub.add.addDetails') }}</label>
        <div class="language-selector">
          <p class="sub-label">{{ $t('hub.add.contentLang') }}</p>
          <div class="checkbox-group">
            <label><input type="checkbox" v-model="formData.languages" value="en"> English</label>
            <label><input type="checkbox" v-model="formData.languages" value="es"> Spanish</label>
            <label><input type="checkbox" v-model="formData.languages" value="ru"> Russian</label>
          </div>
        </div>
        
        <div class="tabs">
          <button type="button" @click="activeLangTab = 'en'" :class="{ active: activeLangTab === 'en' }">English</button>
          <button type="button" @click="activeLangTab = 'es'" :class="{ active: activeLangTab === 'es' }">Spanish</button>
          <button type="button" @click="activeLangTab = 'ru'" :class="{ active: activeLangTab === 'ru' }">Russian</button>
        </div>
        <div class="tab-content">
          <div v-show="activeLangTab === 'en'">
            <input v-model="formData.title_translations.en" type="text" placeholder="Title (in English)" required class="form-input" />
            <textarea v-model="formData.description_translations.en" placeholder="Description (in English)" rows="3" class="form-input"></textarea>
          </div>
          <div v-show="activeLangTab === 'es'">
            <input v-model="formData.title_translations.es" type="text" placeholder="Título (en Español)" class="form-input" />
            <textarea v-model="formData.description_translations.es" placeholder="Descripción (en Español)" rows="3" class="form-input"></textarea>
          </div>
          <div v-show="activeLangTab === 'ru'">
            <input v-model="formData.title_translations.ru" type="text" placeholder="Название (на русском)" class="form-input" />
            <textarea v-model="formData.description_translations.ru" placeholder="Описание (на русском)" rows="3" class="form-input"></textarea>
          </div>
        </div>
        
        <div class="age-range">
          <label for="age-min">{{ $t('hub.add.recommendedAge') }}</label>
          <input v-model.number="formData.age_min" id="age-min" type="number" placeholder="Min" min="0" class="form-input-age" />
          <span>-</span>
          <input v-model.number="formData.age_max" id="age-max" type="number" placeholder="Max" min="0" class="form-input-age" />
        </div>
      </div>

      <div class="form-actions">
        <button type="button" @click="modalStore.close()" class="cancel-button">
          {{ $t('common.cancel') }}
        </button>
        <button type="submit" class="submit-button" :disabled="isSubmitting">
          {{ isSubmitting ? $t('hub.add.submittingButton') : $t('hub.add.submitButton') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useSupabaseClient, useSupabaseUser } from '#imports';
import { useModalStore } from '~/composables/useModalStore';

const props = defineProps({
  lessonIds: {
    type: Array,
    default: () => []
  },
  onSuccess: {
    type: Function,
    required: true
  },
  hubContext: {
    type: String,
    required: true,
    validator: (value) => ['study', 'exam'].includes(value)
  }
});
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const modalStore = useModalStore();

const selectedType = ref('external_link');
const activeLangTab = ref('en');
const isSubmitting = ref(false);

// Full form data structure
const formData = reactive({
  url: '',
  file: null,
  title_translations: { en: '', es: '', ru: '' },
  description_translations: { en: '', es: '', ru: '' },
  languages: ['en'], // Default to English
  age_min: null,
  age_max: null,
});

const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (file) {
    formData.file = file;
  }
};

const handleSubmit = async () => {
  if (isSubmitting.value) return;
  isSubmitting.value = true;

  try {
    const cleanTranslations = (trans) => {
      return Object.entries(trans).reduce((acc, [lang, value]) => {
        if (value && value.trim()) acc[lang] = value.trim();
        return acc;
      }, {});
    };

    const materialTypeMap = {
      'external_link': 'external_link', 'internal_video': 'video',
      'upload_app': 'app', 'upload_presentation': 'presentation',
    };

    const coreMaterialData = {
      developer_id: user.value.id,
      material_type: materialTypeMap[selectedType.value],
      title_translations: cleanTranslations(formData.title_translations),
      description_translations: cleanTranslations(formData.description_translations),
      languages: formData.languages,
      recommended_age_min: formData.age_min,
      recommended_age_max: formData.age_max,
      status: 'draft',
      material_purpose: props.hubContext
    };

    if (['external_link', 'internal_video'].includes(selectedType.value)) {
      if (!formData.url) throw new Error('A URL is required.');
      
      const { error } = await supabase.rpc('create_material_and_link', {
        core_data: coreMaterialData,
        link_url: formData.url,
        // Убедись, что эта строка на месте!
        lesson_uuids: props.lessonIds
      });
      if (error) throw error;

    } else if (selectedType.value.startsWith('upload_')) {
      if (!formData.file) throw new Error('A file is required.');
      
      const body = new FormData();
      body.append('file', formData.file);
      body.append('coreData', JSON.stringify(coreMaterialData));
      body.append('lessonIds', JSON.stringify(props.lessonIds));

      const { data, error } = await supabase.functions.invoke('upload-and-sanitize-app', { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    }

    props.onSuccess();
    modalStore.close();

  } catch (error) {
    console.error('Error submitting material:', error);
    alert(`Error: ${error.message}`);
  } finally {
    isSubmitting.value = false;
  }
};
</script>
<style scoped>
.add-material-modal {
  width: 90vw;
  max-width: 800px;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px
 12px rgba(0,0,0,0.1);
  color: #333;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}
.add-form {
  padding: 2rem;
  overflow-y: auto;
}
.form-section {
  margin-bottom: 2rem;
}
.form-label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.75rem;
  font-size: 1.1rem;
}
.type-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
.type-selector button {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background-color: #f9fafb;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}
.type-selector button:hover {
  background-color: #f3f4f6;
  border-color: #a1a1aa;
}
.type-selector button.active {
  background-color: #4f46e5;
  color: #fff;
  border-color: #4f46e5;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.type-explanation {
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: #eef2ff;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #4338ca;
}
.type-explanation p {
  margin: 0;
}
.form-input, .form-input-age {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
}
.form-input-file {
  cursor: pointer;
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
}
textarea.form-input {
  margin-top: 0.5rem;
}
.age-range {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
}
.age-range label {
  font-weight: 500;
}
.form-input-age {
  width: 80px;
}
.file-preview {
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: #eef2ff;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #4338ca;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.75rem;
  border-top: 1px solid #e5e7eb;
  padding-top: 1.5rem;
  margin-top: 2rem;
}
.cancel-button {
  padding: 0.75rem 2rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background-color: #fff;
  color: #374151;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}
.cancel-button:hover {
  background-color: #f9fafb;
}
.submit-button {
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 8px;
  background-color: #4f46e5;
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}
.submit-button:hover {
  background-color: #4338ca;
}
.sub-label {
  font-weight: 500;
  color: #555;
  margin-bottom: 0.5rem;
}
.language-selector {
  margin-bottom: 1.5rem;
}
.checkbox-group {
  display: flex;
  gap: 1.5rem;
}
.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
}
.tabs {
  display: flex;
  border-bottom: 2px solid #e5e7eb;
  margin-bottom: 1rem;
}
.tabs button {
  padding: 0.5rem 1rem;
  border: none;
  background: none;
  cursor: pointer;
  font-weight: 600;
  color: #6b7280;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
}
.tabs button.active {
  color: #4f46e5;
  border-bottom-color: #4f46e5;
}
@media (max-width: 640px) {
  .type-selector {
    grid-template-columns: 1fr;
  }
  .checkbox-group {
    flex-direction: column;
    gap: 0.75rem;
  }
}
</style>