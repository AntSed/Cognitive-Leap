// File: middleware/auth.js

export default defineNuxtRouteMiddleware((to, from) => {
  // A whitelist of public paths that do not require authentication.
  const publicPages = ['/3dmindmap'];

  // If the user is navigating to a public page, grant access immediately.
  if (publicPages.includes(to.path)) {
    return;
  }

  // For all other pages, proceed with the authentication check.
  const user = useSupabaseUser();

  // If there is no authenticated user (either the user object is null or the user is anonymous),
  // redirect them to the profile page to encourage signing in or signing up.
  if (!user.value || user.value.is_anonymous) {
    return navigateTo('/?view=profile');
  }
});