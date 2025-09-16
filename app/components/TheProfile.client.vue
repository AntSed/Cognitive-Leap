<template>
  <div class="w-full max-w-lg mx-auto text-gray-200">
    <div v-if="loading" class="text-center p-8">
      <p>{{ $t('loading') }}</p>
    </div>

    <div v-else-if="isAnonymous" class="bg-[#1f2937] p-8 rounded-2xl border border-[#374151] shadow-2xl">
      <div class="relative w-24 h-24 mx-auto mb-6">
        <img :src="avatarUrl" alt="Avatar" class="w-full h-full rounded-full object-cover border-2 border-[#4b5563] bg-gray-700">
      </div>
      <h2 class="text-2xl font-bold text-center text-white mb-4">{{ $t('profile_saveYourProgress') }}</h2>
      <p class="text-center text-gray-400 mb-8">{{ $t('profile_createAccountHint') }}</p>
      
      <div class="space-y-4">
        <div>
          <label for="auth-email" class="block mb-1 text-sm text-[#9ca3af]">Email</label>
          <input id="auth-email" type="email" v-model="authEmail" required class="w-full p-3 rounded-lg border border-[#4b5563] bg-[#374151] text-white" />
        </div>

        <div>
          <div class="flex justify-between items-center mb-1">
            <label for="auth-password" class="block text-sm text-[#9ca3af]">Password</label>
            <button @click="handlePasswordReset" class="text-xs text-[#9ca3af] hover:text-white transition-colors">{{ $t('forgotPassword') }}</button>
          </div>
          <input id="auth-password" type="password" v-model="authPassword" required class="w-full p-3 rounded-lg border border-[#4b5563] bg-[#374151] text-white" />
        </div>
        <p v-if="authMessage" :class="authMessageType === 'success' ? 'text-green-400' : 'text-red-400'" class="text-center text-sm h-4">
         {{ authMessage }}
        </p>
        <div class="flex items-center gap-4">
          <button @click="handleEmailPasswordSignIn" class="w-full py-3 px-4 rounded-lg font-semibold text-white bg-[#4b5563] hover:bg-[#6b7280]">{{ $t('signIn') }}</button>
          <button @click="handleEmailPasswordUpgrade" class="w-full py-3 px-4 rounded-lg font-semibold text-white bg-[#3b82f6] hover:bg-[#1d4ed8]">{{ $t('signUp') }}</button>
        </div>
      </div>

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
        <h2 class="text-xl font-semibold border-b border-[#374151] pb-2 mb-6 text-center">{{ $t('profile_avatar') }}</h2>
        <div class="relative w-24 h-24 mx-auto mb-6">
          <img :src="avatarUrl" alt="Avatar" class="w-full h-full rounded-full object-cover border-2 border-[#3b82f6] bg-gray-700">
          <button @click="randomizeAvatar" class="absolute bottom-0 right-0 bg-[#3b82f6] text-white w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#1f2937] cursor-pointer" :title="$t('profile_randomAvatar')">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.899 2.186l-1.414 1.414A5.002 5.002 0 005.999 7.49l-.496.497a1 1 0 01-1.414 0l-2-2a1 1 0 010-1.414l2-2a1 1 0 011.414 0l.496.497A7.002 7.002 0 014 2.101V3a1 1 0 01-1-1H2a1 1 0 01-1-1V1a1 1 0 011-1h1a1 1 0 011 1v1zM16 17.9a1 1 0 01-1-1v-2.101a7.002 7.002 0 01-11.899-2.186l1.414-1.414A5.002 5.002 0 0014.001 12.51l.496-.497a1 1 0 011.414 0l2 2a1 1 0 010 1.414l-2 2a1 1 0 01-1.414 0l-.496-.497A7.002 7.002 0 0116 17.898V17a1 1 0 011 1h1a1 1 0 011 1v1a1 1 0 01-1 1h-1a1 1 0 01-1-1z" clip-rule="evenodd" /></svg>
          </button>
        </div>
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
            <label for="email" class="block mb-1 text-sm text-[#9ca3af]">Email ({{ $t('cannot_change') }})</label>
            <input id="email" type="email" :value="user.email" readonly class="w-full p-3 rounded-lg border border-[#4b5563] bg-[#4b5563] text-white cursor-not-allowed" />
          </div>
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
        <div class="space-y-4">
          <div>
            <label for="newPassword" class="block mb-1 text-sm text-[#9ca3af]">{{ $t('profile_newPassword') }}</label>
            <p class="text-xs text-[#6b7280] mb-2 h-4">{{ $t('profile_passwordHint') }}</p>
            <input id="newPassword" type="password" v-model="newPassword" class="w-full p-3 rounded-lg border border-[#4b5563] bg-[#374151] text-white" />
          </div>
          <button @click="updatePassword" class="w-full bg-[#3b82f6] text-white py-3 px-4 rounded-lg font-semibold transition-colors hover:bg-[#1d4ed8]" :disabled="!newPassword">{{ $t('profile_setPassword') }}</button>
          <p v-if="passwordUpdateMessage" class="text-green-400 text-center mt-2">{{ passwordUpdateMessage }}</p>
        </div>
      </section>
      
      <section>
        <div class="flex border-b border-[#374151]">
          <button @click="activeTab = 'student'" :class="[activeTab === 'student' ? 'active-tab-button' : 'inactive-tab-button']">{{ $t('profile_iAmStudent') }}</button>
          <button @click="activeTab = 'curator'" :class="[activeTab === 'curator' ? 'active-tab-button' : 'inactive-tab-button']">{{ $t('profile_iAmCurator') }}</button>
        </div>
        
        <div v-show="activeTab === 'student'" class="pt-6 space-y-4">
          <div v-for="curator in curators" :key="curator.id" class="flex flex-wrap justify-between items-center bg-[#374151] p-4 rounded-lg">
            <div>
              <p class="font-bold">{{ getOtherPartyName(curator) }}</p>
              <p class="text-sm text-[#9ca3af]">{{ curator.relation_type }}</p>
            </div>
            <div class="flex items-center gap-2">
              <template v-if="curator.status === 'pending'">
                <template v-if="user.email === curator.invitee_email">
                   <button @click="acceptInvitation(curator)" class="p-2 text-gray-400 hover:text-green-500" :title="$t('accept')">
                     <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                   </button>
                   <button @click="deleteRelation(curator)" class="p-2 text-gray-400 hover:text-red-500" :title="$t('reject')">
                     <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                   </button>
                </template>
                <template v-else>
                   <span class="text-sm text-yellow-400" :title="$t('pending')">
                     <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                   </span>
                   <button @click="deleteRelation(curator)" class="p-2 text-gray-400 hover:text-red-500" :title="$t('profile_cancelInvitation')">
                     <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                   </button>
                </template>
              </template>
              <template v-else-if="curator.status === 'active'">
                 <span class="text-sm text-green-400" :title="$t('active')">
                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                 </span>
                 <button @click="deleteRelation(curator)" class="p-2 text-gray-400 hover:text-red-500" :title="$t('profile_deleteConnection')">
                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                 </button>
              </template>
            </div>
          </div>
          <button @click="openModal('curator')" class="w-full bg-transparent border border-dashed border-[#4b5563] text-[#9ca3af] py-2 px-4 rounded-lg font-semibold transition-colors cursor-pointer hover:bg-[#374151] hover:text-white">+ {{ $t('profile_addCurator') }}</button>
        </div>

        <div v-show="activeTab === 'curator'" class="pt-6 space-y-4">
           <div v-for="student in students" :key="student.id" class="flex flex-wrap justify-between items-center bg-[#374151] p-4 rounded-lg">
             <div>
               <p class="font-bold">{{ getOtherPartyName(student) }}</p>
               <p class="text-sm text-[#9ca3af]">{{ student.relation_type }}</p>
             </div>
             <div class="flex items-center gap-2">
                <template v-if="student.status === 'pending'">
                  <template v-if="user.email === student.invitee_email">
                    <button @click="acceptInvitation(student)" class="p-2 text-gray-400 hover:text-green-500" :title="$t('accept')">
                      <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    </button>
                    <button @click="deleteRelation(student)" class="p-2 text-gray-400 hover:text-red-500" :title="$t('reject')">
                      <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                  </template>
                  <template v-else>
                    <span class="text-sm text-yellow-400" :title="$t('pending')">
                      <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </span>
                    <button @click="deleteRelation(student)" class="p-2 text-gray-400 hover:text-red-500" :title="$t('profile_cancelInvitation')">
                      <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </template>
                </template>
                <template v-else-if="student.status === 'active'">
                  <span class="text-sm text-green-400" :title="$t('active')">
                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </span>
                  <button @click="deleteRelation(student)" class="p-2 text-gray-400 hover:text-red-500" :title="$t('profile_deleteConnection')">
                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </template>
             </div>
           </div>
           <button @click="openModal('student')" class="w-full bg-transparent border border-dashed border-[#4b5563] text-[#9ca3af] py-2 px-4 rounded-lg font-semibold transition-colors cursor-pointer hover:bg-[#374151] hover:text-white">+ {{ $t('profile_addStudent') }}</button>
        </div>
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
              <input id="inviteEmail" type="email" v-model="inviteEmail" :placeholder="$t('profile_studentEmailPlaceholder')" class="w-full p-3 rounded-lg border border-[#4b5563] bg-[#374151] text-white">
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
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSupabaseClient, useSupabaseUser } from '#imports';

