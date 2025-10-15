<template>
  <div class="mind-map-page">
    <div id="ui-panel">
<button @click="newMap" class="btn" :title="$t('ui.buttons.newMap')">
  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
  <span>{{ $t('ui.buttons.newMap') }}</span>
</button>
    <button @click="mindMapRef?.addNode()" class="btn" :title="$t('ui.buttons.addNode')">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span>{{ $t('ui.buttons.addNode') }}</span>
    </button>
    <div class="btn-group">
        <button @click="toggleConnection" :class="{ active: isConnectionModeActive }" class="btn btn-main" :title="$t('ui.buttons.addConnection')">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.5-2.928A9.095 9.095 0 015.25 12.002a3 3 0 00-2.72 4.682.097.097 0 01-.093.107h-.008A9.095 9.095 0 0012 21.75a9.095 9.095 0 006-2.25m-8.588-2.553a9.049 9.049 0 00-3.426-.92A3 3 0 012.25 12c0-1.657 1.343-3 3-3a3 3 0 013 3v.002z" /></svg>
        <span>{{ $t('ui.buttons.addConnection') }}</span>
        </button>
        <button @click="toggleLines" class="btn btn-toggle" :title="$t(lineStyleTooltipKey)">
        <svg v-if="areLinesCurved" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width:20px; height:20px;"><path d="M4 12C4 7.58172 7.58172 4 12 4C16.4183 4 20 7.58172 20 12"/></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width:20px; height:20px;"><path d="M4 12L20 12"/></svg>
        </button>
    </div>
    <button @click="saveMap" class="btn" :title="$t('ui.buttons.save')">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
        <span>{{ $t('ui.buttons.save') }}</span>
    </button>
    <button @click="shareMap" v-if="currentMapId" class="btn" :title="$t('ui.buttons.share')">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.19.022.379.043.57.065a2.25 2.25 0 012.118 2.118l.065.57m-2.186 0a2.25 2.25 0 002.186 0M12 18.75h.008v.008H12v-.008zm0-12.75h.008v.008H12V6zm0 12.75a2.25 2.25 0 01-2.25-2.25v-1.5a2.25 2.25 0 012.25-2.25h1.5a2.25 2.25 0 012.25 2.25v1.5a2.25 2.25 0 01-2.25 2.25h-1.5z" /></svg>
        <span>{{ $t('ui.buttons.share') }}</span>
    </button>
    <button @click="loadMap" class="btn" :title="$t('ui.buttons.load')">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0A2.25 2.25 0 013.75 7.5h16.5a2.25 2.25 0 012.25 2.25m-18.75 0h18.75" /></svg>
        <span>{{ $t('ui.buttons.load') }}</span>
    </button>
    <button @click="deleteMap" v-if="currentMapId" class="btn btn-danger" :title="$t('ui.buttons.deleteMap')">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.067-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
        <span>{{ $t('ui.buttons.deleteMap') }}</span>
    </button>
    </div>
    <MindMap
      ref="mindMapRef"
      @ready="onMapReady"
      @map-changed="onMapChanged"
      @mode-changed="onModeChanged"
    />
    
    <div v-if="isLoadPanelVisible" class="panel load-panel" ref="loadPanelRef">
    <h3>{{ $t('loadPanel.title') }}</h3>
    <div v-if="!savedMaps || savedMaps.length === 0">{{ $t('loadPanel.noMapsFound') }}</div>
    <div v-else class="map-list">
        <button v-for="map in savedMaps" :key="map.id" @click="loadMapById(map.id)" class="btn map-list-item">
        {{ map.name }}
        </button>
    </div>
    </div>

    <Notification 
      ref="notificationRef"
    />
    <ModalWrapper />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MindMap from '~/components/MindMap.vue';
import Notification from '~/components/Notification.vue';
import { useModalStore } from '~/composables/useModalStore';
import { debounce } from '~/utils/debounce';

// --- Composables ---
const supabase = useSupabaseClient();
const { t } = useI18n();
const modalStore = useModalStore();
const route = useRoute();
const router = useRouter();

// --- Component Refs ---
const mindMapRef = ref(null);
const notificationRef = ref(null);

// --- State ---
const isConnectionModeActive = ref(false);
const areLinesCurved = ref(true);
const currentMapId = ref(null);
const currentMapName = ref('');
const isLoadPanelVisible = ref(false);
const loadPanelRef = ref(null);
const savedMaps = ref([]);
let lastMapData = null;

// --- Computed ---
const lineStyleTooltipKey = computed(() => areLinesCurved.value ? 'ui.tooltips.switchToStraight' : 'ui.tooltips.switchToCurved');

