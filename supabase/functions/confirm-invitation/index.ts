// File: supabase/functions/confirm-invitation/index.ts

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
    // Initialize the Supabase admin client to perform privileged operations.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the user object from the JWT sent by the client.
    // This is crucial to identify who is performing the action.
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
    // Get the unique ID of the relationship row from the request body.
    const body = await req.json();
    const { relation_id } = body;
    if (!relation_id) {
      throw new Error("Request body is missing the required 'relation_id' field.");
    }

    // 3. --- Find the Invitation and Authorize the Action ---
    // Find the specific pending relationship using its unique primary key.
    const { data: relation, error: findError } = await supabaseAdmin
      .from('student_curator_relations')
      .select('student_id, curator_id, invitee_email, status')
      .eq('id', relation_id)
      .single();

    if (findError || !relation) {
      throw new Error(`No pending invitation found for ID: ${relation_id}`);
    }

    // CRITICAL SECURITY CHECK: Ensure the user performing this action is the one who was invited.
    if (user.email !== relation.invitee_email) {
      return new Response(JSON.stringify({ error: "Authorization error: Only the invited user can accept the invitation." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403, // 403 Forbidden
      });
    }

    // If the invitation was already accepted, do nothing and return success.
    if (relation.status === 'active') {
      return new Response(JSON.stringify({ message: "This invitation has already been accepted." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 4. --- Prepare and Activate the Connection ---
    // Create an 'updates' object. This will hold the data to be changed.
    const updates = {
      status: 'active',
      invitee_email: null, // The email is no longer needed; the connection is now based on IDs.
    };

    // Determine which ID field was NULL and fill it with the current user's ID.
    if (relation.student_id === null) {
      updates.student_id = user.id;
    } else if (relation.curator_id === null) {
      updates.curator_id = user.id;
    } else {
      // This case should not happen if the status is 'pending' from our invite-user function, but it's a good safeguard.
      throw new Error("Data inconsistency: a pending relation already has both user IDs set.");
    }

    // Perform the update on the specific row using its unique ID.
    const { error: updateError } = await supabaseAdmin
      .from('student_curator_relations')
      .update(updates)
      .eq('id', relation_id);

    if (updateError) {
      console.error("Error updating relation:", updateError);
      throw new Error("Failed to update the relationship in the database.");
    }

    // 5. --- Return Success Response ---
    console.log(`Successfully confirmed relation row with ID ${relation_id}`);
    return new Response(JSON.stringify({ message: "Invitation confirmed successfully!" }), {
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