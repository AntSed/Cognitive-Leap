// plugins/quick-tip.client.ts
import { useQuickTip } from '~/composables/useQuickTip';

export default defineNuxtPlugin((nuxtApp) => { 
  const { fetchTip } = useQuickTip();
  const { locale } = nuxtApp.$i18n;
  fetchTip(locale.value); 
});