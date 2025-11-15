// app/components/hub/HubMaterialCard.vue
<template>
  <div
    class="material-card group relative flex flex-col overflow-hidden rounded-lg border-l-4 bg-white shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
    :class="[borderClass]"
  >
    <EditablePosition
      v-if="selectedLessonId && displayIndex && (isAdmin || isEditor || isProgramOwner)"
      :model-value="displayIndex"
      class="absolute right-2 top-2 z-20"
      @update:modelValue="handlePositionUpdate"
    />
    <HubCardImage
      :material="material"
      :thumbnail-url="material.thumbnail_url"
      :can-edit="canEdit"
      :title="displayedTitle"
      @play="handleCardClick"
      @update:thumbnailUrl="
        (newUrl) => handleFieldUpdate('thumbnail_url', newUrl)
      "
    />

    <div class="flex flex-grow flex-col p-4">
      <div class="flex-grow">
        
        <div class="flex items-center justify-between gap-1">
          
          <div class="flex-1 min-w-0">
            <InlineEditor
              tag="h3"
              class="material-title text-lg font-semibold text-gray-800"
              :model-value="displayedTitle"
              :can-edit="canEdit"
              :placeholder="t('hub.card.untitled')"
              input-class="w-full text-lg font-semibold p-0 border-0 border-b-2 border-gray-300 !text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-0"
              @update:modelValue="
                (newValue) =>
                  handleFieldUpdate('title_translations', {
                    ...(material.title_translations || {}),
                    [currentLangCode]: newValue,
                  })
              "
            />
          </div>

          <div
            v-if="availableLangs.length > 1"
            class="lang-switcher ml-2 flex shrink-0 items-center gap-1"
          >
            <button
              @click.stop="cycleLang(-1)"
              class="rounded-md p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              title="Previous language"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span class="text-xs font-medium text-gray-500">
              {{ currentLangCode.toUpperCase() }}
            </span>
            <button
              @click.stop="cycleLang(1)"
              class="rounded-md p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              title="Next language"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        <InlineEditor
          tag="p"
          class="material-description mt-1 text-sm leading-snug text-gray-700"
          input-type="textarea"
          :model-value="displayedDescription"
          :can-edit="canEdit"
          :placeholder="t('hub.card.noDescription')"
          input-class="w-full text-sm border border-gray-300 rounded-md p-1 mt-1 !text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          @update:modelValue="
            (newValue) =>
              handleFieldUpdate('description_translations', {
                ...(material.description_translations || {}),
                [currentLangCode]: newValue,
              })
          "
        />
      </div>

      <div
        class="mt-4 flex items-center justify-between border-t border-gray-100 pt-4"
      >
        <div class="flex items-center gap-3">
          <div class="h-6 w-6 text-gray-500" :title="material.material_type">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="h-6 w-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                :d="typeIconPath"
              />
            </svg>
          </div>

          <span class="material-age text-sm text-gray-500">
            Ages:
            <InlineEditor
              :model-value="material.recommended_age_min"
              :can-edit="canEdit"
              input-type="number"
              placeholder="?"
              input-class="w-10 text-center p-0 border-0 border-b-2 border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-0"
              @update:modelValue="
                (newValue) =>
                  handleFieldUpdate('recommended_age_min', parseInt(newValue) || null)
              "
            />
            -
            <InlineEditor
              :model-value="material.recommended_age_max"
              :can-edit="canEdit"
              input-type="number"
              placeholder="?"
              input-class="w-10 text-center p-0 border-0 border-b-2 border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-0"
              @update:modelValue="
                (newValue) =>
                  handleFieldUpdate('recommended_age_max', parseInt(newValue) || null)
              "
            />
          </span>
        </div>

        <div class="card-actions flex gap-2">
          <button
            v-if="canManageStatus"
            class="action-btn flex h-8 w-8 items-center justify-center rounded-full bg-transparent p-1 text-gray-500 transition-all duration-200 hover:bg-gray-100 hover:text-gray-900"
            @click.stop="openStatusModal(material, allProgramLessons, updateTools)"
            :title="t('hub.card.manageStatusTooltip')"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="h-5 w-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.438 1.001v.001c0 .388.145.761.438 1.001l1.003.827a1.125 1.125 0 01.26 1.431l-1.296 2.247a1.125 1.125 0 01-1.37.49l-1.217-.456c-.355-.133-.75-.072-1.075.124a6.57 6.57 0 01-.22.127c-.332.183-.582.495-.645.87l-.213 1.281c-.09.543-.56.94-1.11.94h-2.593c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.645-.87a6.52 6.52 0 01-.22-.127c-.324-.196-.72-.257-1.075.124l-1.217.456a1.125 1.125 0 01-1.37-.49l-1.296-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.437-1.001v-.001c0-.388-.145-.761-.437-1.001l-1.004-.827a1.125 1.125 0 01-.26-1.431l1.296-2.247a1.125 1.125 0 011.37-.49l1.217.456c.355.133.75.072 1.075.124.072-.044.146-.087.22-.127.332-.183.582.495.645.87l.213-1.281z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
          <button
            v-if="canUnpin"
            @click.stop="openUnpinModal(material, selectedLessonId, updateTools)"
            class="action-btn unpin-btn flex h-8 w-8 items-center justify-center rounded-full bg-transparent p-1 text-gray-500 transition-all duration-200 hover:bg-purple-50 hover:text-purple-600"
            :title="t('hub.card.unpinTooltip')"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="h-5 w-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
              />
            </svg>
          </button>
          <button
            v-if="canDelete"
            @click.stop="openDeleteModal(material, updateTools)"
            class="action-btn delete-btn flex h-8 w-8 items-center justify-center rounded-full bg-transparent p-1 text-gray-500 transition-all duration-200 hover:bg-red-50 hover:text-red-600"
            :title="t('hub.card.deleteTooltip')"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="h-5 w-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useSupabaseClient } from '#imports';