// --- COMPOSABLES ---
const { t, locale, setLocale } = useI18n();
const supabase = useSupabaseClient();
const user = useSupabaseUser();

// --- STATE MANAGEMENT ---
const loading = ref(true);
const profile = ref(null);
const activeTab = ref('student');
const curators = ref([]);
const students = ref([]);
const newPassword = ref('');
const passwordUpdateMessage = ref('');
const authEmail = ref('');
const authPassword = ref('');
const authMessage = ref('');
const authMessageType = ref('error'); // 'error' or 'success'
const avatarStyles = ['adventurer', 'bottts', 'micah', 'miniavs', 'pixel-art', 'lorelei'];
const avatarConfig = ref({ style: 'adventurer', seed: 'cognitive-leap' });
const showModal = ref(false);
const modalTitle = ref('');
const inviteEmail = ref('');
const inviteType = ref('');
const relationType = ref('parent');
const countries = ref([
    { code: 'RU', name: 'Россия' }, { code: 'US', name: 'США' }, { code: 'KZ', name: 'Казахстан' },
    { code: 'DE', name: 'Германия' }, { code: 'FR', name: 'Франция' }, { code: 'ES', name: 'Испания' },
]);

// --- COMPUTED PROPERTIES ---
const isAnonymous = computed(() => user.value?.is_anonymous ?? true);

