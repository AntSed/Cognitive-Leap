// supabase/functions/resize-thumbnail/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// --- ИЗМЕНЕНИЕ: Возвращаемся к imagescript ---
import { Image } from 'https://deno.land/x/imagescript@1.2.15/mod.ts';

const MAX_WIDTH = 600;
const MAX_SIZE_TO_SKIP = 150 * 1024; // 150KB
const TARGET_BUCKET = 'material-thumbnails';
// --- ИЗМЕНЕНИЕ: Качество JPEG (0-100) ---
const JPEG_QUALITY = 80;

serve(async (req) => {
  try {
    // 1. Create Supabase client
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    // 2. Get file info
    const payload = await req.json();
    const { record } = payload;
    
    if (!record) {
      throw new Error('Invalid payload structure. "record" is missing.');
    }

    const { name: path, bucket_id: bucket } = record;
    
    // 3. --- Фильтр бакета ---
    if (bucket !== TARGET_BUCKET) {
      return new Response(
        JSON.stringify({ message: `Skipping bucket: ${bucket}` }),
        { status: 200 },
      );
    }

    // 4. --- Предохранитель (от петли) ---
    const fileSize = record.metadata?.size;
    if (fileSize && fileSize < MAX_SIZE_TO_SKIP) {
      return new Response(
        JSON.stringify({ message: `File size ${fileSize} is under threshold, skipping.` }),
        { status: 200 },
      );
    }

    // 5. Download the original file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(path);

    if (downloadError) throw downloadError;

    // --- Логика на 'imagescript' ---
    // 6. Decode
    const image = await Image.decode(await fileData.arrayBuffer());

    // 7. Resize
    image.resize(MAX_WIDTH, Image.RESIZE_AUTO);

    // 8. --- ИЗМЕНЕНИЕ: Кодируем в JPEG ---
    // Вместо .encode('webp', ...)
    // Качество 80 должно быть хорошим балансом
    const resizedBuffer = await image.encodeJPEG(JPEG_QUALITY);
    
    // 9. Re-upload (overwrite)
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, resizedBuffer, {
        upsert: true,
        // --- ИЗМЕНЕНИЕ: Новый contentType ---
        contentType: 'image/jpeg',
      });

    if (uploadError) throw uploadError;

    return new Response(
      JSON.stringify({ message: `Resized ${path} to ${resizedBuffer.length} bytes (JPEG)` }),
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
});