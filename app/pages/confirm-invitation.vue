<template>
  <div class="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
    <ClientOnly>
      <div class="w-full max-w-md bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-2xl">
        <div v-if="!isReady" class="text-center py-8">
          <p class="text-lg text-gray-400">{{ $t('processing_invitation', 'Обрабатываем приглашение...') }}</p>
        </div>
        
        <div v-else>
          <h1 class="text-3xl font-bold text-center mb-2">{{ $t('confirm_invitation_title', 'Завершите регистрацию') }}</h1>
          <p class="text-center text-gray-400 mb-8">{{ $t('confirm_invitation_subtitle', 'Создайте пароль для вашего аккаунта') }}</p>
          <form @submit.prevent="handleRegistration" class="space-y-6">
            <div>
              <label for="password" class="block mb-2 text-sm text-gray-400">{{ $t('newPassword', 'Новый пароль') }}</label>
              <p class="text-xs text-gray-500 mb-2">{{ $t('password_requirements', 'Минимум 6 символов') }}</p>
              <input
                id="password"
                type="password"
                v-model="password"
                required
                class="w-full p-3 rounded-lg border border-gray-600 bg-gray-700 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                :placeholder="$t('password_placeholder', '••••••••')"
                autocomplete="new-password"
              />
            </div>
            <button
              type="submit"
              :disabled="loading"
              class="w-full py-3 px-4 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
            >
              <span v-if="loading">{{ $t('processing', 'Обработка...') }}</span>
              <span v-else>{{ $t('complete_registration', 'Завершить регистрацию') }}</span>
            </button>
          </form>
          <p v-if="errorMsg" class="text-red-400 text-center mt-4">{{ errorMsg }}</p>
        </div>
      </div>
      
      <template #fallback>
        <div class="w-full max-w-md p-8 text-center">
           <p class="text-lg text-gray-400">Loading...</p>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useSupabaseClient, useSupabaseUser } from '#imports';

// --- META ---
definePageMeta({ 
  layout: 'empty'
});

// --- COMPOSABLES ---
const { t } = useI18n();
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const router = useRouter();
const route = useRoute();

// --- STATE ---
const password = ref('');
const loading = ref(false);
const errorMsg = ref('');
const isSessionReady = ref(false);
const confirmationToken = ref(null);

// This computed property acts as a master gatekeeper.
// The UI will only switch to the form when both the session is ready AND we have found the token.
const isReady = computed(() => isSessionReady.value && confirmationToken.value);

// --- LIFECYCLE HOOKS ---
onMounted(() => {
  // Strategy: Try to get the token from the URL first. This covers new and confirmed user invites.
  // If it's not there, we'll wait for the session and check the metadata (for unconfirmed user invites).
  
  // 1. Attempt to read the confirmation token from the URL query parameters immediately.
  const tokenFromUrl = route.query.token;
  if (tokenFromUrl && typeof tokenFromUrl === 'string') {
    confirmationToken.value = tokenFromUrl;
    console.log(`Confirmation token found in URL: ${confirmationToken.value}`);
  }

  // 2. Listen for the auth state change. This is crucial for Magic Link flow.
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
      if (session) {
        console.log('User session is ready!');
        isSessionReady.value = true;
        
        // 3. If the token wasn't in the URL, try to get it from user metadata.
        // This is the fallback for the "unconfirmed user" scenario.
        if (!confirmationToken.value && session.user?.user_metadata?.confirmation_token) {
          confirmationToken.value = session.user.user_metadata.confirmation_token;
          console.log(`Confirmation token found in user metadata: ${confirmationToken.value}`);
        }

        // 4. Final check: if after all this we still don't have a token, show an error.
        if (!confirmationToken.value) {
           console.error("Confirmation token could not be found in URL or user metadata.");
           errorMsg.value = t('error_missing_token', 'Ссылка-приглашение недействительна или устарела.');
        }
      }
    }
  });

  // Clean up the listener when the component is destroyed to prevent memory leaks.
  onUnmounted(() => {
    subscription.unsubscribe();
  });
});


// --- METHODS ---
const handleRegistration = async () => {
  // A final guard clause before sending the request.
  if (!isReady.value) {
    errorMsg.value = t('error_not_ready', 'Страница еще не готова. Пожалуйста, подождите.');
    return;
  }
  
  loading.value = true;
  errorMsg.value = '';

  try {
    // STEP 1: Update the user's password. This confirms their account in Supabase Auth.
    const { error: updateUserError } = await supabase.auth.updateUser({
      password: password.value
    });
    if (updateUserError) throw updateUserError;

    // STEP 2: Call our custom Edge Function, passing the unique token to confirm the relationship.
    const { error: functionError } = await supabase.functions.invoke('confirm-invitation', {
      body: { token: confirmationToken.value }
    });
    if (functionError) throw functionError;
    
    // STEP 3: On success, redirect the user to their profile page.
    await router.push({ path: '/', query: { view: 'profile' } });

  } catch (error) {
    console.error("Registration failed:", error);

    if (error && error.status === 422) {
      errorMsg.value = t('error_weak_password', 'Пароль слишком слабый. Пожалуйста, используйте более надежный пароль.');
    } else if (error && error.message) {
      errorMsg.value = error.message;
    } else {
      errorMsg.value = t('error_unknown', 'Произошла неизвестная ошибка.');
    }
  } finally {
    loading.value = false;
  }
};
</script>