// --- UI Helpers ---
function showNotification(options) {
  notificationRef.value?.show(options);
}

// --- Map Logic & Autosave ---
const createDefaultMap = () => ({
    nodes: [{ id: "welcome-1", label: t('defaultMap.welcomeNode'), position: {x:0,y:5,z:0}, color: '#ff8800', size: 5, shape: 'sphere' }],
    connections: []
});
const handleClickOutsideLoadPanel = (event) => {
  if (loadPanelRef.value && !loadPanelRef.value.contains(event.target)) {
    isLoadPanelVisible.value = false;
  }
};
watch(isLoadPanelVisible, (isVisible) => {
  if (isVisible) {
    // Когда панель открывается, добавляем слушатель
    document.addEventListener('mousedown', handleClickOutsideLoadPanel);
  } else {
    // Когда панель закрывается, убираем слушатель, чтобы не нагружать браузер
    document.removeEventListener('mousedown', handleClickOutsideLoadPanel);
  }
});
const debouncedAutoSave = debounce((data) => {
  if (data) localStorage.setItem('mindmap_autosave', JSON.stringify(data));
}, 1500);

// --- Map Lifecycle & Events ---
onMounted(async () => {
  const autoSaveData = localStorage.getItem('mindmap_autosave');
  if (autoSaveData) {
    localStorage.setItem('mindmap_autosave_backup', autoSaveData);
    localStorage.removeItem('mindmap_autosave');
  }

  if (route.params.public_id) {
    await loadPublicMap(route.params.public_id);
  } else {
    // Default behavior: start with a new map
    mindMapRef.value?.loadNewMap(createDefaultMap());
  }

  const backupData = localStorage.getItem('mindmap_autosave_backup');
  if (backupData) {
    const restoreAction = () => {
      try {
        const restoredData = JSON.parse(backupData);
        mindMapRef.value?.loadNewMap(restoredData);
        lastMapData = restoredData;
        showNotification({ message: t('notifications.success.restored'), type: 'success' });
        localStorage.removeItem('mindmap_autosave_backup');
      } catch (e) {
        showNotification({ message: t('notifications.errors.restoreFailed'), type: 'error' });
      }
    };
    showNotification({
      message: t('confirmations.restoreUnsaved'),
      type: 'action',
      duration: 20000,
      action: {
        callback: restoreAction,
        text: t('ui.buttons.restore')
      }
    });
  }
});

const onMapReady = () => {
  // Logic from the original component is now handled in onMounted.
  // This can be kept for any future logic that needs the canvas to be ready.
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
    const newMapName = await modalStore.open('modals/PromptModal', {
      message: t('prompts.enterMapName'),
      defaultValue: currentMapName.value || t('defaultMap.name')
    });
    if (!newMapName) return;

    const mapDataToSave = lastMapData || mindMapRef.value?.serializeMapData();
    if (!mapDataToSave) {
      showNotification({ message: t('notifications.errors.noDataToSave'), type: 'error' });
      return;
    }
    
    const isSaveAs = (currentMapId.value === null) || (newMapName !== currentMapName.value);
    const idToSave = isSaveAs ? null : currentMapId.value;

    const { data: savedMapId, error } = await supabase.rpc('save_mind_map', {
        map_id: idToSave,
        map_name: newMapName, 
        map_data: mapDataToSave
    });

    if (error) {
        console.error('Error saving map:', error);
        showNotification({ message: t('notifications.errors.saveFailed', { message: error.message }), type: 'error' });
    } else {
        currentMapId.value = savedMapId;
        currentMapName.value = newMapName;
        localStorage.setItem('mindMapLastLoadedId', currentMapId.value);
        localStorage.removeItem('mindmap_autosave_backup');
        localStorage.removeItem('mindmap_autosave');
        showNotification({ message: t('notifications.success.mapSaved', { name: newMapName }), type: 'success' });
        
        if (route.params.public_id) {
            router.push('/mindmap');
        }
    }
}

