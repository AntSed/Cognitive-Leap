<template>
  <div class="w-full max-w-lg mx-auto text-gray-200">
    <div v-if="loading" class="text-center p-8">
      <p>{{ $t('loading') }}</p>
    </div>

    <div v-else-if="isAnonymous" class="bg-[#1f2937] p-8 rounded-2xl border border-[#374151] shadow-2xl">
      <div v-if="showIdentityExistsError" class="border-2 border-yellow-500 bg-yellow-500 bg-opacity-10 p-4 rounded-lg mb-6 text-center">
        <h3 class="text-lg font-bold text-yellow-300 mb-2">{{ $t('profile_identityExistsTitle') }}</h3>
        <p class="text-gray-300 text-sm">{{ $t('profile_identityExistsHint') }}</p>
      </div>

      <div class="relative w-24 h-24 mx-auto mb-6">
        <img :src="avatarUrl" alt="Avatar" class="w-full h-full rounded-full object-cover border-2 border-[#4b5563] bg-gray-700">
      </div>
      <h2 class="text-2xl font-bold text-center text-white mb-4">{{ $t('profile_saveYourProgress') }}</h2>
      <p class="text-center text-gray-400 mb-8">{{ $t('profile_createAccountHint') }}</p>
      
      <form @submit.prevent="handleEmailPasswordUpgrade">
        <div class="space-y-4">
          <div>
            <label for="auth-email" class="block mb-1 text-sm text-[#9ca3af]">Email</label>
            <input id="auth-email" type="email" v-model="authEmail" required class="w-full p-3 rounded-lg border border-[#4b5563] bg-[#374151] text-white" autocomplete="email" />
          </div>

          <div>
            <div class="flex justify-between items-center mb-1">
              <label for="auth-password" class="block text-sm text-[#9ca3af]">Password</label>
              <button type="button" @click="handlePasswordReset" class="text-xs text-[#9ca3af] hover:text-white transition-colors">{{ $t('forgotPassword') }}</button>
            </div>
            <input id="auth-password" type="password" v-model="authPassword" required class="w-full p-3 rounded-lg border border-[#4b5563] bg-[#374151] text-white" autocomplete="new-password" />
          </div>

          <p v-if="authMessage" :class="authMessageType === 'success' ? 'text-green-400' : 'text-red-400'" class="text-center text-sm h-4">
            {{ authMessage }}
          </p>
          <div class="flex items-center gap-4">
            <button type="button" @click="handleEmailPasswordSignIn" class="w-full py-3 px-4 rounded-lg font-semibold text-white bg-[#4b5563] hover:bg-[#6b7280]">{{ $t('signIn') }}</button>
            <button type="submit" class="w-full py-3 px-4 rounded-lg font-semibold text-white bg-[#3b82f6] hover:bg-[#1d4ed8]">{{ $t('signUp') }}</button>
          </div>
        </div>
      </form>

      <div class="relative my-6">
        <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-gray-600"></div></div>
        <div class="relative flex justify-center text-sm"><span class="bg-[#1f2937] px-2 text-gray-400">{{ $t('or') }}</span></div>
      </div>

      <button @click="handleGoogleSignIn" class="w-full py-3 px-4 rounded-lg font-semibold text-white bg-[#4b5563] hover:bg-[#6b7280] flex items-center justify-center gap-2">
        <svg class="w-5 h-5" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.521-3.344-11.01-7.934l-6.573,5.241C9.373,39.63,16.223,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C39.99,36.51,44,30.84,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>
        {{ $t('signInWithGoogle') }}
      </button>
    </div>

    <div v-else class="bg-[#1f2937] p-4 sm:p-8 rounded-2xl border border-[#374151] shadow-2xl">
      <section class="mb-8">
        <div class="text-center bg-gray-800/50 p-4 rounded-lg mb-6 border border-gray-700">
          <i18n-t keypath="profile_hubInvitation" tag="p" class="text-gray-300">
            <template #link>
              <router-link to="/hub" class="font-semibold text-blue-400 hover:underline">
                {{ $t('profile_hubLinkText') }}
              </router-link>
            </template>
          </i18n-t>
        </div>
        <div class="relative w-24 h-24 mx-auto mb-6">
          <img :src="avatarUrl" alt="Avatar" class="w-full h-full rounded-full object-cover border-2 border-[#3b82f6] bg-gray-700">
          <button @click="randomizeAvatar" class="absolute bottom-0 right-0 bg-[#3b82f6] text-white w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#1f2937] cursor-pointer" :title="$t('profile_randomAvatar')">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.899 2.186l-1.414 1.414A5.002 5.002 0 005.999 7.49l-.496.497a1 1 0 01-1.414 0l-2-2a1 1 0 010-1.414l2-2a1 1 0 011.414 0l.496.497A7.002 7.002 0 014 2.101V3a1 1 0 01-1-1H2a1 1 0 01-1-1V1a1 1 0 011-1h1a1 1 0 011 1v1zM16 17.9a1 1 0 01-1-1v-2.101a7.002 7.002 0 01-11.899-2.186l1.414-1.414A5.002 5.002 0 0014.001 12.51l.496-.497a1 1 0 011.414 0l2 2a1 1 0 010 1.414l-2 2a1 1 0 01-1.414 0l-.496-.497A7.002 7.002 0 0116 17.898V17a1 1 0 011 1h1a1 1 0 011 1v1a1 1 0 01-1 1h-1a1 1 0 01-1-1z" clip-rule="evenodd" /></svg>
          </button>
        </div>
        <p v-if="user" class="text-center text-gray-400 text-sm mt-2 mb-6">{{ user.email }}</p>
        <div class="space-y-4">
          <div>
            <label for="avatarStyle" class="block mb-1 text-sm text-[#9ca3af]">{{ $t('profile_style') }}</label>
            <select id="avatarStyle" v-model="avatarConfig.style" class="w-full p-3 rounded-lg border border-[#4b5563] bg-[#374151] text-white">
              <option v-for="style in avatarStyles" :key="style" :value="style">{{ style }}</option>
            </select>
          </div>
          <div>
            <label for="avatarSeed" class="block mb-1 text-sm text-[#9ca3af]">{{ $t('profile_seed') }}</label>
            <p class="text-xs text-[#6b7280] mb-2 h-4">{{ $t('profile_seedHint') }}</p>
            <input id="avatarSeed" type="text" v-model="avatarConfig.seed" class="w-full p-3 rounded-lg border border-[#4b5563] bg-[#374151] text-white" />
          </div>
        </div>
      </section>

      <section class="mb-8">
        <h2 class="text-xl font-semibold border-b border-[#374151] pb-2 mb-6 text-center">{{ $t('profile_personalData') }}</h2>
        <div v-if="profile" class="space-y-4">
          <div>
            <label for="fullName" class="block mb-1 text-sm text-[#9ca3af]">{{ $t('profile_name') }}</label>
            <input id="fullName" type="text" v-model="profile.full_name" class="w-full p-3 rounded-lg border border-[#4b5563] bg-[#374151] text-white" />
          </div>
          <div>
            <label for="age" class="block mb-1 text-sm text-[#9ca3af]">{{ $t('profile_age') }}</label>
            <p class="text-xs text-[#6b7280] mb-2 h-4">{{ $t('profile_ageHint') }}</p>
            <div class="flex">
              <button @click="profile.age > 6 ? profile.age-- : null" class="age-button rounded-l-lg">-</button>
              <input id="age" type="number" v-model.number="profile.age" min="6" class="w-full p-3 text-center border-y border-x-0 border-[#4b5563] bg-[#374151] text-white" />
              <button @click="profile.age++" class="age-button rounded-r-lg">+</button>
            </div>
          </div>
          <div>
            <label for="language" class="block mb-1 text-sm text-[#9ca3af]">{{ $t('profile_language') }}</label>
            <select id="language" v-model="locale" class="w-full p-3 rounded-lg border border-[#4b5563] bg-[#374151] text-white">
              <option value="en">English</option> <option value="ru">Русский</option> <option value="es">Español</option>
            </select>
          </div>
          <div>
            <label for="country" class="block mb-1 text-sm text-[#9ca3af]">{{ $t('profile_country') }}</label>
            <p class="text-xs text-[#6b7280] mb-2 h-4">{{ $t('profile_countryHint') }}</p>
            <select id="country" v-model="profile.country" class="w-full p-3 rounded-lg border border-[#4b5563] bg-[#374151] text-white">
              <option value="">{{ $t('profile_countryNotSelected') }}</option>
              <option v-for="country in countries" :key="country.code" :value="country.code">{{ country.name }}</option>
            </select>
          </div>
        </div>
      </section>

      <section class="mb-8">
        <h2 class="text-xl font-semibold border-b border-[#374151] pb-2 mb-6 text-center">{{ $t('profile_passwordManagement') }}</h2>
        <form @submit.prevent="updatePassword" class="space-y-4">
          <input v-if="user" type="email" :value="user.email" hidden autocomplete="email" />
          
          <div>
            <label for="newPassword" class="block mb-1 text-sm text-[#9ca3af]">{{ $t('profile_newPassword') }}</label>
            <p class="text-xs text-[#6b7280] mb-2 h-4">{{ $t('profile_passwordHint') }}</p>
            <input id="newPassword" type="password" v-model="newPassword" class="w-full p-3 rounded-lg border border-[#4b5563] bg-[#374151] text-white" autocomplete="new-password" />
          </div>
          <button type="submit" class="w-full bg-[#3b82f6] text-white py-3 px-4 rounded-lg font-semibold transition-colors hover:bg-[#1d4ed8]" :disabled="!newPassword">{{ $t('profile_setPassword') }}</button>
          <p v-if="passwordUpdateMessage" class="text-green-400 text-center mt-2">{{ passwordUpdateMessage }}</p>
        </form>
        <div class="space-y-4 mt-4">
          <div class="relative">
            <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-gray-600"></div></div>
            <div class="relative flex justify-center text-sm"><span class="bg-[#1f2937] px-2 text-gray-400">{{ $t('or') }}</span></div>
          </div>
          <button @click="handleLinkGoogleInProfile" class="w-full ...">
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
        <button @click="handleSignOut" class="w-full bg-[#4b5563] text-white py-3 px-4 rounded-lg font-semibold transition-colors hover:bg-[#6b7280]">{{ $t('logout') }}</button>
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