const avatarUrl = computed(() => {
    if (!user.value) return '';
    const seed = isAnonymous.value ? user.value.id : (avatarConfig.value.seed || user.value.id);
    const style = avatarConfig.value.style || 'adventurer';
    return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
});

// --- DATA FETCHING & PROCESSING ---
const fetchProfileAndRelations = async () => {
  if (!user.value || isAnonymous.value) {
    loading.value = false;
    return;
  }
  
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.value.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') throw profileError;
    
    if (profileData) {
      profile.value = profileData;
      if (profileData.avatar_config) avatarConfig.value = profileData.avatar_config;
      if (profileData.language) setLocale(profileData.language);
    } else {
      const { data: newProfile, error: insertError } = await supabase
        .from('user_profiles')
        .insert({ user_id: user.value.id, full_name: user.value.user_metadata?.full_name || 'New User', language: locale.value })
        .select().single();
      if (insertError) throw insertError;
      profile.value = newProfile;
    }

    const { data: relationsData, error: relationsError } = await supabase
      .from('student_curator_relations')
      .select(`*, student:user_profiles!student_curator_relations_student_id_fkey(full_name, user_id), curator:user_profiles!student_curator_relations_curator_id_fkey(full_name, user_id)`)
      .or(`student_id.eq.${user.value.id},curator_id.eq.${user.value.id},invitee_email.eq.${user.value.email}`);
    
    if (relationsError) throw relationsError;

    // Correctly filter relations into the UI lists.
    curators.value = relationsData.filter(rel => {
        return rel.student_id === user.value.id || 
               (rel.invitee_email === user.value.email && rel.student_id === null);
    });
    students.value = relationsData.filter(rel => {
        return rel.curator_id === user.value.id || 
               (rel.invitee_email === user.value.email && rel.curator_id === null);
    });

  } catch (error) {
    console.error("Error fetching profile and relations:", error);
  } finally {
    loading.value = false;
  }
};

