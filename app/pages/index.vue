<template>
  <div class="app-container">
    <main class="main-content">
      <div v-if="skins.head" class="view-container">
        
        <div v-show="activeComponent === 1" class="text-page-wrapper">
          <TextPage />
        </div>
        <SceneKit 
          v-show="activeComponent === 2" 
          :skin-id="skins.head" 
          :is-active="activeComponent === 2"
        />
        <div v-show="activeComponent === 3" class="profile-wrapper">
          <TheProfile />
        </div>

      </div>
      <div v-else class="component-placeholder">{{ $t('loading') }}</div>
      
    </main>

    <nav v-if="skins.head" class="app-nav">
      <div class="nav-main-actions">
        <button @click="activeComponent = 1" :class="{ active: activeComponent === 1 }" :aria-label="$t('about_project')" :title="$t('about_project')">
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm80-160h400v-80H280v80Zm0-160h400v-80H280v80Z"/></svg>
        </button>
        <button @click="activeComponent = 2" :class="{ active: activeComponent === 2 }" :aria-label="$t('head')" :title="$t('head')">
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M323-160q-11 0-20.5-5.5T288-181l-78-139h58l40 80h92v-40h-68l-40-80H188l-57-100q-2-5-3.5-10t-1.5-10q0-4 5-20l57-100h104l40-80h68v-40h-92l-40 80h-58l78-139q5-10 14.5-15.5T323-800h97q17 0 28.5 11.5T460-760v160h-60l-40 40h100v120h-88l-40-80h-92l-40 40h108l40 80h112v200q0 17-11.5 28.5T420-160h-97Zm217 0q-17 0-28.5-11.5T500-200v-200h112l40-80h108l-40-40h-92l-40 80h-88v-120h100l-40-40h-60v-160q0-17 11.5-28.5T540-800h97q11 0 20.5 5.5T672-779l78 139h-58l-40-80h-92v40h68l40 80h104l57 100q2 5 3.5 10t1.5 10q0 4-5 20l-57 100H668l-40 80h-68v40h92l40-80h58l-78 139q-5 10-14.5-15.5T637-160h-97Z"/></svg>
        </button>
        <button @click="activeComponent = 3" :class="{ active: activeComponent === 3 }" :aria-label="$t('profile_title')" :title="$t('profile_title')">
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M720-240q25 0 42.5-17.5T780-300q0-25-17.5-42.5T720-360q-25 0-42.5 17.5T660-300q0 25 17.5 42.5T720-240Zm0 120q32 0 57-14t42-39q-20-16-45.5-23.5T720-204q-28 0-53.5 7.5T621-173q17 25 42 39t57 14Zm-520 0q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v268q-19-9-39-15.5t-41-9.5v-243H200v560h242q3 22 9.5 42t15.5 38H200Zm0-120v40-560 243-3 280Zm80-40h163q3-21 9.5-41t14.5-39H280v80Zm0-160h244q32-30 71.5-50t84.5-27v-3H280v80Zm0-160h400v-80H280v80ZM720-40q-83 0-141.5-58.5T520-240q0-83 58.5-141.5T720-440q83 0 141.5 58.5T920-240q0 83-58.5 141.5T720-40Z"/></svg>
        </button>
      </div>
      <div class="language-switcher">
        <button @click="cycleLanguage" :title="$t('changeLanguage')">
          {{ locale.toUpperCase() }}
        </button>
      </div>
    </nav>

    <LessonModal />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'; 
import { useI18n } from 'vue-i18n';
import SceneKit from '~/components/SceneKit.client.vue';
import TheProfile from '~/components/TheProfile.client.vue';
import TextPage from '~/components/TextPage.client.vue';
import LessonModal from '~/components/LessonModal.client.vue'; 


const setVh = () => {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
}

onMounted(() => {
  setVh(); 
  window.addEventListener('resize', setVh); 
});

onUnmounted(() => {
  window.removeEventListener('resize', setVh);
});


const { locale, setLocale } = useI18n();
const supabase = useSupabaseClient();
const user = useSupabaseUser();

const skins = ref({ head: null });
const activeComponent = ref(2); 

onMounted(async () => {
  if (!user.value) { 
    try {
      await supabase.auth.signInAnonymously(); 
    } catch(e) {
      console.error("Anonymous sign-in failed:", e);
    }
  }

  try {
    const { data, error } = await supabase.from('skins').select('id, name').eq('name', 'head').single();
    if (error) throw error;
    
    if (data) {
      skins.value.head = data.id;
    }

  } catch (error) {
    console.error("Could not fetch 'head' skin:", error);
  }
});

const languages = ['en', 'ru', 'es']; 
const cycleLanguage = () => {
  const currentIndex = languages.indexOf(locale.value);
  const nextIndex = (currentIndex + 1) % languages.length;
  setLocale(languages[nextIndex]);
};
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  width: 100vw;
  overflow: hidden; 
  position: relative;
  height: 100vh; 
  height: calc(var(--vh, 1vh) * 100);
}

.main-content {
  flex-grow: 1;
  position: relative;
  overflow: hidden;
}


.view-container,
.profile-wrapper,
.text-page-wrapper {
  width: 100%;
  height: 100%;
}

.app-nav {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between; 
  align-items: center;
  width: 100%;
  padding: 8px 10px;
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
  border-top: 1px solid #333;
  box-sizing: border-box;
}

.nav-main-actions {
  display: flex;
  justify-content: space-around;
  flex-grow: 1;
}


.app-nav button {
  background: none;
  border: none;
  color: #a0a0a0;
  padding: 8px;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s, color 0.2s;
}

.app-nav button:hover {
  color: #fff;
}

.app-nav button.active {
  color: #fff;
  background-color: #333;
}

.app-nav button svg {
  width: 28px;
  height: 28px;
}

.language-switcher button {
  font-weight: bold;
  font-size: 14px;
  min-width: 44px;
}
</style>