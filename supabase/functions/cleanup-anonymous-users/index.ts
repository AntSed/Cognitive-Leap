import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Важно: Эта функция требует прав администратора (service_role_key)
// для удаления пользователей.

Deno.serve(async (req) => {
  try {
    // Создаем админский клиент Supabase
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Находим всех анонимных пользователей для удаления
    const { data: usersToDelete, error: selectError } = await supabaseAdmin.rpc('get_anonymous_users_to_delete');

    if (selectError) {
      throw selectError;
    }
    
    if (!usersToDelete || usersToDelete.length === 0) {
      return new Response(JSON.stringify({ message: "No anonymous users to delete." }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 2. Удаляем каждого найденного пользователя
    const deletionPromises = usersToDelete.map(user => 
      supabaseAdmin.auth.admin.deleteUser(user.id)
    );
    
    await Promise.all(deletionPromises);
    
    const message = `Successfully deleted ${usersToDelete.length} anonymous users.`;
    console.log(message);

    return new Response(JSON.stringify({ message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error cleaning up anonymous users:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

// Для работы этой функции нужно создать хранимую процедуру в SQL Editor,
// которая будет выполнять наш сложный запрос:
/*
  CREATE OR REPLACE FUNCTION get_anonymous_users_to_delete()
  RETURNS TABLE (id uuid)
  LANGUAGE sql
  SECURITY DEFINER -- Важно!
  AS $$
    SELECT u.id
    FROM auth.users u
    WHERE
      u.is_anonymous = true
      AND (
        (
          NOT EXISTS (SELECT 1 FROM public.user_progress up WHERE up.user_id = u.id)
          AND u.last_sign_in_at < (now() - interval '24 hours')
        )
        OR
        (
          EXISTS (SELECT 1 FROM public.user_progress up WHERE up.user_id = u.id)
          AND u.last_sign_in_at < (now() - interval '7 days')
        )
      );
  $$;
*/