import { useI18n } from 'vue-i18n';
import { useMaterialPlayer } from '~/composables/useMaterialPlayer';
import { useMaterialManagement } from '~/composables/useMaterialManagement';
import EditablePosition from '~/components/hub/EditablePosition.vue';
import InlineEditor from '~/components/hub/InlineEditor.vue';
import HubCardImage from '~/components/hub/HubCardImage.vue';

// --- PROPS ---
const props = defineProps({
  material: { type: Object, required: true },
  currentUser: { type: Object, required: true },
  selectedLessonId: { type: String, default: null },
  updateTools: { type: Object, required: true },
  allProgramLessons: { type: Array, required: true },
  displayIndex: { type: Number, default: null },
  isProgramOwner: { type: Boolean, default: false }
});

const emit = defineEmits(['update-position']);

// --- COMPOSABLES ---
const supabase = useSupabaseClient();
const { t, locale } = useI18n();

// --- LANGUAGE SWITCHER LOGIC ---

// 1. Get available languages from translations that have a non-empty title.
const availableLangs = computed(() => {
  const translations = props.material.title_translations || {};
  return Object.keys(translations).filter(lang => translations[lang]);
});

// 2. Find the initial language to display.
const getInitialLangIndex = () => {
  if (!availableLangs.value.length) return 0; // Fallback if no translations exist.

  // Priority 1: User's current locale.
  const localeIndex = availableLangs.value.indexOf(locale.value);
  if (localeIndex !== -1) return localeIndex;

  // Priority 2: English ('en').
  const enIndex = availableLangs.value.indexOf('en');
  if (enIndex !== -1) return enIndex;

  // Priority 3: The first available language.
  return 0;
};

// 3. Local state for the index of the current language.
const currentLangIndex = ref(getInitialLangIndex());

// 4. The code for the current language (e.g., 'en', 'ru').
const currentLangCode = computed(() => {
  return availableLangs.value[currentLangIndex.value] || 'en'; // Fallback to 'en'.
});

// 5. Computed properties for the displayed title and description.
const displayedTitle = computed(() => {
  return props.material.title_translations?.[currentLangCode.value] || t('hub.card.untitled');
});

const displayedDescription = computed(() => {
  return props.material.description_translations?.[currentLangCode.value] || t('hub.card.noDescription');
});

// 6. Function to cycle through languages using the arrow buttons.
const cycleLang = (direction) => {
  const langCount = availableLangs.value.length;
  if (langCount <= 1) return;

  let newIndex = currentLangIndex.value + direction;

  // Loop through languages.
  if (newIndex < 0) {
    newIndex = langCount - 1; // Go from first to last.
  } else if (newIndex >= langCount) {
    newIndex = 0; // Go from last to first.
  }
  
  currentLangIndex.value = newIndex;
};
const { openDeleteModal, openUnpinModal, openStatusModal } =
  useMaterialManagement();
const { playMaterial } = useMaterialPlayer();

// --- PERMISSIONS ---
const isAuthor = computed(
  () => props.currentUser.user_id === props.material.developer_id
);
const isAdmin = computed(() => props.currentUser.hub_role === 'admin');
const isEditor = computed(() => props.currentUser.hub_role === 'editor');

const canEdit = computed(() => isAuthor.value || isAdmin.value || isEditor.value);
const canDelete = computed(() => isAuthor.value || isAdmin.value);
const canUnpin = computed(
  () => (isEditor.value || isAdmin.value) && props.selectedLessonId
);
const canManageStatus = computed(() => isEditor.value || isAdmin.value);

// --- COMPUTED STYLES ---
const borderClass = computed(() => {
  const status = props.material.status;
  const purpose = props.material.material_purpose;

  if (purpose === 'exam' && status === 'published') {
    return 'border-red-500';
  }
  switch (status) {
    case 'published':
      return 'border-blue-600';
    case 'in_review':
      return 'border-yellow-400';
    case 'draft':
      return 'border-gray-400';
    case 'rejected':
      return 'border-gray-900';
    default:
      return 'border-gray-300';
  }
});
/**
 * Provides the correct SVG <path> for the material type icon.
 */
const typeIconPath = computed(() => {
  // FIX: Add .toUpperCase() and nullish coalescing ('')
  // to make the switch case-insensitive and safe.
  const type = (props.material.material_type || '').toUpperCase();
  
  switch (type) {
    case 'EXTERNAL_LINK':
      return 'M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244';
    case 'APP':
      return 'M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9';
    case 'VIDEO':
      return 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z M10 8.25v7.5l5.25-3.75L10 8.25z';
    default:
      return 'M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5';
  }
});
// --- HANDLERS ---
const handleCardClick = () => {
  playMaterial(props.material);
};

const handlePositionUpdate = (newPosition) => {
  emit('update-position', {
    materialId: props.material.id,
    newPosition: newPosition,
  });
};

const handleFieldUpdate = async (field, value) => {
  const oldValue = props.material[field];
  props.material[field] = value; 

  try {
    const { data, error } = await supabase
      .from('learning_apps')
      .update({ [field]: value })
      .eq('id', props.material.id)
      .select('updated_at') 
      .single();
    if (error) throw error;
    if (data && data.updated_at) {
      props.material.updated_at = data.updated_at;
    }
  } catch (error) {
    console.error(`Failed to update field '${field}':`, error);
    alert(t('hub.errors.updateFieldFailed'));
    props.material[field] = oldValue;
  }
};
</script>