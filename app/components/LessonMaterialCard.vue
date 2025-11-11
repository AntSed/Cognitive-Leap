// app/components/LessonMaterialCard.vue
<template>
  <div
    :class="rootClasses"
    :title="cardTooltip"
    @click.stop="handleCardClick"
  >
    <div class="relative">
      <HubCardImage
        :material="material"
        :thumbnail-url="material.thumbnail_url"
        :can-edit="false"
        :title="material.title"
        @play="handleCardClick"
      />

      <div
        v-if="isLocked"
        class="absolute top-3 right-3 z-20 w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white/40"
        :title="t('locked')"
        v-html="svgIcons.lock"
      ></div>

      <div
        v-else-if="isCompleted"
        class="absolute top-3 right-3 z-20 w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white/40"
        :class="isStale ? 'bg-yellow-400' : 'bg-green-500'"
        :title="completionDateTooltip"
        v-html="svgIcons.check"
      ></div>
    </div>

    <div class="p-5">
      <h3
        class="text-lg font-semibold leading-tight"
        :class="
          isCompleted && !isLocked
            ? 'text-gray-500'
            : 'text-gray-900 group-hover:text-black'
        "
      >
        {{ material.title }}
      </h3>
      <p
        v-if="material.description"
        class="text-sm text-gray-600 mt-1 line-clamp-5"
      >
        {{ material.description }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useMaterialPlayer } from '~/composables/useMaterialPlayer';
import { useI18n } from 'vue-i18n';
import HubCardImage from '~/components/hub/HubCardImage.vue';

// --- PROPS ---
const props = defineProps({
  material: {
    type: Object,
    required: true,
  },
  isLocked: {
    type: Boolean,
    default: false,
  },
  isExam: {
    type: Boolean,
    default: false,
  },
});

// --- COMPOSABLES ---
const { playMaterial } = useMaterialPlayer();
const { t, d } = useI18n();

// --- ICONS ---
const svgIcons = {
  check: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" class="w-4 h-4 text-white"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>`,
  lock: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5 text-white"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 00-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>`,
};

// --- HANDLERS ---
const handleCardClick = () => {
  if (props.isLocked) return;
  playMaterial(props.material);
};

// --- COMPUTED: STATUS ---
const isCompleted = computed(() => !!props.material.completed);
const isStale = computed(() => {
  if (!props.material.completed_at) return false;
  if (!isCompleted.value) return false; 
  const completionDate = new Date(props.material.completed_at);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  return completionDate < sixMonthsAgo;
});

// --- COMPUTED: DISPLAY LOGIC ---

const rootClasses = computed(() => [
  'bg-white rounded-xl overflow-hidden shadow-lg transition-all duration-300 group',
  props.isExam
    ? 'border-l-4 border-l-red-400'
    : 'border-l-4 border-l-blue-400',
  {
    'opacity-100': isCompleted.value && !props.isLocked,
    'opacity-100': !isCompleted.value && !props.isLocked,
    'grayscale opacity-60 cursor-not-allowed': props.isLocked,
    'hover:shadow-2xl hover:scale-[1.03] hover:-translate-y-1.5 cursor-pointer':
      !props.isLocked,
  },
]);

// --- COMPUTED: TOOLTIPS ---

const completionDateTooltip = computed(() => {
  if (!props.material.completed_at) {
    return t('completed');
  }

  const date = new Date(props.material.completed_at);

  // Check if the date object is valid
  if (isNaN(date.getTime())) {
    console.warn(
      'Invalid completion date received for material:',
      props.material.id,
      props.material.completed_at
    );
    return t('completed'); // Fallback
  }

  try {
    return t('completedOn', { date: d(date, 'short') });
  } catch (e) {
    console.error('Error formatting date:', e);
    return t('completed'); // Fallback
  }
});

const cardTooltip = computed(() => {
  if (props.isLocked) {
    return t('materialLockedTooltip');
  }

  const completionDate = props.material.completed_at
    ? new Date(props.material.completed_at)
    : null;
  
  // Check if date is not null AND is a valid date object
  const isValidDate = completionDate && !isNaN(completionDate.getTime());

  if (isStale.value && isValidDate) {
    return t('materialStaleTooltip', {
      date: d(completionDate, 'short'),
    });
  }

  if (isCompleted.value) {
    if (isValidDate) {
      return t('materialCompletedTooltip', {
        date: d(completionDate, 'short'),
      });
    } else {
      // Fallback for completed materials that might lack a valid date
      return t('completed');
    }
  }

  return t('playMaterialTooltip');
});
</script>

