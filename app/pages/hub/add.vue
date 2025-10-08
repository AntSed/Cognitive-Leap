<template>
  <div class="add-material-page">
    <header class="hub-header">
      <h1>{{ $t('hub.add.title') }}</h1>
      <p>{{ $t('hub.add.subtitle') }}</p>
    </header>

    <form @submit.prevent="handleSubmit" class="add-form">
      <!-- Step 1: Material Type Selection -->
      <div class="form-section">
        <label class="form-label">{{ $t('hub.add.chooseType') }}</label>
        <div class="type-selector">
          <button type="button" :class="{ active: selectedType === 'external_link' }" @click="selectedType = 'external_link'">
            🔗 {{ $t('hub.add.typeExternal') }}
          </button>
          <button type="button" :class="{ active: selectedType === 'upload_app' }" @click="selectedType = 'upload_app'">
            📦 {{ $t('hub.add.typeApp') }}
          </button>
          <button type="button" :class="{ active: selectedType === 'upload_video' }" @click="selectedType = 'upload_video'">
            🎬 {{ $t('hub.add.typeVideo') }}
          </button>
          <button type="button" :class="{ active: selectedType === 'upload_presentation' }" @click="selectedType = 'upload_presentation'">
            🖥️ {{ $t('hub.add.typePresentation') }}
          </button>
        </div>
      </div>

      <!-- Step 2: Content Source (Dynamic) -->
      <div class="form-section">
        <label class="form-label">{{ $t('hub.add.provideSource') }}</label>
        <div v-if="selectedType === 'external_link'">
          <input v-model="formData.url" type="url" placeholder="https://www.youtube.com/..." required class="form-input" />
        </div>
        <div v-if="['upload_app', 'upload_presentation'].includes(selectedType)">
          <input @change="handleFileUpload" type="file" accept=".zip" required class="form-input-file" />
        </div>
        <div v-if="selectedType === 'upload_video'">
          <input @change="handleFileUpload" type="file" accept="video/mp4,video/webm" required class="form-input-file" />
        </div>
        <div v-if="formData.file" class="file-preview">
          Selected file: <strong>{{ formData.file.name }}</strong> ({{ (formData.file.size / 1024 / 1024).toFixed(2) }} MB)
        </div>
      </div>

      <!-- Step 3: Material Details (Common) -->
      <div class="form-section">
        <label class="form-label">{{ $t('hub.add.addDetails') }}</label>

        <div class="language-selector">
          <p class="sub-label">{{ $t('hub.add.contentLang') }}</p>
          <div class="checkbox-group">
            <label><input type="checkbox" v-model="formData.languages" value="en"> English</label>
            <label><input type="checkbox" v-model="formData.languages" value="ru"> Russian</label>
            <label><input type="checkbox" v-model="formData.languages" value="es"> Spanish</label>
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
            <textarea v-model="formData.description_translations.en" placeholder="Description (in English)" rows="4" class="form-input"></textarea>
          </div>
          <div v-show="activeLangTab === 'es'">
            <input v-model="formData.title_translations.es" type="text" placeholder="Título (en Español)" class="form-input" />
            <textarea v-model="formData.description_translations.es" placeholder="Descripción (en Español)" rows="4" class="form-input"></textarea>
          </div>
          <div v-show="activeLangTab === 'ru'">
            <input v-model="formData.title_translations.ru" type="text" placeholder="Название (на русском)" class="form-input" />
            <textarea v-model="formData.description_translations.ru" placeholder="Описание (на русском)" rows="4" class="form-input"></textarea>
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
import { useRouter } from 'vue-router';

definePageMeta({
  middleware: 'auth'
});

// Get Supabase instances, user and router
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const router = useRouter();

// Component state
const selectedType = ref('external_link');
const activeLangTab = ref('en');
const isSubmitting = ref(false);

// Form data model
const formData = reactive({
  url: '',
  file: null,
  title_translations: { en: '', es: '', ru: '' },
  description_translations: { en: '', es: '', ru: '' },
  languages: [],
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
    // --- Prepare the core data object ---

    // Clean up translation objects to avoid storing empty keys in the database.
    const cleanTitleTranslations = {};
    for (const lang in formData.title_translations) {
      if (formData.title_translations[lang]) {
        cleanTitleTranslations[lang] = formData.title_translations[lang];
      }
    }
    const cleanDescriptionTranslations = {};
    for (const lang in formData.description_translations) {
      if (formData.description_translations[lang]) {
        cleanDescriptionTranslations[lang] = formData.description_translations[lang];
      }
    }

    const coreMaterialData = {
      developer_id: user.value.id,
      material_type: selectedType.value.startsWith('upload_') 
        ? selectedType.value.substring('upload_'.length) 
        : selectedType.value,
      title_translations: cleanTitleTranslations,
      description_translations: cleanDescriptionTranslations,
      languages: formData.languages,
      recommended_age_min: formData.age_min,
      recommended_age_max: formData.age_max,
      status: 'draft',
    };

    // --- Handle submission based on material type ---

    if (selectedType.value === 'external_link') {
      const { error } = await supabase.from('learning_apps').insert({
        ...coreMaterialData,
        url: formData.url,
      });
      if (error) throw error;

    } else if (['upload_app', 'upload_presentation'].includes(selectedType.value)) {
      // Handle interactive content upload via the new Edge Function
      if (!formData.file) throw new Error('No file selected for upload.');
      
      const body = new FormData();
      body.append('file', formData.file);
      body.append('coreData', JSON.stringify(coreMaterialData));

      const { data, error } = await supabase.functions.invoke('upload-and-sanitize-app', {
          body,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

    } else if (selectedType.value === 'upload_video') {
      // TODO: This should be updated to a more generic file upload function.
      // For now, it uses the older 'unarchive-app' function as a placeholder.
      if (!formData.file) throw new Error('No file selected for upload.');
      
      const body = new FormData();
      body.append('file', formData.file);
      body.append('coreData', JSON.stringify(coreMaterialData));

      const { data, error } = await supabase.functions.invoke('unarchive-app', {
          body,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    }

    // --- Success ---
    // Note: A custom notification/toast component would be a good future improvement.
    console.log('Material submitted successfully!');
    router.push('/hub');

  } catch (error) {
    console.error('Error submitting material:', error);
    // Note: Displaying errors to the user should be handled by a UI component.
    console.error(`Error for user: ${error.message}`);
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
.add-material-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  color: #333;
}
.hub-header {
  text-align: center;
  margin-bottom: 2.5rem;
}
.hub-header h1 {
  font-size: 2.5rem;
  font-weight: bold;
}
.add-form {
  background-color: #fff;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
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
  text-align: right;
  border-top: 1px solid #e5e7eb;
  padding-top: 1.5rem;
  margin-top: 2rem;
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
