// server/api/upload-prepare.post.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { serverSupabaseClient } from '#supabase/server'
import { H3Event } from 'h3'
import type { Database } from '~/types/supabase' 

// 1. R2 CONFIGURATION.
// These variables should be in your .env file.
const {
  R2_ENDPOINT,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
  R2_PUBLIC_DOMAIN, // https://previews.cognitiveleap.app
} = process.env

const r2 = new S3Client({
  endpoint: R2_ENDPOINT!,
  region: 'auto',
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID!,
    secretAccessKey: R2_SECRET_ACCESS_KEY!,
  },
})

/**
 * Checks if the current user has permission to edit the preview.
 * Logic:
 * 1. User must exist.
 * 2. User is an admin (hub_role === 'admin').
 * 3. OR User is 'developer_id' of this 'learning_apps'.
 */
async function checkPermissions(event: H3Event, materialId: string): Promise<boolean> {
  const client = await serverSupabaseClient<Database>(event)
  const { data: { user } } = await client.auth.getUser()
  if (!user) return false
  
  // 1. Check if user is an admin.
  const { data: profileData } = await client
    .from('user_profiles')
    .select('hub_role')
    .eq('user_id', user.id)
    .single()

  // Assuming the admin role is 'admin'. Change if different (e.g., 'owner', 'manager').
  if (profileData?.hub_role === 'admin') return true

  // 2. If not an admin, check if they own the material.
  const { data: materialData } = await client
    .from('learning_apps')
    .select('developer_id')
    .eq('id', materialId)
    .single()

  if (materialData?.developer_id === user.id) return true
  
  // If neither, access is denied.
  return false
}

export default defineEventHandler(async (event) => {
  const { materialId, contentType } = await readBody(event)

  if (!materialId || !contentType) {
    throw createError({ statusCode: 400, message: 'Missing materialId or contentType' })
  }

  // 1. SECURITY: Check permissions using new, precise logic.
  const hasPermission = await checkPermissions(event, materialId)
  if (!hasPermission) {
    throw createError({ statusCode: 403, message: 'Forbidden: You cannot edit this material' })
  }

  // 2. PATH GENERATION.
  // Path will be: previews/<material_id>/cover.webp.
  const key = `previews/${materialId}/cover.webp`
  const publicUrl = `${R2_PUBLIC_DOMAIN}/${key}`

  // 3. CREATE PRESIGNED URL FOR UPLOAD (PUT).
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType, // 'image/webp'
  })

  try {
    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 }) // 5 minutes expiration.

    return {
      uploadUrl,  // One-time link for PUT operation.
      publicUrl,  // Permanent link for database storage.
    }
  } catch (err) {
    console.error('Error creating presigned URL:', err)
    throw createError({ statusCode: 500, message: 'Could not prepare upload' })
  }
})
