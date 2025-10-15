// File: middleware/auth.js

export default defineNuxtRouteMiddleware((to, from) => {
  // Add this console.log for debugging. It will show us every path the middleware runs on.
  console.log('Auth middleware triggered for path:', to.path);

  const publicPages = ['/mindmap']; // This can be expanded, e.g., ['/mindmap', '/about']

  // A more robust check using a regular expression.
  // This correctly handles /mindmap, /mindmap/, and /mindmap/anything-else
  const isPublic = publicPages.some(page => new RegExp(`^${page}`).test(to.path));

  if (isPublic) {
    console.log(`Path ${to.path} is public. Granting access.`);
    return; // Access granted
  }

  // --- For all other pages, proceed with the authentication check ---
  const user = useSupabaseUser();

  if (!user.value || user.value.is_anonymous) {
    console.log('User is not authenticated. Redirecting to login view.');
    
    // Use the more explicit object syntax for the redirect.
    // This tells Nuxt clearly: go to the path '/' and add the query '?view=profile'.
    // This should solve the "/profile" 404 error.
    return navigateTo({ path: '/', query: { view: 'profile' } });
  }
});