// Profile.vue
// Profile.vue
<script setup>
import { ref, onMounted, watch } from 'vue';
import { useSupabaseUser } from '#imports';
import { useI18n } from 'vue-i18n';
import RelationList from '~/components/RelationList.vue';

// Import our composables
import { useAuth } from '~/composables/useAuth';
import { useProfile } from '~/composables/useProfile';
import { useRelations } from '~/composables/useRelations';

// --- COMPOSABLES ---
const { locale } = useI18n();
const user = useSupabaseUser();

const {
  authEmail, authPassword, authMessage, authMessageType,
  handleEmailPasswordUpgrade, handleEmailPasswordSignIn, handleGoogleSignIn,
  handleLinkGoogleInProfile, handleSignOut, handlePasswordReset
} = useAuth();

const {
  loading, profile, curators, students, newPassword, passwordUpdateMessage,
  avatarConfig, isAnonymous, avatarUrl,
  fetchProfileAndRelations, updatePassword, randomizeAvatar
} = useProfile();

const {
  showModal, modalTitle, inviteEmail, inviteType, relationType,
  openModal, closeModal, sendInvitation, acceptInvitation, deleteRelation
} = useRelations(profile, fetchProfileAndRelations); // Pass fetch callback here

// --- STATE & MISC (that belongs to the component) ---
const activeTab = ref('student');
const showIdentityExistsError = ref(false); // This state is purely for the view
const avatarStyles = ['adventurer', 'bottts', 'micah', 'miniavs', 'pixel-art', 'lorelei'];
const countries = ref([
    { code: 'RU', name: 'Россия' }, { code: 'US', name: 'США' }, { code: 'KZ', name: 'Казахстан' },
    { code: 'DE', name: 'Германия' }, { code: 'FR', name: 'Франция' }, { code: 'ES', name: 'Испания' },
]);

// --- LIFECYCLE & WATCHERS (for component logic) ---
onMounted(() => {
  const hash = window.location.hash;
  if (hash.includes('error_code=identity_already_exists')) {
    showIdentityExistsError.value = true;
    history.pushState("", document.title, window.location.pathname + window.location.search);
  }
});

watch(user, () => {
  fetchProfileAndRelations();
}, { immediate: true });
</script>

<style scoped>
.age-button { @apply w-11 bg-[#4b5563] border border-[#4b5563] text-white font-bold cursor-pointer; }
.active-tab-button { @apply bg-transparent text-white border-b-2 border-[#3b82f6] py-3 px-4 font-semibold; }
.inactive-tab-button { @apply bg-transparent text-[#9ca3af] border-b-2 border-transparent py-3 px-4 font-medium; }
.age-input-wrapper input { -moz-appearance: textfield; }
.age-input-wrapper input::-webkit-outer-spin-button, .age-input-wrapper input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
</style>