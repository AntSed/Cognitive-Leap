// supabase/functions/set-material-completed/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Заголовки CORS (остаются, как были)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

// Admin-клиент
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// --- ИСПРАВЛЕННАЯ (Более безопасная) ВЕРСИЯ ---
async function getUserFromRequest(req) {
  console.log("Attempting to get user from request...");
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    console.error("No Authorization header found.");
    return null;
  }
  
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error) {
    console.error("Error getting user from token:", error.message);
    return null;
  }
  
  if (!data || !data.user) {
    console.error("No user data returned for token.");
    return null;
  }
  
  console.log("Successfully retrieved user:", data.user.id);
  return data.user;
}

serve(async (req) => {
  // Обработка preflight-запроса OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("Function invoked. Processing request...");
    
    const { materialId, score } = await req.json();
    console.log("Body parsed:", { materialId, score });
    
    const user = await getUserFromRequest(req);
    if (!user) {
      console.error("User is null, throwing 'No user found' error.");
      throw new Error("No user found"); 
    }
    
    console.log(`User ${user.id} is processing material ${materialId}`);

    // ---
    // --- ВОТ ГЛАВНОЕ ИСПРАВЛЕНИЕ (ПРАВИЛЬНЫЙ UPSERT) ---
    // ---
    const { error: dbError } = await supabaseAdmin
      .from("user_material_progress")
      .upsert(
        { // 1. Данные, которые мы вставляем или обновляем
          user_id: user.id,
          material_id: materialId,
          status: "completed",
          score: score,
          completed_at: new Date().toISOString(),
        },
        { // 2. Опция, которая говорит, как обрабатывать конфликт
          onConflict: 'user_id, material_id' // Имена колонок твоего UNIQUE-ключа
        }
      );
    // ---
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
    // ---

    if (dbError) {
      console.error("Database upsert error:", dbError.message);
      throw dbError;
    }

    console.log("Database upsert successful.");

    // 2. Отправка Broadcast ("SMS")
    const channelName = `user-progress:${user.id}`;
    const channel = supabaseAdmin.channel(channelName);
    
    console.log(`Sending broadcast to channel: ${channelName}`);
    const broadcastStatus = await channel.send({
      type: "broadcast",
      event: "progress_updated",
      payload: { 
        materialId: materialId, 
        timestamp: Date.now() 
      },
    });

    console.log("Broadcast sent, status:", broadcastStatus);

    // Успешный ответ
    return new Response(
      JSON.stringify({ status: "ok", broadcast: broadcastStatus }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("--- Function CRASHED ---");
    console.error(err.message);
    // Ответ с ошибкой
    return new Response(String(err?.message ?? err), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});