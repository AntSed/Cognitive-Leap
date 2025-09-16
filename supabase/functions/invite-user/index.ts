import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { Resend } from 'npm:resend'

// --- ИМПОРТ СЛОВАРЕЙ ---
// Теперь все тексты живут в отдельных JSON файлах.
import ru from './ru.json' assert { type: 'json' }
import en from './en.json' assert { type: 'json' }
import es from './es.json' assert { type: 'json' }

const translations = { ru, en, es };

// --- ГЛАВНАЯ ФУНКЦИЯ ---
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. --- Инициализация и валидация ---
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const body = await req.json();
    const { inviteeEmail, inviterId, inviterName, inviterLang, inviteType, relationType } = body;
    const siteUrl = Deno.env.get('SITE_URL');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!inviteeEmail || !inviterId || !inviterName || !inviterLang || !inviteType || !relationType || !siteUrl || !resendApiKey) {
      throw new Error("Missing required fields or environment variables.");
    }

    // 2. --- Подготовка данных для записи в БД ---
    let studentId = null;
    let curatorId = null;

    if (inviteType === 'curator') {
      studentId = inviterId;
    } else { // inviteType === 'student'
      curatorId = inviterId;
    }

    // 3. --- Создание/обновление записи о приглашении ---
    const { error: upsertError } = await supabaseAdmin.from('student_curator_relations').upsert({
      student_id: studentId,
      curator_id: curatorId,
      relation_type: relationType,
      status: 'pending',
      invitee_email: inviteeEmail.toLowerCase().trim()
    }, { onConflict: 'student_id,curator_id' });

    if (upsertError) throw upsertError;

    // 4. --- Проверка пользователя и отправка письма ---
    const { data: { users }, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers({ email: inviteeEmail });
    if (listUsersError) throw listUsersError;
    const existingUser = users?.[0] || null;

    if (existingUser) {
      // Сценарий A: Пользователь существует. Отправляем Magic Link через Resend.
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: inviteeEmail,
        options: { redirectTo: '/accept-invitation' }
      });
      if (linkError) throw linkError;

      // --- ЛОГИКА РАБОТЫ СО СЛОВАРЯМИ ---
      const lang = translations[inviterLang] ? inviterLang : 'en'; // Фоллбэк на английский
      const t = translations[lang];

      const subject = t.subject.replace('{{inviterName}}', inviterName);
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; color: #333;">
          <h2 style="color: #0056b3;">${t.title}</h2>
          <p>${t.greeting}</p>
          <p>${t.body.replace('{{inviterName}}', `<b>${inviterName}</b>`)}</p>
          <p>${t.callToAction}</p>
          <a href="${linkData.properties.action_link}" style="display: inline-block; padding: 12px 24px; margin: 20px 0; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
            ${t.buttonText}
          </a>
        </div>`;

      // Инициализация Resend и отправка письма
      const resend = new Resend(resendApiKey);
      await resend.emails.send({
        from: 'Cognitive Leap <noreply@cognitiveleap.app>',
        to: inviteeEmail,
        subject: subject,
        html: htmlBody,
      });

    } else {
      // Сценарий B: Новый пользователь. Используем стандартный инвайт Supabase.
      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        inviteeEmail, 
        { options: { redirectTo: `${siteUrl}/accept-invitation` } }
      );
      if (inviteError) throw inviteError;
    }

    return new Response(JSON.stringify({ message: `Invitation process initiated for ${inviteeEmail}` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('--- FUNCTION CRASHED ---', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});