<template>
  <div class="page-wrapper" :class="bgClass">
    <main class="main-content">
      <div v-if="skins.head" class="view-container">
        <!-- Persistent SceneKit Layer (z-index: 0) -->
        <div class="scenekit-wrapper">
          <ClientOnly>
            <SceneKit
              :skin-id="skins.head"
              :is-active="true"
            />
            <template #fallback>
              <div class="component-placeholder"></div>
            </template>
          </ClientOnly>
        </div>

        <!-- Profile Drawer Layer (z-index: 20) -->
        <Transition name="slide-right">
          <div v-show="isProfileOpen" class="profile-drawer-overlay" @pointerdown.self="closeProfile">
            <div class="profile-drawer">
              <div class="profile-content hide-scrollbar">
                <button 
                  @click="toggleTheme" 
                  class="theme-toggle-switch"
                  :class="theme === 'light' ? 'theme-light' : 'theme-dark'"
                  role="switch"
                  :aria-checked="theme === 'light'"
                  :title="theme === 'dark' ? 'Switch to Day Mode' : 'Switch to Night Mode'"
                >
                  <span class="toggle-slider">
                    <svg v-if="theme === 'dark'" class="toggle-icon" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
                    </svg>
                    <svg v-else class="toggle-icon" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"/>
                    </svg>
                  </span>
                </button>
                <button class="close-drawer-btn" @click="closeProfile" aria-label="Close Profile">
                  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
                </button>
                <ClientOnly>
                  <TheProfile />
                  <template #fallback>
                    <div class="component-placeholder"></div>
                  </template>
                </ClientOnly>
              </div>
            </div>
          </div>
        </Transition>

        <!-- UI Layer (z-index: 30) -->
        <div class="ui-layer">
          <div class="user-profile-widget" @click="openProfile" :title="$t('profile_title')">
            <img v-if="avatarUrl" :src="avatarUrl" alt="User Avatar" class="user-avatar" />
            <div v-else class="user-avatar placeholder-avatar">
               <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px" fill="#9ca3af"><path d="M234-276q51-39 114-61.5T480-360q69 0 132 22.5T726-276q35-41 54.5-93T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 69 19.5 121t54.5 93Zm246-164q-59 0-99.5-40.5T340-580q0-59 40.5-99.5T480-720q59 0 99.5 40.5T620-580q0 59-40.5 99.5T480-440Zm0 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q53 0 100-15.5t86-44.5q-39-29-86-44.5T480-280q-53 0-100 15.5T294-220q39 29 86 44.5T480-160Z"/></svg>
            </div>
            
            <span v-if="isAnonymous" class="user-email register-text">{{ $t('signUp') }}</span>
            <span v-else-if="user" class="user-email-text">{{ user.email }}</span>
          </div>
        </div>

      </div>
      <div v-else class="component-placeholder"></div>
    </main>

    <ModalWrapper />
    <ClientOnly>
      <QuickTip :is-play-active="true" />
    </ClientOnly>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useSupabaseUser } from '#imports'; // Import useSupabaseUser
import { useModalStore } from '~/composables/useModalStore';
import { useI18nService } from '~/composables/useI18nService';
import { useProfile } from '~/composables/useProfile';
import { useTheme } from '~/composables/useTheme';

const supabase = useSupabaseClient();
const user = useSupabaseUser(); // Get user object
const modalStore = useModalStore();
const { avatarUrl, isAnonymous, init: initProfile } = useProfile();
  const { theme, toggleTheme } = useTheme();


const isProfileOpen = ref(false);
const skins = ref({ head: null });

const bgClass = computed(() => theme.value === 'light' ? 'bg-light' : 'bg-dark');

