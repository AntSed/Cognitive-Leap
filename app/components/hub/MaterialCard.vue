<template>
  <div class="material-card" :class="`status-${material.status}`">
    <div class="card-header">
      <span class="material-type">{{ material.material_type || 'N/A' }}</span>
      <span class="material-status">{{ material.status }}</span>
    </div>
    <div class="card-body">
      <h3 class="material-title">
        {{ material.title_translations?.en || 'Untitled' }}
      </h3>
      <p v-if="material.description_translations?.en" class="material-description">
        {{ material.description_translations.en.substring(0, 100) }}...
      </p>
    </div>
    <div class="card-footer">
        <button class="play-button" @click="playMaterial(material)">
        {{ getButtonText(material) }}
      </button>
      <span class="material-age">
        Ages: {{ material.recommended_age_min || '?' }} - {{ material.recommended_age_max || '?' }}
      </span>
      
      <div class="card-actions">
        <button v-if="canManageStatus" @click="openStatusModal(material)" class="action-btn status-btn" title="Manage Status">
          ⚙️
        </button>
        <button v-if="canUnpin" @click="openUnpinModal(material, selectedLessonId)" class="action-btn unpin-btn" title="Unpin from Lesson">
          💔
        </button>
        <button v-if="canDelete" @click="openDeleteModal(material)" class="action-btn delete-btn" title="Delete Material">
          🗑️
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useMaterialPlayer } from '~/composables/useMaterialPlayer';
import { useMaterialManagement } from '~/composables/useMaterialManagement';

const props = defineProps({
  material: { type: Object, required: true },
  currentUser: { type: Object, required: true },
  selectedLessonId: { type: String, default: null }
});


const { openDeleteModal, openUnpinModal, openStatusModal } = useMaterialManagement();
const { getButtonText, playMaterial } = useMaterialPlayer();

const isAuthor = computed(() => props.currentUser.user_id === props.material.developer_id);
const isAdmin = computed(() => props.currentUser.hub_role === 'admin');
const isEditor = computed(() => props.currentUser.hub_role === 'editor');

const canDelete = computed(() => isAuthor.value || isAdmin.value);
const canUnpin = computed(() => (isEditor.value || isAdmin.value) && props.selectedLessonId);
const canManageStatus = computed(() => isEditor.value || isAdmin.value);

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
.material-status { font-style: italic; }
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
  border-top: 1px solid #ecf0f1;
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  font-size: 1.2rem;
  padding: 0.25rem;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}
.action-btn:hover { background-color: #ecf0f1; }
.delete-btn:hover { background-color: #fadbd8; }
</style>