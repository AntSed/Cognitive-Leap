import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Resend } from 'npm:resend';

// Импортируем наши переводы
import en from './en.json' assert { type: 'json' };
import ru from './ru.json' assert { type: 'json' };
import es from './es.json' assert { type: 'json' };

const translations = { en, ru, es };

// Инициализируем Resend (рекомендуемый Supabase сервис для email)
const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } });
  }

  try {
    const { email, locale } = await req.json();
    const lang = translations[locale] ? locale : 'en'; // Фоллбэк на английский
    const t = translations[lang];

    // Создаем админский клиент Supabase, который умеет генерировать ссылки
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Генерируем "магическую ссылку", не отправляя письмо
    const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: '/?view=profile'
    }
    });

    if (linkError) throw linkError;
    const magicLink = data.properties.action_link;

    // 2. Отправляем наше кастомное письмо через Resend
    const { error: sendError } = await resend.emails.send({
      from: 'Cognitive Leap <no-reply@cognitiveleap.app>', 
      to: email,
      subject: t.subject,
      html: `
        <h2>${t.title}</h2>
        <p>${t.body}</p>
        <p style="text-align: center;">
          <a href="${magicLink}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            ${t.buttonText}
          </a>
        </p>
        <p>${t.footer}</p>
      `,
    });

    if (sendError) throw sendError;

    return new Response(JSON.stringify({ message: 'Magic link sent!' }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' },
      status: 400,
    });
  }
});