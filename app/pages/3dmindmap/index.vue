<template>
  <div class="mind-map-page">
    <div id="ui-panel">
      <button @click="newMap" class="btn">{{ $t('ui.buttons.newMap') }}</button>
      <button @click="mindMapRef?.addNode()" class="btn">{{ $t('ui.buttons.addNode') }}</button>
      <div class="btn-group">
        <button @click="toggleConnection" :class="{ active: isConnectionModeActive }" class="btn btn-main">
          {{ $t('ui.buttons.addConnection') }}
        </button>
        <button @click="toggleLines" class="btn btn-toggle" :title="$t(lineStyleTooltipKey)">
          <svg v-if="areLinesCurved" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M4 12C4 7.58172 7.58172 4 12 4C16.4183 4 20 7.58172 20 12"/></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M4 12L20 12"/></svg>
        </button>
      </div>
      <button @click="saveMap" class="btn">{{ $t('ui.buttons.save') }}</button>
      <button @click="loadMap" class="btn">{{ $t('ui.buttons.load') }}</button>
      <button @click="deleteMap" v-if="currentMapId" class="btn btn-danger">{{ $t('ui.buttons.deleteMap') }}</button>
    </div>

    <MindMap
      ref="mindMapRef"
      @ready="onMapReady"
      @map-changed="onMapChanged"
      @mode-changed="onModeChanged"
    />
    
    <div v-if="isLoadPanelVisible" class="panel load-panel">
        <h3>{{ $t('loadPanel.title') }}</h3>
        <div v-if="!savedMaps || savedMaps.length === 0">{{ $t('loadPanel.noMapsFound') }}</div>
        <div v-else class="map-list">
            <button v-for="map in savedMaps" :key="map.id" @click="loadMapById(map.id)" class="btn map-list-item">
                {{ map.name }}
            </button>
        </div>
        <button @click="isLoadPanelVisible = false" class="btn" style="margin-top: 15px;">{{ $t('ui.buttons.close') }}</button>
    </div>

    <Notification 
      ref="notificationRef"
      :message="notificationMessage"
      :type="notificationType" 
    />
    <ModalWrapper />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import MindMap from '~/components/MindMap.vue';
import Notification from '~/components/Notification.vue';
import { useModalStore } from '~/composables/useModalStore';

// Убираем прямые импорты модальных окон, так как store будет загружать их динамически по строковому имени
// import ConfirmModal from '~/components/modals/ConfirmModal.vue';
// import PromptModal from '~/components/modals/PromptModal.vue';

// --- Composables ---
const supabase = useSupabaseClient();
const { t } = useI18n();
const modalStore = useModalStore();

// --- Component Refs ---
const mindMapRef = ref(null);
const notificationRef = ref(null);

// --- State ---
const isConnectionModeActive = ref(false);
const areLinesCurved = ref(true);
const currentMapId = ref(null);
const currentMapName = ref('');
const isLoadPanelVisible = ref(false);
const savedMaps = ref([]);
const notificationMessage = ref('');
const notificationType = ref('info');
let lastMapData = null;

// --- Computed ---
const lineStyleTooltipKey = computed(() => areLinesCurved.value ? 'ui.tooltips.switchToStraight' : 'ui.tooltips.switchToCurved');

