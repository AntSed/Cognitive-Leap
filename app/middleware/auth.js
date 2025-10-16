// app/middleware/auth.js
export default defineNuxtRouteMiddleware(async (to, from) => {
  const user = useSupabaseUser();
  if (!user.value || user.value.is_anonymous) {
    if (to.path !== '/') {
      return navigateTo({ path: '/', query: { view: 'profile' } });
    }
  }
});