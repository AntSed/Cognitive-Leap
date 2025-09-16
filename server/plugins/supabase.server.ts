import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // Мы оборачиваем логику в try...catch.
  // Это нормально, что на некоторых самых первых серверных запросах
  // клиент Supabase может быть еще не инициализирован.
  try {
    const user = await serverSupabaseUser(event)
    const client = await serverSupabaseClient(event)

    // Прикрепляем пользователя и клиент к контексту только если они успешно получены
    event.context.supabase = client
    event.context.user = user
  } catch (error) {
    // Эта ошибка ожидаема в некоторых случаях, поэтому мы не "падаем",
    // а просто выводим предупреждение в консоль сервера.
    // Аутентификация будет корректно подхвачена на стороне клиента.
    console.warn('Supabase client not available on server-side for this request.')
  }
})