// **NEW, SIMPLIFIED HELPER FUNCTION**
// This function reliably determines the name of the OTHER person in the relationship.
const getOtherPartyName = (relation) => {
  // Case 1: This is a pending invite FOR ME. I need to see the inviter's name.
  if (relation.status === 'pending' && relation.invitee_email === user.value.email) {
    // The inviter is the one whose profile object (student or curator) is NOT null.
    return relation.student?.full_name || relation.curator?.full_name || t('unknown_user');
  }
  
  // Case 2: This is an active relation, or a pending invite I SENT. I need to see the other person's name.
  if (relation.student_id === user.value.id) {
    // I am the student, so show the curator's name.
    return relation.curator?.full_name || relation.invitee_email || t('unknown_user');
  }
  if (relation.curator_id === user.value.id) {
    // I am the curator, so show the student's name.
    return relation.student?.full_name || relation.invitee_email || t('unknown_user');
  }

  // Fallback for any unexpected cases.
  return t('unknown_user');
};


onMounted(() => {
  watch(user, (currentUser) => {
    if (currentUser && !currentUser.is_anonymous) {
      fetchProfileAndRelations();
    } else {
      loading.value = false;
    }
  }, { immediate: true });
});
// --- WATCHERS for Auto-Saving ---
watch(profile, async (newProfile, oldProfile) => {
    if (!newProfile || !oldProfile || loading.value || isAnonymous.value) return;
    const { id, created_at, user_id, ...updates } = newProfile;
    const { error } = await supabase.from('user_profiles').update(updates).eq('user_id', user.value.id);
    if (error) console.error('Error auto-saving profile:', error);
}, { deep: true });

watch(avatarConfig, async (newAvatarConfig, oldAvatarConfig) => {
    if (!newAvatarConfig.seed || !oldAvatarConfig.seed || loading.value || isAnonymous.value) return;
    const { error } = await supabase.from('user_profiles').update({ avatar_config: newAvatarConfig }).eq('user_id', user.value.id);
    if (error) console.error('Error auto-saving avatar config:', error);
}, { deep: true });

watch(locale, async (newLocale, oldLocale) => {
  if (newLocale && newLocale !== oldLocale && user.value && !isAnonymous.value) {
    if(profile.value) profile.value.language = newLocale;
    await supabase.from('user_profiles').update({ language: newLocale }).eq('user_id', user.value.id);
  }
});

// --- ACTIONS ---
const updatePassword = async () => {
  if (!newPassword.value) return;
  passwordUpdateMessage.value = '';
  const { error } = await supabase.auth.updateUser({ password: newPassword.value });
  if (error) {
    passwordUpdateMessage.value = `Error: ${error.message}`;
  } else {
    passwordUpdateMessage.value = t('profile_passwordUpdated');
    newPassword.value = '';
    setTimeout(() => passwordUpdateMessage.value = '', 3000);
  }
};

