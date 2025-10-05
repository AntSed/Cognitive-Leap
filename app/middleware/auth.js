// File: middleware/auth.js

export default defineNuxtRouteMiddleware((to, from) => {
  const user = useSupabaseUser();

  // Redirect if there is no user OR if the user is anonymous
  if (!user.value || user.value.is_anonymous) {
    return navigateTo('/?view=profile'); 
  }
});