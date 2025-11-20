<template>
  <div class="w-full max-w-lg mx-auto text-gray-200">
    <div v-if="loading" class="text-center p-8">
      <p>{{ $t('loading') }}</p>
    </div>

    <div v-else-if="isAnonymous" class="profile-container">
      <div v-if="showIdentityExistsError" class="border-2 border-yellow-500 bg-yellow-500 bg-opacity-10 p-4 rounded-lg mb-6 text-center">
        <h3 class="text-lg font-bold text-yellow-300 mb-2">{{ $t('profile_identityExistsTitle') }}</h3>
        <p class="text-gray-300 text-sm">{{ $t('profile_identityExistsHint') }}</p>
      </div>

      <div class="relative w-24 h-24 mx-auto mb-6">
        <img :src="avatarUrl" alt="Avatar" class="w-full h-full rounded-full object-cover border-2 border-[#4b5563] bg-gray-700">
      </div>
      
      <h2 class="text-2xl font-bold text-center profile-heading mb-4">{{ $t('profile_saveYourProgress') }}</h2>
      <p class="text-center profile-hint mb-8">{{ $t('profile_createAccountHint') }}</p>
      
      <form @submit.prevent="handleEmailPasswordUpgrade">
        <div class="space-y-4">
          <div>
            <label for="auth-email" class="profile-label">Email</label>
            <input id="auth-email" type="email" v-model="authEmail" required class="profile-input" autocomplete="email" />
          </div>

          <div>
            <div class="flex justify-between items-center mb-1">
              <label for="auth-password" class="profile-label">Password</label>
              <button type="button" @click="handlePasswordReset" class="text-xs profile-hint hover:text-white transition-colors">{{ $t('forgotPassword') }}</button>
            </div>
            <input id="auth-password" type="password" v-model="authPassword" required class="profile-input" autocomplete="new-password" />
          </div>

          <p v-if="authMessage" :class="authMessageType === 'success' ? 'text-green-400' : 'text-red-400'" class="text-center text-sm h-4">
            {{ authMessage }}
          </p>
          <div class="flex items-center gap-4">
            <button type="button" @click="handleEmailPasswordSignIn" class="auth-button">{{ $t('signIn') }}</button>
            <button type="submit" class="auth-button-primary">{{ $t('signUp') }}</button>
          </div>
        </div>
      </form>

      <div class="relative my-6">
        <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-gray-600"></div></div>
        <div class="relative flex justify-center text-sm"><span class="bg-[#1f2937] px-2 text-gray-400">{{ $t('or') }}</span></div>
      </div>

      <button @click="handleGoogleSignIn" class="google-button">
        <svg class="w-5 h-5" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.521-3.344-11.01-7.934l-6.573,5.241C9.373,39.63,16.223,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C39.99,36.51,44,30.84,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>
        {{ $t('signInWithGoogle') }}
      </button>
    </div>

    <div v-else class="profile-container">
      <section class="mb-8">
        <div class="hub-invitation">
          <p class="invitation-text">
            {{ $t('profile_hubInvitation_part1') }}
            <router-link to="/hub" class="font-semibold text-blue-400 hover:underline">
              {{ $t('profile_hubLinkText') }}
            </router-link>
            {{ $t('profile_hubInvitation_part2') }}
          </p>
        </div>
      
      <div class="relative w-24 h-24 mx-auto mb-6">
          <img :src="avatarUrl" alt="Avatar" class="w-full h-full rounded-full object-cover border-2 border-[#3b82f6] bg-gray-700">
          <button @click="randomizeAvatar" class="absolute bottom-0 right-0 bg-[#3b82f6] text-white w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#1f2937] cursor-pointer" :title="$t('profile_randomAvatar')">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.899 2.186l-1.414 1.414A5.002 5.002 0 005.999 7.49l-.496.497a1 1 0 01-1.414 0l-2-2a1 1 0 010-1.414l2-2a1 1 0 011.414 0l.496.497A7.002 7.002 0 014 2.101V3a1 1 0 01-1-1H2a1 1 0 01-1-1V1a1 1 0 011-1h1a1 1 0 011 1v1zM16 17.9a1 1 0 01-1-1v-2.101a7.002 7.002 0 01-11.899-2.186l1.414-1.414A5.002 5.002 0 0014.001 12.51l.496-.497a1 1 0 011.414 0l2 2a1 1 0 010 1.414l-2 2a1 1 0 01-1.414 0l-.496-.497A7.002 7.002 0 0116 17.898V17a1 1 0 011 1h1a1 1 0 011 1v1a1 1 0 01-1 1h-1a1 1 0 01-1-1z" clip-rule="evenodd" /></svg>
          </button>
        </div>
        
        <p v-if="user" class="profile-email">{{ user.email }}</p>
        
        <div class="space-y-4">
          <div>
            <label for="avatarStyle" class="profile-label">{{ $t('profile_style') }}</label>
            <select id="avatarStyle" v-model="avatarConfig.style" class="profile-select">
              <option v-for="style in avatarStyles" :key="style" :value="style">{{ style }}</option>
            </select>
          </div>
          <div>
            <label for="avatarSeed" class="profile-label">{{ $t('profile_seed') }}</label>
            <input id="avatarSeed" type="text" v-model="avatarConfig.seed" class="profile-input" />
          </div>
        </div>
      </section>

      <section class="mb-8">
        <h2 class="profile-section-header">{{ $t('profile_personalData') }}</h2>
        <div v-if="profile" class="space-y-4">
          <div>
            <label for="fullName" class="profile-label">{{ $t('profile_name') }}</label>
            <input id="fullName" type="text" v-model="profile.full_name" class="profile-input" />
          </div>
          <div>
            <label for="age" class="block mb-1 text-sm profile-label">{{ $t('profile_age') }}</label>
            <p class="text-xs profile-hint mb-2 h-4">{{ $t('profile_ageHint') }}</p>
            <div class="flex">
              <button @click="profile.age > 6 ? profile.age-- : null" class="age-button rounded-l-lg" :class="theme === 'light' ? 'bg-[#f3f4f6] border-[#d1d5db] text-[#111827] hover:bg-[#e5e7eb]' : 'bg-[#4b5563] border-[#4b5563] text-white'">-</button>
              <input id="age" type="number" v-model.number="profile.age" min="6" class="w-full p-3 text-center border-y border-x-0 border-[#4b5563] bg-[#374151] profile-input" />
              <button @click="profile.age++" class="age-button rounded-r-lg" :class="theme === 'light' ? 'bg-[#f3f4f6] border-[#d1d5db] text-[#111827] hover:bg-[#e5e7eb]' : 'bg-[#4b5563] border-[#4b5563] text-white'">+</button>
            </div>
          </div>
          <div>
            <label for="language" class="block mb-1 text-sm profile-label">{{ $t('profile_language') }}</label>
            <select id="language" v-model="locale" class="w-full p-3 rounded-lg border border-[#4b5563] bg-[#374151] profile-select">
              <option value="en">English</option> <option value="ru">Русский</option> <option value="es">Español</option>
            </select>
          </div>
          <div>
            <label for="country" class="block mb-1 text-sm profile-label">{{ $t('profile_country') }}</label>
            <p class="text-xs profile-hint mb-2 h-4">{{ $t('profile_countryHint') }}</p>
            <select id="country" v-model="profile.country" class="w-full p-3 rounded-lg border border-[#4b5563] bg-[#374151] profile-select">
              <option value="">{{ $t('profile_countryNotSelected') }}</option>
              <option v-for="country in countries" :key="country.code" :value="country.code">{{ country.name }}</option>
            </select>
          </div>
        </div>
      </section>

      <section class="mb-8">
        <h2 class="profile-section-header">{{ $t('profile_passwordManagement') }}</h2>
        <form @submit.prevent="updatePassword" class="space-y-4">
          <input v-if="user" type="email" :value="user.email" hidden autocomplete="email" />
          
          <div>
            <label for="newPassword" class="profile-label">{{ $t('profile_newPassword') }}</label>
            <p class="profile-hint">{{ $t('profile_passwordHint') }}</p>
            <input id="newPassword" type="password" v-model="newPassword" class="profile-input" autocomplete="new-password" />
          </div>
          <button type="submit" class="w-full bg-[#3b82f6] text-white py-3 px-4 rounded-lg font-semibold transition-colors hover:bg-[#1d4ed8]" :disabled="!newPassword">{{ $t('profile_setPassword') }}</button>
          <p v-if="passwordUpdateMessage" class="text-green-400 text-center mt-2">{{ passwordUpdateMessage }}</p>
        </form>
        <div class="space-y-4 mt-4">
          <div class="relative">
            <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-gray-600"></div></div>
            <div class="relative flex justify-center text-sm"><span class="bg-[#1f2937] px-2 text-gray-400">{{ $t('or') }}</span></div>
          </div>
          <button @click="handleLinkGoogleInProfile" class="google-button">
            <svg class="w-5 h-5" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.521-3.344-11.01-7.934l-6.573,5.241C9.373,39.63,16.223,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C39.99,36.51,44,30.84,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>
            {{ $t('profile_linkGoogle') }}
          </button>
        </div>
      </section>
      
      <section>
        <div class="flex border-b border-[#374151]">
          <button @click="activeTab = 'student'" :class="[activeTab === 'student' ? 'active-tab-button' : 'inactive-tab-button']">{{ $t('profile_iAmStudent') }}</button>
          <button @click="activeTab = 'curator'" :class="[activeTab === 'curator' ? 'active-tab-button' : 'inactive-tab-button']">{{ $t('profile_iAmCurator') }}</button>
        </div>
        
        <RelationList
          v-show="activeTab === 'student'"
          :relations="curators"
          :button-text="$t('profile_addCurator')"
          @add="openModal('curator')"
          @accept="acceptInvitation"
          @delete="deleteRelation"
        />

        <RelationList
          v-show="activeTab === 'curator'"
          :relations="students"
          :button-text="$t('profile_addStudent')"
          @add="openModal('student')"
          @accept="acceptInvitation"
          @delete="deleteRelation"
        />
      </section>

      <section class="mt-8 border-t border-[#374151] pt-6">
        <button @click="handleSignOut" class="logout-button">{{ $t('logout') }}</button>
      </section>
    </div>

    <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50" @click.self="closeModal">
      <div class="bg-[#1f2937] p-8 rounded-xl border border-[#374151] w-11/12 max-w-md">
        <h3 class="text-lg font-bold mb-4">{{ modalTitle }}</h3>
        <div class="space-y-4">
            <div>
              <label for="inviteEmail" class="block mb-1 text-sm text-[#9ca3af]">{{ $t('profile_userEmail') }}</label>
              <input id="inviteEmail" type="email" v-model="inviteEmail" :placeholder="$t('profile_studentEmailPlaceholder')" class="w-full p-3 rounded-lg border border-[#4b5563] bg-[#374151] text-white" autocomplete="email">
            </div>
            <div>
              <label for="relationType" class="block mb-1 text-sm text-[#9ca3af]">{{ $t('profile_relationType') }}</label>
              <select id="relationType" v-model="relationType" class="w-full p-3 rounded-lg border border-[#4b5563] bg-[#374151] text-white">
                  <option value="parent">{{ $t('profile_relationParent') }}</option>
                  <option value="teacher">{{ $t('profile_relationTeacher') }}</option>
              </select>
            </div>
        </div>
        <div class="flex justify-end gap-3 mt-6">
          <button @click="closeModal" class="py-2 px-4 rounded-lg font-semibold bg-[#4b5563] text-white">{{ $t('cancel') }}</button>
          <button @click="sendInvitation" class="py-2 px-4 rounded-lg font-semibold bg-[#3b82f6] text-white">{{ $t('profile_sendInvite') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useSupabaseUser } from '#imports';
import { useI18nService } from '~/composables/useI18nService';
import RelationList from '~/components/RelationList.vue';

import { useAuth } from '~/composables/useAuth';
import { useProfile } from '~/composables/useProfile';
import { useRelations } from '~/composables/useRelations';
import { useTheme } from '~/composables/useTheme'; // Added

const user = useSupabaseUser();
const { locale } = useI18nService();

const {
  authEmail, authPassword, authMessage, authMessageType,
  handleEmailPasswordUpgrade, handleEmailPasswordSignIn, handleGoogleSignIn,
  handleLinkGoogleInProfile, handleSignOut, handlePasswordReset
} = useAuth();

const {
  loadingProfile, profile, newPassword, passwordUpdateMessage,
  avatarConfig, isAnonymous, avatarUrl,
  init: initProfile, updatePassword, randomizeAvatar, fetchProfile
} = useProfile();

const { loadingRelations, students, curators, showModal, modalTitle, inviteEmail, inviteType, relationType, sendInvitation, acceptInvitation, deleteRelation, fetchRelations: loadRelations, openModal, closeModal } = useRelations();

const { theme, toggleTheme } = useTheme();

const loading = computed(() => loadingProfile.value || loadingRelations.value);

const activeTab = ref('student');
const showIdentityExistsError = ref(false);
const avatarStyles = ['adventurer', 'bottts', 'micah', 'miniavs', 'pixel-art', 'lorelei'];
const countries = ref([
    { code: 'RU', name: 'Russia' }, { code: 'US', name: 'USA' }, { code: 'KZ', name: 'Kazakhstan' },
    { code: 'DE', name: 'Germany' }, { code: 'FR', name: 'France' }, { code: 'ES', name: 'Spain' },
]);

onMounted(async () => {
  const hash = window.location.hash;
  if (hash.includes('error_code=identity_already_exists')) {
    showIdentityExistsError.value = true;
    history.pushState("", document.title, window.location.pathname + window.location.search);
  }
  await initProfile();
  if (!isAnonymous.value) {
    await loadRelations();
  }
});
</script>

<style scoped>
.age-button { 
  @apply w-11 border font-bold cursor-pointer transition-colors; 
}
.active-tab-button { @apply bg-transparent text-white border-b-2 border-[#3b82f6] py-3 px-4 font-semibold; }
.inactive-tab-button { @apply bg-transparent text-[#9ca3af] border-b-2 border-transparent py-3 px-4 font-medium; }
#age { -moz-appearance: textfield; }
#age::-webkit-outer-spin-button, #age::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

/* Theme-aware styles */
.profile-container {
  position: relative;
  background-color: var(--bg-secondary);
  padding: 1rem 2rem;
  border-radius: 1rem;
  border: 1px solid var(--border-color);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.hub-invitation {
  text-align: center;
  background-color: var(--bg-tertiary);
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid var(--border-color);
}

.invitation-text {
  color: var(--text-secondary);
}

:global(.light-theme) .profile-container {
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
}

/* Theme Toggle Switch */
.theme-toggle-container {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
  position: relative;
  left: -80px; /* Moved further left */
}

.theme-toggle-switch {
  position: relative;
  display: inline-flex;
  height: 28px;
  width: 56px;
  flex-shrink: 0;
  cursor: pointer;
  border-radius: 9999px;
  border: 2px solid transparent;
  transition: all 0.2s ease-in-out;
  outline: none;
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

/* Theme-aware text and input styles */
.profile-email {
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-top: 0.5rem;
  margin-bottom: 1.5rem;
}

.profile-label {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
  color: var(--text-tertiary);
}

.profile-hint {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  margin-bottom: 0.5rem;
  height: 1rem;
}

.profile-select,
.profile-input {
  width: 100%;
  padding: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  transition: border-color 0.2s, background-color 0.3s, color 0.3s;
}

.profile-select:focus,
.profile-input:focus {
  outline: none;
  border-color: #3b82f6;
}

/* Light theme specific overrides */
:global(.light-theme) .profile-label,
:global(.light-theme) .profile-hint {
  color: #6b7280;
}

:global(.light-theme) .profile-select,
:global(.light-theme) .profile-input {
  background-color: #f9fafb;
  border-color: #d1d5db;
  color: #111827;
}

/* Section headers and headings */
.profile-heading {
  color: var(--text-primary);
}

.profile-section-header {
  font-size: 1.25rem;
  font-weight: 600;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.5rem;
  margin-bottom: 1.5rem;
  text-align: center;
  color: var(--text-primary);
}

/* Tab buttons */
.active-tab-button {
  background: transparent;
  color: var(--text-primary);
  border-bottom: 2px solid #3b82f6;
  padding: 0.75rem 1rem;
  font-weight: 600;
}

.inactive-tab-button {
  background: transparent;
  color: var(--text-tertiary);
  border-bottom: 2px solid transparent;
  padding: 0.75rem 1rem;
  font-weight: 500;
}

/* Google button */
.google-button {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: background-color 0.2s, border-color 0.2s;
  cursor: pointer;
}

.google-button:hover {
  background-color: var(--bg-secondary);
  border-color: var(--border-color-emphasis);
}

:global(.light-theme) .google-button {
  background-color: #f3f4f6;
  border-color: #d1d5db;
}

:global(.light-theme) .google-button:hover {
  background-color: #e5e7eb;
  border-color: #9ca3af;
}

/* Auth buttons for anonymous section */
.auth-button {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  transition: background-color 0.2s;
  cursor: pointer;
}

.auth-button:hover {
  background-color: var(--bg-secondary);
}

.auth-button-primary {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  background-color: #3b82f6;
  color: white;
  transition: background-color 0.2s;
  cursor: pointer;
}

.auth-button-primary:hover {
  background-color: #1d4ed8;
}

:global(.light-theme) .auth-button {
  background-color: #f3f4f6;
  border-color: #d1d5db;
  color: #111827;
}

:global(.light-theme) .auth-button:hover {
  background-color: #e5e7eb;
}

/* Logout button */
.logout-button {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  transition: background-color 0.2s, border-color 0.2s;
  cursor: pointer;
}

.logout-button:hover {
  background-color: var(--bg-secondary);
  border-color: var(--border-color-emphasis);
}

:global(.light-theme) .logout-button {
  background-color: #f3f4f6;
  border-color: #d1d5db;
  color: #111827;
}

:global(.light-theme) .logout-button:hover {
  background-color: #e5e7eb;
  border-color: #9ca3af;
}
</style>