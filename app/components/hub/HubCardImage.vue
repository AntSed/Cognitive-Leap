<template>
  <div
    class="relative w-full cursor-pointer aspect-video group/image bg-black overflow-hidden"
  >
    <img
      :src="imageUrl"
      :alt="title" :class="['absolute inset-0 h-full w-full', imageClass]"
      @click="emit('play')"
    />

    <div
      class="absolute inset-0 z-10 flex items-center justify-center bg-black/30 opacity-0 transition-opacity duration-300 group-hover/image:opacity-100"
      @click.self="emit('play')"
    >
      <div
        class="flex h-16 w-16 items-center justify-center rounded-full bg-white/30 backdrop-blur-sm pointer-events-none"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="h-10 w-10 text-white pointer-events-none"
        >
          <path
            fill-rule="evenodd"
            d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653z"
            clip-rule="evenodd"
          />
        </svg>
      </div>
    </div>

    <button
      v-if="canEdit"
      class="absolute left-2 top-2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white opacity-70 transition-all hover:opacity-100 hover:bg-black"
      :title="t('hub.card.editThumbnailTooltip')"
      @click.stop="triggerFileInput"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        class="h-5 w-5 pointer-events-none"
      >
        <path
          d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
        />
      </svg>
    </button>

    <div
      v-if="isLoading"
      class="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm"
    >
       <p class="font-bold text-gray-700">{{ t('hub.messages.compressing') }}</p>
    </div>
    <div
      v-if="uploadError"
      class="absolute bottom-0 z-20 w-full bg-red-600 p-2 text-center text-xs font-medium text-white"
    >
      {{ uploadError }}
    </div>
    <input
      ref="fileInputRef"
      type="file"
      class="hidden"
      accept="image/png, image/jpeg, image/webp"
      @change="handleFileSelect"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
// import { useSupabaseClient } from '#imports'; // Больше не нужен
import { useI18n } from 'vue-i18n';
import { useR2Uploader } from '~/composables/useR2Uploader'; // <-- ИМПОРТ

// --- PROPS & EMITS ---
const props = defineProps({
  material: { type: Object, required: true },
  thumbnailUrl: { type: String, default: null },
  canEdit: { type: Boolean, default: false },
  title: { type: String, default: 'Untitled' }
});

const emit = defineEmits(['update:thumbnailUrl', 'play']);

// --- COMPOSABLES ---
const { t } = useI18n();
// Управляется через composable:
const { upload, isLoading, error: uploadError } = useR2Uploader(); 

// --- STATE ---
const fileInputRef = ref(null);

// --- COMPUTED ---

const imageClass = computed(() => {
  return props.thumbnailUrl ? 'object-contain' : 'object-cover';
});

const imageUrl = computed(() => {
  if (props.thumbnailUrl) {
    // Используем updated_at для сброса кэша
    const timestamp = new Date(props.material.updated_at).getTime();
    return `${props.thumbnailUrl}?t=${timestamp}`;
  }

  // Логика фоллбэка
  const text = encodeURIComponent(props.title);
  const isExam = props.material.material_purpose === 'exam';
  const color = isExam ? 'F87171' : '60A5FA';
  return `https://placehold.co/640x360/${color}/FFFFFF?text=${text}&font=inter`;
});
// --- METHODS ---

const triggerFileInput = () => {
  uploadError.value = null; // Сброс ошибки при новой попытке
  fileInputRef.value?.click();
};

const handleFileSelect = (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    uploadError.value = t('hub.errors.invalidImageType');
    return;
  }

  if (file.size > 8 * 1024 * 1024) { // 8MB лимит на *оригинал*
    uploadError.value = t('hub.errors.fileTooLarge');
    return;
  }

  uploadFile(file);
};

// --- !! ГЛАВНОЕ ИЗМЕНЕНИЕ БЫЛО ЗДЕСЬ !! ---
const uploadFile = async (file) => {
  
  const newPublicUrl = await upload(file, props.material.id);
  
  if (newPublicUrl) {
    // Сообщаем родителю (Хабу), что URL изменился.
    // Родитель должен сохранить это в `learning_apps.thumbnail_url`
    emit('update:thumbnailUrl', newPublicUrl);
  }
  
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
};
</script>
