<template>
  <div>
    <NuxtPage />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

// This computed property will return 'no-scroll' for all pages
// EXCEPT for those that start with '/hub'.
const bodyClass = computed(() => {
  if (route.path.startsWith('/hub')) {
    return ''; // On hub pages, body has no extra class
  }
  return 'no-scroll'; // On all other pages, apply .no-scroll
});

// useHead is the Nuxt 3 way to manage the document's <head> and body attributes
useHead({
  bodyAttrs: {
    class: bodyClass
  }
});
</script>