const setVh = () => { document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`); };

onMounted(async () => {
  setVh();
  window.addEventListener('resize', setVh);
  try {
    const { data, error } = await supabase.from('skins').select('id, name').eq('name', 'head').single();
    if (error) throw error;
    if (data) { skins.value.head = data.id; }
  } catch (error) { console.error("Could not fetch 'head' skin:", error); }
  
  await initProfile();
});

const openProfile = () => {
  isProfileOpen.value = true;
  history.pushState({ profileOpen: true }, '');
  window.addEventListener('keydown', handleEsc);
  window.addEventListener('popstate', handlePopState);
};

const closeProfile = () => {
  if (isProfileOpen.value) {
    history.back();
  }
};

const handleEsc = (e) => {
  if (e.key === 'Escape') {
    closeProfile();
  }
};

const handlePopState = () => {
  isProfileOpen.value = false;
  window.removeEventListener('keydown', handleEsc);
  window.removeEventListener('popstate', handlePopState);
};

onUnmounted(() => { window.removeEventListener('resize', setVh); });
</script>

<style scoped>
.page-wrapper {
  display: flex;
  flex-direction: column;
  height: calc(var(--vh, 1vh) * 100);
  transition: background 0.3s ease;
}

.page-wrapper.bg-dark {
  background: radial-gradient(circle at center, #1f2937 0%, #111827 100%);
}

.page-wrapper.bg-light {
  background-color: #ffffff;
  background-image: 
    linear-gradient(#e5e7eb 1px, transparent 1px),
    linear-gradient(90deg, #e5e7eb 1px, transparent 1px);
  background-size: 40px 40px;
}

.main-content {
  flex-grow: 1;
  position: relative; 
  overflow: hidden;
}

.view-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.scenekit-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

/* UI Layer */
.ui-layer {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 30;
}

/* Hub-style Avatar Widget */
.user-profile-widget {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
  /* Auto width to fit "Register", but max-width for email will be handled on the text element */
  width: auto;
  background: transparent;
  padding: 10px;
  border-radius: 12px;
  transition: transform 0.3s;
}

.user-profile-widget:hover {
  transform: translateY(-2px);
}

.user-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  /* Lighter semi-transparent border and background */
  border: 3px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
  object-fit: cover;
  /* Lighter background (more visible than 0.1, but not full white) */
  background-color: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(4px);
  transition: all 0.2s ease;
}

.placeholder-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.9);
}

.user-profile-widget:hover .user-avatar {
  transform: scale(1.05);
  border-color: rgba(255, 255, 255, 0.6);
  background-color: rgba(255, 255, 255, 0.35);
  box-shadow: 0 6px 20px rgba(0,0,0,0.4);
}

.user-email {
  display: block;
  font-size: 0.75rem;
  font-weight: 500;
  color: #e5e7eb;
  text-align: center;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  
  /* Truncate email only */
  max-width: 145px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-email-text {
  font-size: 0.75rem;
  color: var(--text-secondary);
  max-width: 145px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.register-text {
  color: #60a5fa;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  /* Allow full width for "Register" */
  max-width: none;
  white-space: nowrap;
}

.register-text:hover {
  text-decoration: underline;
  color: #93c5fd;
}

/* Profile Drawer */
.profile-drawer-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 40; /* Ensure it covers the UI layer (z-index: 30) */
  background: rgba(0, 0, 0, 0.5); /* Dim background */
  display: flex;
  justify-content: flex-end;
}

.profile-drawer {
  width: 100%;
  max-width: 500px; /* Adjust as needed */
  height: 100%;
  background: #111827; /* Dark background matching app theme */
  border-left: 1px solid #374151;
  box-shadow: -5px 0 25px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  position: relative;
}

.close-drawer-btn {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  z-index: 25;
  padding: 5px;
  border-radius: 50%;
  transition: color 0.2s;
}

.close-drawer-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

/* Theme Toggle Switch */
.theme-toggle-switch {
  position: absolute;
  top: 15px;
  left: 15px;
  display: inline-flex;
  height: 28px;
  width: 56px;
  flex-shrink: 0;
  cursor: pointer;
  border-radius: 9999px;
  border: 2px solid transparent;
  transition: all 0.2s ease-in-out;
  outline: none;
  z-index: 25;
}

.theme-toggle-switch.theme-dark {
  background-color: #4b5563;
}

.theme-toggle-switch.theme-light {
  background-color: #3b82f6;
}

.theme-toggle-switch:hover {
  opacity: 0.9;
}

.theme-toggle-switch:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.toggle-slider {
  pointer-events: none;
  display: inline-block;
  height: 24px;
  width: 24px;
  transform: translateX(0);
  border-radius: 9999px;
  background-color: white;
  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease-in-out;
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-light .toggle-slider {
  transform: translateX(28px);
}

.toggle-icon {
  width: 14px;
  height: 14px;
  color: #6b7280;
}

.theme-light .toggle-icon {
  color: #f59e0b;
}

.theme-dark .toggle-icon {
  color: #60a5fa;
}

.profile-content {
  position: relative;
  flex-grow: 1;
  overflow-y: auto;
  padding: 20px;
  padding-top: 60px; /* Space for close button */
}

/* Transitions */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: opacity 0.3s ease;
}

.slide-right-enter-from,
.slide-right-leave-to {
  opacity: 0;
}

.slide-right-enter-active .profile-drawer,
.slide-right-leave-active .profile-drawer {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-right-enter-from .profile-drawer,
.slide-right-leave-to .profile-drawer {
  transform: translateX(100%);
}

.hide-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>