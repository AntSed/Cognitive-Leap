// app/middleware/auth.js
export default defineNuxtRouteMiddleware(async (to, from) => {

  // 1. Guard Clause: If the route does NOT start with /hub, skip authentication and let the user pass.
  // This ensures public pages like /mindmap are accessible.
  if (!to.path.startsWith('/hub')) {
    return;
  }

  // All subsequent code executes ONLY for /hub routes.

  // 2. Server-side logic (when process.server === true).
  if (process.server) {
    const user = useSupabaseUser();
    // On the server, perform a quick check for a session in cookies.
    // If user.value is null, the user is not logged in.
    if (!user.value) {
      return navigateTo({ path: '/', query: { view: 'profile' } });
    }
    // If a session exists (even anonymous), the server proceeds. The client will perform a stricter check.
    return;
  }

  // 3. Client-side logic (when process.server === false).
  const { $auth } = useNuxtApp();

  // Wait for the authentication plugin to confirm the exact authentication status.
  await $auth.waitForAuth();

  const user = useSupabaseUser();

  // Perform a final, strict check on the client.
  // If the user is not logged in OR is anonymous, redirect to the profile view.
  if (!user.value || user.value.is_anonymous) {
    return navigateTo({ path: '/', query: { view: 'profile' } });
  }
});