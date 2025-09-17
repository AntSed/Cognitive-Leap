<template>
  <div class="app-container">
    <!-- Main content area -->
    <main class="main-content">
      <!-- A single container for all switchable views -->
      <div v-if="skins.length > 0" class="view-container">
        <!-- The Tree Visualizer (navigation_mode: 1) loads immediately -->
        <Visualizer v-show="activeComponent === 1" :skin="skins[0]" />
        
        <!-- The Head Visualizer (navigation_mode: 2) loads after a delay to speed up the initial start -->
        <Visualizer v-if="isHeadReady" v-show="activeComponent === 2" :skin="skins[1]" />
        
        <!-- The Profile component -->
        <TheProfile v-show="activeComponent === 3" />
      </div>
      
      <!-- Loading placeholder until skins are fetched -->
      <div v-else class="component-placeholder">{{ $t('loading') }}</div>
    </main>

    <!-- Navigation bar -->
    <nav v-if="skins.length > 0" class="app-nav">
      <button 
        @click="activeComponent = 1" 
        :class="{ active: activeComponent === 1 }"
        :aria-label="$t('tree')"
        :title="$t('tree')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m380-300 280-180-280-180v360ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>
      </button>
      <button 
        @click="activeComponent = 2" 
        :class="{ active: activeComponent === 2 }"
        :aria-label="$t('head')"
        :title="$t('head')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M323-160q-11 0-20.5-5.5T288-181l-78-139h58l40 80h92v-40h-68l-40-80H188l-57-100q-2-5-3.5-10t-1.5-10q0-4 5-20l57-100h104l40-80h68v-40h-92l-40 80h-58l78-139q5-10 14.5-15.5T323-800h97q17 0 28.5 11.5T460-760v160h-60l-40 40h100v120h-88l-40-80h-92l-40 40h108l40 80h112v200q0 17-11.5 28.5T420-160h-97Zm217 0q-17 0-28.5-11.5T500-200v-200h112l40-80h108l-40-40h-92l-40 80h-88v-120h100l-40-40h-60v-160q0-17 11.5-28.5T540-800h97q11 0 20.5 5.5T672-779l78 139h-58l-40-80h-92v40h68l40 80h104l57 100q2 5 3.5 10t1.5 10q0 4-5 20l-57 100H668l-40 80h-68v40h92l40-80h58l-78 139q-5 10-14.5 15.5T637-160h-97Z"/></svg>
      </button>
      <button 
        @click="activeComponent = 3" 
        :class="{ active: activeComponent === 3 }"
        :aria-label="$t('profile_title')"
        :title="$t('profile_title')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M720-240q25 0 42.5-17.5T780-300q0-25-17.5-42.5T720-360q-25 0-42.5 17.5T660-300q0 25 17.5 42.5T720-240Zm0 120q32 0 57-14t42-39q-20-16-45.5-23.5T720-204q-28 0-53.5 7.5T621-173q17 25 42 39t57 14Zm-520 0q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v268q-19-9-39-15.5t-41-9.5v-243H200v560h242q3 22 9.5 42t15.5 38H200Zm0-120v40-560 243-3 280Zm80-40h163q3-21 9.5-41t14.5-39H280v80Zm0-160h244q32-30 71.5-50t84.5-27v-3H280v80Zm0-160h400v-80H280v80ZM720-40q-83 0-141.5-58.5T520-240q0-83 58.5-141.5T720-440q83 0 141.5 58.5T920-240q0 83-58.5 141.5T720-40Z"/></svg>
      </button>
      
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
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router'; 
import Visualizer from '~/components/Visualizer.client.vue';
import TheProfile from '~/components/TheProfile.client.vue';
import LessonModal from '~/components/LessonModal.client.vue';
import { useI18n } from 'vue-i18n';
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

// --- КОМПОЗАБЛЫ ---
const { locale, setLocale, t } = useI18n();
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const route = useRoute();

// --- СОСТОЯНИЕ КОМПОНЕНТА ---
const skins = ref([]);
const activeComponent = ref(1);
const isHeadReady = ref(false);

// --- ЛОГИКА ПРИ МОНТИРОВАНИИ ---
onMounted(async () => {
  if (route.query.view === 'profile') {
    activeComponent.value = 3;
  }
  if (!user.value) {
    await supabase.auth.signInAnonymously();
  }

  // 2. Загружаем скины
  const { data, error } = await supabase.from('skins').select('*').order('navigation_mode');
  if (error) {
    console.error("Could not fetch skins:", error);
    return;
  }
  skins.value = data;

  // 3. Устанавливаем таймер для ленивой загрузки
  setTimeout(() => {
    isHeadReady.value = true;
  }, 2000);
});

// --- МЕТОДЫ ---
const languages = ['en', 'ru', 'es'];
const cycleLanguage = () => {
    const currentIndex = languages.indexOf(locale.value);
    const nextIndex = (currentIndex + 1) % languages.length;
    // ИЗМЕНЕНИЕ: setLocale сам вызовет "наблюдателя" в TheProfile,
    // который сохранит язык в базу данных, если пользователь не анонимный.
    // Нам здесь больше ничего делать не нужно.
    setLocale(languages[nextIndex]);
};
</script>