async function shareMap() {
    if (!currentMapId.value) {
      showNotification({ message: t('notifications.errors.saveBeforeShare'), type: 'error' });
      return;
    }
    const { data: publicId, error } = await supabase.rpc('publish_map', {
      map_id_to_publish: currentMapId.value
    });
    if (error) {
      showNotification({ message: t('notifications.errors.shareFailed', { message: error.message }), type: 'error' });
      return;
    }
    const shareUrl = `${window.location.origin}/mindmap/${publicId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      showNotification({ message: t('notifications.success.linkCopied'), type: 'success' });
    } catch (err) {
      await modalStore.open('modals/AlertModal', { message: t('notifications.info.copyManually'), content: shareUrl });
    }
}

async function loadMap() {
    isLoadPanelVisible.value = true;
    const { data: maps, error } = await supabase.rpc('get_my_mind_maps');
    if (error) {
        showNotification({ message: t('notifications.errors.fetchListFailed', { message: error.message }), type: 'error' });
        isLoadPanelVisible.value = false;
        return;
    }
    savedMaps.value = maps || [];
}

async function loadMapById(id, isInitialLoad = false) {
    if (!isInitialLoad && localStorage.getItem('mindmap_autosave_backup')) {
        const userConfirmed = await modalStore.open('modals/ConfirmModal', { message: t('confirmations.loseUnsavedChanges') });
        if (!userConfirmed) {
            isLoadPanelVisible.value = false;
            return;
        }
    }
    isLoadPanelVisible.value = false;
    const { data, error } = await supabase.rpc('get_mind_map_data', { map_id: id });

    if (error) {
        showNotification({ message: t('notifications.errors.loadFailed', { message: error.message }), type: 'error' });
    } else {
        const currentMapInfo = savedMaps.value.find(m => m.id === id) || { name: '' };
        currentMapId.value = id;
        currentMapName.value = currentMapInfo.name;
        mindMapRef.value?.loadNewMap(data); // Corrected data access
        localStorage.setItem('mindMapLastLoadedId', id);
        localStorage.removeItem('mindmap_autosave_backup');
        localStorage.removeItem('mindmap_autosave');
    }
}

async function loadPublicMap(publicId) {
  const { data, error } = await supabase
    .rpc('get_public_mind_map', { map_public_id: publicId })
    .single();
  
  if (error || !data) {
    console.error('Error loading shared map:', error);
    showNotification({ 
      message: t('notifications.errors.mapNotFound'), 
      type: 'error' 
    });
    mindMapRef.value?.loadNewMap(createDefaultMap());
  } else {
    mindMapRef.value?.loadNewMap(data.map_data); // Важно: данные теперь приходят как { map_data: ..., name: ... }
    currentMapName.value = data.name;
    currentMapId.value = null; 
    showNotification({
      message: t('notifications.success.publicMapLoaded', { name: data.name }),
      type: 'success'
    });
  }
}

async function deleteMap() {
    if (!currentMapId.value) return;
    const userConfirmed = await modalStore.open('modals/ConfirmModal', { message: t('confirmations.deleteMap', { name: currentMapName.value }) });
    if (userConfirmed) {
        const { error } = await supabase.rpc('delete_mind_map', { map_id: currentMapId.value });
        if (error) {
            showNotification({ message: t('notifications.errors.deleteFailed', { message: error.message }), type: 'error' });
        } else {
            showNotification({ message: t('notifications.success.mapDeleted'), type: 'success' });
            await newMap();
        }
    }
}

async function newMap() {
    const hasUnsavedChanges = localStorage.getItem('mindmap_autosave_backup');
    if (hasUnsavedChanges) {
        const userConfirmed = await modalStore.open('modals/ConfirmModal', { message: t('confirmations.startNewMap') });
        if (!userConfirmed) {
            return;
        }
    }
    currentMapId.value = null;
    currentMapName.value = '';
    mindMapRef.value?.loadNewMap(createDefaultMap());
    localStorage.removeItem('mindMapLastLoadedId');
    localStorage.removeItem('mindmap_autosave_backup');
    localStorage.removeItem('mindmap_autosave');
}
</script>

<style scoped>
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

.btn svg {
  display: none; /* Иконки по умолчанию скрыты */
  width: 20px;
  height: 20px;
}

.btn span {
  display: inline-block; /* Текст по умолчанию видим */
}

/* Адаптивность для мобильных устройств */
@media (max-width: 768px) {
  #ui-panel {
    gap: 5px; /* Уменьшаем расстояние между кнопками */
  }

  .btn {
    padding: 10px; /* Делаем кнопки компактнее */
    min-width: 44px; /* Устанавливаем минимальную ширину для удобного нажатия */
  }

  .btn span {
    display: none; /* Скрываем текст */
  }

  .btn svg {
    display: block; /* Показываем иконки */
    margin: 0 auto;
  }
  
  .btn-group .btn-main span {
    display: none;
  }
  
  .btn-group .btn-main svg {
    display: block;
  }

  .btn-group .btn-toggle {
    padding: 10px; /* Синхронизируем паддинг */
  }
}
</style>