const acceptInvitation = async (relation) => {
  try {
    const { error } = await supabase.functions.invoke('confirm-invitation', {
      body: { relation_id: relation.id }
    });
    if (error) throw error;
    await fetchProfileAndRelations();
  } catch (error) {
    console.error("Error accepting invitation:", error);
    alert(`Error: ${error.message}`);
  }
};

const deleteRelation = async (relation) => {
  if (!confirm(t('profile_confirmDelete'))) return;
  try {
    const { error } = await supabase.functions.invoke('delete-relation', {
      body: { student_id: relation.student_id, curator_id: relation.curator_id }
    });
    if (error) throw error;
    await fetchProfileAndRelations();
  } catch (error) {
    console.error("Error deleting relation:", error);
  }
};

const openModal = (type) => {
    inviteType.value = type;
    modalTitle.value = t(type === 'curator' ? 'profile_addCurator' : 'profile_addStudent');
    showModal.value = true;
};
const closeModal = () => { showModal.value = false; inviteEmail.value = ''; relationType.value = 'parent'; };

const sendInvitation = async () => {
    if (!inviteEmail.value || !user.value || !profile.value) return;
    const inviterName = profile.value.full_name || user.value.email;
    const { error } = await supabase.functions.invoke('invite-user', {
        body: { 
            inviteeEmail: inviteEmail.value, inviterId: user.value.id, inviterName: inviterName,
            inviterLang: locale.value, inviteType: inviteType.value, relationType: relationType.value
        }
    });
    if (error) {
        alert(`Error: ${error.message}`);
    } else {
        closeModal();
        await fetchProfileAndRelations();
    }
};

// --- ANONYMOUS/AUTH ACTIONS ---
const handleEmailPasswordUpgrade = async () => {
  authMessage.value = '';
  if (!authEmail.value || !authPassword.value) { authMessage.value = t('error_fill_fields'); return; }
  const { error } = await supabase.auth.updateUser({ email: authEmail.value, password: authPassword.value });
  if (error) { authMessage.value = error.message; }
};
const handleEmailPasswordSignIn = async () => {
  authMessage.value = '';
  if (!authEmail.value || !authPassword.value) { authMessage.value = t('error_fill_fields'); return; }
  await supabase.auth.signOut();
  const { error } = await supabase.auth.signInWithPassword({ email: authEmail.value, password: authPassword.value });
  if (error) { authMessage.value = t('invalidLogin'); await supabase.auth.signInAnonymously(); }
};
const handleGoogleSignIn = async () => {
    authMessage.value = '';
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/?view=profile` } });
    if (error) { authMessage.value = error.message; }
};
const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error signing out:', error);
    else window.location.reload();
};
const handlePasswordReset = async () => {
    authMessage.value = '';
    if (!authEmail.value) {
        authMessageType.value = 'error';
        authMessage.value = t('enterEmailForReset');
        return;
    }

    // Вызываем нашу собственную Edge Function
    const { error } = await supabase.functions.invoke('send-magic-link', {
        body: {
            email: authEmail.value,
            locale: locale.value // Передаем текущий язык пользователя
        }
    });

    if (error) {
        authMessageType.value = 'error';
        authMessage.value = error.message;
    } else {
        authMessageType.value = 'success';
        authMessage.value = t('resetLinkSent');
    }
};

// --- MISC ---
const randomizeAvatar = () => { avatarConfig.value.seed = Math.random().toString(36).substring(7); };
</script>

<style scoped>
.age-button { @apply w-11 bg-[#4b5563] border border-[#4b5563] text-white font-bold cursor-pointer; }
.active-tab-button { @apply bg-transparent text-white border-b-2 border-[#3b82f6] py-3 px-4 font-semibold; }
.inactive-tab-button { @apply bg-transparent text-[#9ca3af] border-b-2 border-transparent py-3 px-4 font-medium; }
.age-input-wrapper input { -moz-appearance: textfield; }
.age-input-wrapper input::-webkit-outer-spin-button, .age-input-wrapper input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
</style>