<template>
  <div class="material-card" :class="`status-${material.status}`">
    <EditablePosition
      v-if="material.position && (isAdmin || isEditor)"
      :model-value="material.position"
      @update:modelValue="handlePositionUpdate"
    />
    <div class="card-header">
      <span class="material-type">{{ material.material_type || 'N/A' }}</span>
      <span class="material-status">{{ material.status }}</span>
    </div>
    <div class="card-body">
      <InlineEditor
        tag="h3"
        class="material-title"
        :model-value="material.title_translations?.en"
        :can-edit="canEdit"
        placeholder="Untitled"
        @update:modelValue="newValue => handleFieldUpdate('title_translations', { ...(material.title_translations || {}), en: newValue })"
      />
      <InlineEditor
        tag="p"
        class="material-description"
        input-type="textarea"
        :model-value="material.description_translations?.en"
        :can-edit="canEdit"
        placeholder="No description"
        @update:modelValue="newValue => handleFieldUpdate('description_translations', { ...(material.description_translations || {}), en: newValue })"
      />
    </div>
    <div class="card-footer">
      <button class="play-button" @click="playMaterial(material)">
        {{ getButtonText(material) }}
      </button>

      <span class="material-age">
        Ages:
        <InlineEditor
          :model-value="material.recommended_age_min"
          :can-edit="canEdit"
          input-type="number"
          placeholder="?"
          input-class="age-input"
          @update:modelValue="newValue => handleFieldUpdate('recommended_age_min', parseInt(newValue) || null)"
        />
        -
        <InlineEditor
          :model-value="material.recommended_age_max"
          :can-edit="canEdit"
          input-type="number"
          placeholder="?"
          input-class="age-input"
          @update:modelValue="newValue => handleFieldUpdate('recommended_age_max', parseInt(newValue) || null)"
        />
      </span>
      
      <div class="card-actions">
        <button v-if="canManageStatus" class="action-btn" @click="openStatusModal(material, activeProgramId, props.onUpdate)" title="Manage Status">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.438 1.001v.001c0 .388.145.761.438 1.001l1.003.827a1.125 1.125 0 01.26 1.431l-1.296 2.247a1.125 1.125 0 01-1.37.49l-1.217-.456c-.355-.133-.75-.072-1.075.124a6.57 6.57 0 01-.22.127c-.332.183-.582.495-.645.87l-.213 1.281c-.09.543-.56.94-1.11.94h-2.593c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.645-.87a6.52 6.52 0 01-.22-.127c-.324-.196-.72-.257-1.075-.124l-1.217.456a1.125 1.125 0 01-1.37-.49l-1.296-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.437-1.001v-.001c0-.388-.145-.761-.437-1.001l-1.004-.827a1.125 1.125 0 01-.26-1.431l1.296-2.247a1.125 1.125 0 011.37-.49l1.217.456c.355.133.75.072 1.075-.124.072-.044.146-.087.22-.127.332-.183.582-.495.645-.87l.213-1.281z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <button v-if="canUnpin" @click="openUnpinModal(material, selectedLessonId, props.onUpdate)" class="action-btn unpin-btn" title="Unpin from Lesson">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
        </button>
        <button v-if="canDelete" @click="openDeleteModal(material, props.onUpdate)" class="action-btn delete-btn" title="Delete Material">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
<script setup>
import { computed } from 'vue';
import { useSupabaseClient } from '#imports';
import { useMaterialPlayer } from '~/composables/useMaterialPlayer';
import { useMaterialManagement } from '~/composables/useMaterialManagement'; // 1. Недостающий импорт
import EditablePosition from '~/components/hub/EditablePosition.vue';
import InlineEditor from '~/components/hub/InlineEditor.vue';

const props = defineProps({
  material: { type: Object, required: true },
  currentUser: { type: Object, required: true },
  selectedLessonId: { type: String, default: null },
  onUpdate: { type: Function, required: true },
  activeProgramId: { type: String, default: null }
});

const emit = defineEmits(['update-position']);

// 2. Недостающий вызов компосабла для модалок
const { openDeleteModal, openUnpinModal, openStatusModal } = useMaterialManagement();

const { getButtonText, playMaterial } = useMaterialPlayer();
const supabase = useSupabaseClient();

// --- Вычисляемые свойства для прав доступа ---
const isAuthor = computed(() => props.currentUser.user_id === props.material.developer_id);
const isAdmin = computed(() => props.currentUser.hub_role === 'admin');
const isEditor = computed(() => props.currentUser.hub_role === 'editor');
const canEdit = computed(() => isAuthor.value || isAdmin.value || isEditor.value);

// 3. Недостающие свойства для v-if на кнопках
const canDelete = computed(() => isAuthor.value || isAdmin.value);
const canUnpin = computed(() => (isEditor.value || isAdmin.value) && props.selectedLessonId);
const canManageStatus = computed(() => isEditor.value || isAdmin.value);


// --- Обработчики ---
const handlePositionUpdate = (newPosition) => {
  emit('update-position', {
    materialId: props.material.id,
    newPosition: newPosition
  });
};

const handleFieldUpdate = async (field, value) => {
  try {
    const { error } = await supabase
      .from('learning_apps')
      .update({ [field]: value })
      .eq('id', props.material.id);
    
    if (error) throw error;
    
    if (props.onUpdate) {
      props.onUpdate();
    }
  } catch (error) {
    console.error(`Failed to update field '${field}':`, error);
    alert('Update failed.');
    // Можно добавить логику отката изменений, если потребуется
  }
};
</script>

<style scoped>
.material-card {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  border-left: 5px solid #bdc3c7;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  position: relative;
}
.material-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
.material-card.status-published { border-color: #2ecc71; }
.material-card.status-in_review { border-color: #f1c40f; }
.material-card.status-draft { border-color: #95a5a6; }
.material-card.status-rejected { border-color: #e74c3c; }

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  font-size: 0.8rem;
  color: #7f8c8d;
}
.material-type {
  background-color: #ecf0f1;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  text-transform: uppercase;
  font-weight: bold;
}
.material-status { 
  font-style: italic;
 }
.card-body { flex-grow: 1; }
.material-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
  color: #2c3e50;
  padding-right: 50px;
}
.material-description {
  font-size: 0.9rem;
  color: #34495e;
  line-height: 1.4;
}
.card-footer {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e0f5fa;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.material-age {
  font-size: 0.85rem;
  color: #7f8c8d;
}
.play-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  background-color: #3498db; /* Синий цвет */
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}
.play-button:hover {
  background-color: #2980b9;
}
.card-actions {
  display: flex;
  gap: 0.5rem;
}
.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7f8c8d; /* Default icon color */
  transition: all 0.2s;
}
.action-btn:hover { 
  background-color: #ecf0f1;
  color: #2c3e50;
}
.action-btn svg {
  width: 20px;
  height: 20px;
}
.delete-btn:hover { 
  background-color: #fadbd8;
  color: #c0392b;
}
.unpin-btn:hover {
  background-color: #e8daef;
  color: #8e44ad;
}
</style>