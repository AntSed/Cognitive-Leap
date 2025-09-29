// File: app/router.options.ts

import type { RouterConfig } from '@nuxt/schema'
export default <RouterConfig> {
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    if (to.hash) {
      if (to.hash === '#modal') {
        return;
      }
      return {
        el: to.hash,
        behavior: 'smooth'
      };
    }
    return { top: 0 };
  }
}