// --- UI Helpers ---
function showNotification(message, type = 'info', duration = 3000) {
    notificationMessage.value = message;
    notificationType.value = type;
    notificationRef.value?.show(duration);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => { clearTimeout(timeout); func(...args); };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// --- Map Logic & Autosave ---
const createDefaultMap = () => ({
    nodes: [{ id: "welcome-1", label: t('defaultMap.welcomeNode'), position: {x:0,y:5,z:0}, color: '#ff8800', size: 5, shape: 'sphere' }],
    connections: []
});

const debouncedAutoSave = debounce((data) => {
  if (data) localStorage.setItem('mindmap_autosave', JSON.stringify(data));
}, 1500);

// --- Map Lifecycle & Events ---
const onMapReady = async () => {
  const autoSaveData = localStorage.getItem('mindmap_autosave');
  if (autoSaveData) {
    // ИСПРАВЛЕНО: Передаем имя компонента строкой
    const userConfirmed = await modalStore.open('modals/ConfirmModal', { message: t('confirmations.restoreUnsaved') });
    if (userConfirmed) {
      const restoredData = JSON.parse(autoSaveData);
      mindMapRef.value?.loadNewMap(restoredData);
      lastMapData = restoredData;
      const lastId = localStorage.getItem('mindMapLastLoadedId');
      if(lastId) currentMapId.value = lastId;
      return;
    }
  }
  const lastId = localStorage.getItem('mindMapLastLoadedId');
  if (lastId) {
    await loadMapById(lastId, true);
  } else {
    const defaultMap = createDefaultMap();
    mindMapRef.value?.loadNewMap(defaultMap);
  }
};

const onMapChanged = (data) => {
    lastMapData = data;
    debouncedAutoSave(data);
};

const onModeChanged = (isActive) => {
    isConnectionModeActive.value = isActive;
};

const toggleConnection = () => {
    mindMapRef.value?.toggleConnectionMode();
};

const toggleLines = () => {
    areLinesCurved.value = mindMapRef.value?.toggleLineStyle();
};

// --- Data Persistence (Supabase) ---
async function saveMap() {
    // ИСПРАВЛЕНО: Передаем имя компонента строкой
    const mapName = await modalStore.open('modals/PromptModal', {
      message: t('prompts.enterMapName'),
      defaultValue: currentMapName.value || t('defaultMap.name')
    });
    if (!mapName) return;

    const mapDataToSave = lastMapData || mindMapRef.value?.serializeMapData();
    if (!mapDataToSave) {
      showNotification(t('notifications.errors.noDataToSave'), 'error');
      return;
    }

    const idToSave = (mapName === currentMapName.value && currentMapId.value) ? currentMapId.value : null;

    const { data, error } = await supabase.rpc('save_mind_map', {
        map_name: mapName, map_data: mapDataToSave, map_id: idToSave
    });

    if (error) {
        console.error('Error saving map:', error);
        showNotification(t('notifications.errors.saveFailed', { message: error.message }), 'error');
    } else {
        currentMapId.value = data;
        currentMapName.value = mapName;
        localStorage.setItem('mindMapLastLoadedId', currentMapId.value);
        localStorage.removeItem('mindmap_autosave');
        showNotification(t('notifications.success.mapSaved', { name: mapName }), 'success');
    }
}

async function loadMap() {
    isLoadPanelVisible.value = true;
    const { data: maps, error } = await supabase.rpc('get_my_mind_maps');
    if (error) {
        console.error('Error fetching maps list:', error);
        showNotification(t('notifications.errors.fetchListFailed', { message: error.message }), 'error');
        isLoadPanelVisible.value = false;
        return;
    }
    savedMaps.value = maps || [];
}

async function loadMapById(id, isInitialLoad = false) {
    if (!isInitialLoad && localStorage.getItem('mindmap_autosave')) {
        // ИСПРАВЛЕНО: Передаем имя компонента строкой
        const userConfirmed = await modalStore.open('modals/ConfirmModal', { message: t('confirmations.loseUnsavedChanges') });
        if (!userConfirmed) {
            isLoadPanelVisible.value = false;
            return;
        }
    }
    isLoadPanelVisible.value = false;
    const { data, error } = await supabase.rpc('get_mind_map_data', { map_id: id });

    if (error) {
        console.error('Error loading map data:', error);
        showNotification(t('notifications.errors.loadFailed', { message: error.message }), 'error');
    } else {
        const currentMapInfo = savedMaps.value.find(m => m.id === id) || { name: t('defaultMap.unknownName') };
        currentMapId.value = id;
        currentMapName.value = currentMapInfo.name;
        mindMapRef.value?.loadNewMap(data);
        localStorage.setItem('mindMapLastLoadedId', id);
        localStorage.removeItem('mindmap_autosave');
    }
}

async function deleteMap() {
    if (!currentMapId.value) return;

    // ИСПРАВЛЕНО: Передаем имя компонента строкой
    const userConfirmed = await modalStore.open('modals/ConfirmModal', { message: t('confirmations.deleteMap', { name: currentMapName.value }) });
    if (userConfirmed) {
        const { error } = await supabase.rpc('delete_mind_map', { map_id: currentMapId.value });
        if (error) {
            console.error('Error deleting map:', error);
            showNotification(t('notifications.errors.deleteFailed', { message: error.message }), 'error');
        } else {
            showNotification(t('notifications.success.mapDeleted'), 'success');
            await newMap();
        }
    }
}

async function newMap() {
    const hasUnsavedChanges = localStorage.getItem('mindmap_autosave');
    if (hasUnsavedChanges) {
        // ИСПРАВЛЕНО: Передаем имя компонента строкой
        const userConfirmed = await modalStore.open('modals/ConfirmModal', { message: t('confirmations.startNewMap') });
        if (!userConfirmed) {
            return;
        }
    }
    currentMapId.value = null;
    currentMapName.value = '';
    const defaultMap = createDefaultMap();
    mindMapRef.value?.loadNewMap(defaultMap);
    localStorage.removeItem('mindMapLastLoadedId');
    localStorage.removeItem('mindmap_autosave');
}
</script>

<style scoped>
/* Стили остаются без изменений */
.mind-map-page { width: 100vw; height: 100vh; position: relative; overflow: hidden; background-color: #1a1a1a; }
#ui-panel { position: absolute; top: 10px; left: 10px; z-index: 101; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.btn { padding: 10px 15px; font-size: 16px; cursor: pointer; background-color: #333; color: white; border: 1px solid #555; border-radius: 5px; transition: background-color 0.2s; }
.btn:hover { background-color: #444; }
.btn.active { background-color: #2a643b; border-color: #3c8d53; }
.btn-danger { background-color: #8b2c2c; border-color: #a33e3e; }
.btn-danger:hover { background-color: #a33e3e; }
.panel.load-panel { position: absolute; top: 60px; left: 10px; z-index: 101; background-color: rgba(40, 40, 40, 0.9); border: 1px solid #555; border-radius: 8px; padding: 15px; width: 250px; }
.map-list { display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto; }
.map-list-item { width: 100%; text-align: left; }
.load-panel h3 { margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid #555; padding-bottom: 10px; }
.btn-group { display: flex; }
.btn-group .btn-main { border-top-right-radius: 0; border-bottom-right-radius: 0; }
.btn-group .btn-toggle { border-top-left-radius: 0; border-bottom-left-radius: 0; border-left: none; padding: 8px; }
.btn-toggle svg { display: block; width: 20px; height: 20px; color: #ccc; }
.btn-toggle:hover svg { color: #fff; }
</style>