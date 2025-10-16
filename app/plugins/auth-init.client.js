// plugins/auth-init.client.js
import { watch } from 'vue';

export default defineNuxtPlugin(nuxtApp => {
  const supabase = useSupabaseClient();
  
  // 1. Create a single, app-wide reactive state for auth readiness
  const isAuthReady = useState('isAuthReady', () => false);

  // 2. A helper function that returns a promise, which resolves when auth is ready
  const waitForAuth = () => {
    return new Promise((resolve) => {
      // If auth is already ready, resolve immediately
      if (isAuthReady.value) {
        resolve(true);
      } else {
        // Otherwise, watch for the state to change to true, then resolve
        const unwatch = watch(isAuthReady, (newValue) => {
          if (newValue) {
            unwatch(); // Stop watching once resolved
            resolve(true);
          }
        });
      }
    });
  };

  // 3. Set up the auth listener once
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (!isAuthReady.value) {
      isAuthReady.value = true;
    }
  });
  
  // 4. Provide the helper to the entire app
  nuxtApp.provide('auth', {
    isAuthReady,
    waitForAuth,
  });
});