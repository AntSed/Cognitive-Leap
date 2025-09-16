// Префикс '01.' в имени файла гарантирует, что этот плагин запустится одним из первых.

export default defineNuxtPlugin(async (nuxtApp) => {
  // Этот плагин работает только в браузере
  if (process.server) {
    return;
  }

  const supabase = useSupabaseClient();
  const user = useSupabaseUser();
  
  // ИЗМЕНЕНИЕ: Используем надежный window.location.href вместо nuxtApp.payload.path
  const currentUrl = window.location.href;

  // Если в URL есть хэш с токеном, и у нас еще нет пользователя
  if (currentUrl.includes('#access_token') && !user.value) {
    
    const hash = currentUrl.split('#')[1];
    if (!hash) return; // На всякий случай
    
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      console.log('[Auth Plugin] Manually setting session from URL tokens.');
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        console.error('[Auth Plugin] Error setting session:', error);
        return;
      }
      
      await nuxtApp.runWithContext(() => {
        nextTick(() => {
          // Очищаем URL, чтобы он стал чистым (например, 'http://localhost:3000/confirm-invitation')
          window.history.replaceState({}, document.title, window.location.pathname);
        });
      });
    }
  }
});

