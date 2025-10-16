// app/middleware/auth.js
export default defineNuxtRouteMiddleware(async (to, from) => {

  // 1. "Быстрый выход" (Guard Clause). Это самое важное изменение.
  // Если маршрут НЕ начинается с /hub, немедленно прекращаем работу и пропускаем пользователя.
  // Это решает проблему с /mindmap и любыми другими публичными страницами.
  if (!to.path.startsWith('/hub')) {
    return;
  }

  // --- Весь последующий код выполнится ТОЛЬКО для /hub ---

  // 2. Логика для сервера (когда process.server === true)
  if (process.server) {
    const user = useSupabaseUser();
    // На сервере мы можем сделать только быструю проверку наличия сессии в куках.
    // Если user.value отсутствует, значит, пользователь точно не залогинен.
    if (!user.value) {
      return navigateTo({ path: '/', query: { view: 'profile' } });
    }
    // Если сессия есть (даже анонимная), сервер пропускает запрос дальше.
    // Финальную, более строгую проверку проведет клиент.
    return;
  }

  // 3. Логика для клиента (когда process.server === false)
  const { $auth } = useNuxtApp();

  // Терпеливо ждем, пока наш плагин подтвердит точный статус аутентификации.
  await $auth.waitForAuth();

  const user = useSupabaseUser();

  // Теперь, на клиенте, мы проводим финальную, строгую проверку.
  // Если пользователь не залогинен ИЛИ является анонимом, отправляем на страницу входа.
  if (!user.value || user.value.is_anonymous) {
    return navigateTo({ path: '/', query: { view: 'profile' } });
  }
});