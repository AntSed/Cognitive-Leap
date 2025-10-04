import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Expect `userLocale` in the request body now
    const { userId, userProgress, userAge, userLocale } = await req.json();

    if (!userId) {
      throw new Error("User ID is required.");
    }

    // Call our SQL function, it will still return the full JSONB object
    const { data: tipObject, error } = await supabaseAdmin.rpc('get_random_weighted_tip', {
      p_user_id: userId,
      p_user_progress: userProgress,
      p_user_age: userAge
    });

    if (error) {
      throw error;
    }

    // If no tip was found, return null
    if (!tipObject) {
      return new Response(JSON.stringify(null), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // --- NEW LOGIC: Select the correct language string ---
    // Use the provided locale, or fallback to 'en' if not found.
    const tipForLocale = tipObject[userLocale] || tipObject['en'];

    return new Response(JSON.stringify(tipForLocale), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    return new Response(String(err?.message ?? err), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

