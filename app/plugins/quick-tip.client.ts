// plugins/quick-tip.client.ts
import { useQuickTip } from '~/composables/useQuickTip';
export default defineNuxtPlugin((nuxtApp) => {
  const route = nuxtApp.$router.currentRoute.value;
  const { fetchTip } = useQuickTip();
  const { locale } = nuxtApp.$i18n;

  const view = route.query.view as string | undefined;
  const isPlayPage = view === 'play' || view === undefined;
  if (isPlayPage) {
    fetchTip(locale.value);
  } else {
  }
});