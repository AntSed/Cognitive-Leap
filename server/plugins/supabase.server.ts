import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // Wrap logic in try...catch.
  // It's normal for the Supabase client not to be initialized for some initial server requests.
  try {
    const user = await serverSupabaseUser(event)
    const client = await serverSupabaseClient(event)

    // Attach user and client to the context only if successfully retrieved.
    event.context.supabase = client
    event.context.user = user
  } catch (error) {
    // This error is expected in some cases, so we just output a warning.
    // Authentication will be correctly handled on the client side.
    console.warn('Supabase client not available on server-side for this request.')
  }
})

