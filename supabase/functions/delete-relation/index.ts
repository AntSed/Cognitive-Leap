// File: supabase/functions/delete-relation/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// --- MAIN EDGE FUNCTION ---
Deno.serve(async (req) => {
  // Handle CORS preflight requests.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. --- Initialization and Authentication ---
    // Initialize the Supabase admin client.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the user object from the JWT to identify who is making the request.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: getUserError } = await supabaseAdmin.auth.getUser(jwt);
    if (getUserError || !user) {
      throw new Error("Authentication failed: Could not retrieve user from token.");
    }

    // 2. --- Body Validation ---
    // Get the IDs of the relationship to be deleted from the request body.
    const body = await req.json();
    const { student_id, curator_id } = body;
    if (!student_id || !curator_id) {
      throw new Error("Request body must include both 'student_id' and 'curator_id'.");
    }

    // 3. --- Authorization Check ---
    // This is the essential security check. We ensure that the person making the request
    // is one of the two people involved in the relationship. This prevents a user
    // from deleting connections that do not belong to them.
    if (user.id !== student_id && user.id !== curator_id) {
      // If the user's ID is not the student's ID AND not the curator's ID, reject the request.
      return new Response(JSON.stringify({ error: "You are not authorized to delete this relationship." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403, // 403 Forbidden is the appropriate status code for authorization errors.
      });
    }

    // 4. --- Delete the Relationship ---
    // If the authorization check passes, proceed with deleting the row.
    const { error: deleteError } = await supabaseAdmin
      .from('student_curator_relations')
      .delete()
      .eq('student_id', student_id)
      .eq('curator_id', curator_id);

    if (deleteError) {
      console.error("Error deleting relation:", deleteError);
      throw new Error("Failed to delete the relationship from the database.");
    }

    // 5. --- Return Success Response ---
    console.log(`Successfully deleted relation between student ${student_id} and curator ${curator_id}`);
    return new Response(JSON.stringify({ message: "Relationship deleted successfully!" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // Catch-all error handler.
    console.error('--- FUNCTION CRASHED ---', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});