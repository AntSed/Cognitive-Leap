// server/api/upload-prepare.post.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { serverSupabaseClient } from '#supabase/server'
import { H3Event } from 'h3'
import type { Database } from '~/types/supabase' 

// 1. КОНФИГУРАЦИЯ R2
// Эти переменные должны быть в твоем .env
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
 * Проверяет, имеет ли текущий пользователь право редактировать превью.
 * Логика:
 * 1. Пользователь должен существовать.
 * 2. Пользователь является админом (hub_role === 'admin').
 * 3. ИЛИ Пользователь является 'developer_id' этой 'learning_apps'.
 */
async function checkPermissions(event: H3Event, materialId: string): Promise<boolean> {
  const client = await serverSupabaseClient<Database>(event)
  const { data: { user } } = await client.auth.getUser()
  if (!user) return false
  
  // 1. Проверяем, админ ли пользователь
  const { data: profileData } = await client
    .from('user_profiles')
    .select('hub_role')
    .eq('user_id', user.id)
    .single()

  // Я предполагаю, что роль админа называется 'admin'.
  // Если она называется иначе (например, 'owner', 'manager'), измени здесь.
  if (profileData?.hub_role === 'admin') return true

  // 2. Если не админ, проверяем, владелец ли он материала
  const { data: materialData } = await client
    .from('learning_apps')
    .select('developer_id')
    .eq('id', materialId)
    .single()

  if (materialData?.developer_id === user.id) return true
  
  // Если ни то, ни другое - доступ запрещен
  return false
}

export default defineEventHandler(async (event) => {
  const { materialId, contentType } = await readBody(event)

  if (!materialId || !contentType) {
    throw createError({ statusCode: 400, message: 'Missing materialId or contentType' })
  }

  // 1. БЕЗОПАСНОСТЬ: Проверяем права по новой, точной логике
  const hasPermission = await checkPermissions(event, materialId)
  if (!hasPermission) {
    throw createError({ statusCode: 403, message: 'Forbidden: You cannot edit this material' })
  }

  // 2. ГЕНЕРАЦИЯ ПУТИ
  // Путь будет: previews/<material_id>/cover.webp
  // R2_PUBLIC_DOMAIN = https://previews.cognitiveleap.app
  const key = `previews/${materialId}/cover.webp`
  const publicUrl = `${R2_PUBLIC_DOMAIN}/${key}`

  // 3. СОЗДАНИЕ PRESIGNED URL ДЛЯ ЗАГРУЗКИ (PUT)
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType, // 'image/webp'
  })

  try {
    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 }) // 5 минут

    return {
      uploadUrl,  // Одноразовая ссылка для PUT
      publicUrl,  // Постоянная ссылка для БД
    }
  } catch (err) {
    console.error('Error creating presigned URL:', err)
    throw createError({ statusCode: 500, message: 'Could not prepare upload' })
  }
})
