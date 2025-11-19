<template>
  <div class="page-wrapper">
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
          <div v-show="isProfileOpen" class="profile-drawer-overlay" @click.self="isProfileOpen = false">
            <div class="profile-drawer">
              <button class="close-drawer-btn" @click="isProfileOpen = false" aria-label="Close Profile">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
              </button>
              <div class="profile-content hide-scrollbar">
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
          <div class="user-profile-widget" @click="isProfileOpen = !isProfileOpen" :title="$t('profile_title')">
            <img v-if="avatarUrl" :src="avatarUrl" alt="User Avatar" class="user-avatar" />
            <div v-else class="user-avatar placeholder-avatar">
               <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px" fill="#9ca3af"><path d="M234-276q51-39 114-61.5T480-360q69 0 132 22.5T726-276q35-41 54.5-93T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 69 19.5 121t54.5 93Zm246-164q-59 0-99.5-40.5T340-580q0-59 40.5-99.5T480-720q59 0 99.5 40.5T620-580q0 59-40.5 99.5T480-440Zm0 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q53 0 100-15.5t86-44.5q-39-29-86-44.5T480-280q-53 0-100 15.5T294-220q39 29 86 44.5T480-160Z"/></svg>
            </div>
            
            <span v-if="isAnonymous" class="user-email register-text">{{ $t('signUp') }}</span>
            <span v-else-if="user" class="user-email">{{ user.email }}</span>
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
import { ref, onMounted, onUnmounted } from 'vue';
import { useSupabaseUser } from '#imports'; // Import useSupabaseUser
import { useModalStore } from '~/composables/useModalStore';
import { useI18nService } from '~/composables/useI18nService';
import { useProfile } from '~/composables/useProfile';

const supabase = useSupabaseClient();
const user = useSupabaseUser(); // Get user object
const modalStore = useModalStore();
const { avatarUrl, isAnonymous, init: initProfile } = useProfile();

const isProfileOpen = ref(false);
const skins = ref({ head: null });

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

onUnmounted(() => { window.removeEventListener('resize', setVh); });
</script>

<style scoped>
.page-wrapper {
  display: flex;
  flex-direction: column;
  height: calc(var(--vh, 1vh) * 100);
  background: radial-gradient(circle at center, #1f2937 0%, #111827 100%); /* Restore beautiful dark blue background */
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
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
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

.profile-content {
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