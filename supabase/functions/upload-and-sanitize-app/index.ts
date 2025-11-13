import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import JSZip from 'https://esm.sh/jszip@3.10.1';
import { JSDOM } from 'https://esm.sh/jsdom@22.1.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const coreDataString = formData.get('coreData') as string;
    // FIX 1: Read 'lessonIds' (plural) which is a JSON string of an array
    const lessonIdsString = formData.get('lessonIds') as string | null;
    
    if (!file) throw new Error("File not provided.");
    if (!coreDataString) throw new Error("Core data not provided.");
    
    const coreData = JSON.parse(coreDataString);
    const zip = await JSZip.loadAsync(file.arrayBuffer());
    
    // ... (весь код для работы с ZIP-архивом остается без изменений) ...
    let mainHtmlFile: { relativePath: string; zipEntry: JSZip.JSZipObject } | null = null;
    for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
      if (!zipEntry.dir && relativePath.toLowerCase().endsWith('.html') && !relativePath.includes('/')) {
        if (mainHtmlFile) {
          throw new Error('More than one HTML file found in the root of the archive.');
        }
        mainHtmlFile = { relativePath, zipEntry };
      }
    }
    if (!mainHtmlFile) {
      throw new Error('No HTML file found in the root of the zip archive.');
    }

    const materialId = crypto.randomUUID();
    const indexHtmlContent = await mainHtmlFile.zipEntry.async('string');
    const uploadPromises = [];
    const publicUrlMap = new Map<string, string>();
    const storagePath = `public/apps/${materialId}`;

    for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir || relativePath === mainHtmlFile.relativePath) continue;
      
      const fileContent = await zipEntry.async('arraybuffer');
      const contentType = getMimeType(relativePath);
      
      const uploadPromise = supabaseClient.storage
        .from('learning_materials')
        .upload(`${storagePath}/${relativePath}`, fileContent, { contentType, upsert: true })
        .then(({ data, error }) => {
          if (error) throw error;
          const { publicUrl } = supabaseClient.storage.from('learning_materials').getPublicUrl(data.path).data;
          publicUrlMap.set(relativePath, publicUrl);
        });
      uploadPromises.push(uploadPromise);
    }

    await Promise.all(uploadPromises);

    const dom = new JSDOM(indexHtmlContent);
    const document = dom.window.document;
    
    document.querySelectorAll('[src]').forEach(el => {
        const originalPath = el.getAttribute('src');
        if (originalPath && !originalPath.startsWith('http') && !originalPath.startsWith('//')) {
            const normalizedPath = originalPath.startsWith('./') ? originalPath.substring(2) : originalPath;
            if (publicUrlMap.has(normalizedPath)) {
                el.setAttribute('src', publicUrlMap.get(normalizedPath)!);
            }
        }
    });
    document.querySelectorAll('link[href]').forEach(el => {
        const originalPath = el.getAttribute('href');
        if (originalPath && !originalPath.startsWith('http') && !originalPath.startsWith('//')) {
            const normalizedPath = originalPath.startsWith('./') ? originalPath.substring(2) : originalPath;
            if (publicUrlMap.has(normalizedPath)) {
                el.setAttribute('href', publicUrlMap.get(normalizedPath)!);
            }
        }
    });

    const finalHtmlContent = dom.serialize();
    
    // FIX 2: Manually construct the insert payload to format 'languages' correctly
    const materialToInsert = {
      id: materialId,
      developer_id: coreData.developer_id,
      material_type: coreData.material_type,
      title_translations: coreData.title_translations,
      description_translations: coreData.description_translations,
      // This formats ['en', 'es'] into '{en,es}' for Postgres
      languages: `{${coreData.languages.join(',')}}`,
      recommended_age_min: coreData.recommended_age_min,
      recommended_age_max: coreData.recommended_age_max,
      status: coreData.status,
      url: `${storagePath}/${mainHtmlFile.relativePath}`,
      html_content: finalHtmlContent,
      material_purpose: coreData.material_purpose
    };

    const { data: dbData, error: dbError } = await supabaseClient
      .from('learning_apps')
      .insert(materialToInsert)
      .select()
      .single();
      
    if (dbError) throw dbError;

// FIX 3: Handle multiple lesson attachments
    if (lessonIdsString) {
      const lessonIds = JSON.parse(lessonIdsString);
      if (Array.isArray(lessonIds) && lessonIds.length > 0) {
        
        const { error: linkError } = await supabaseClient
            .rpc('link_material_to_lessons', {
                p_material_id: materialId,
                p_lesson_ids: lessonIds,
                p_material_purpose: coreData.material_purpose // 'purpose' уже есть в coreData
            });
            
        if (linkError) throw linkError;
      }
    }

    return new Response(JSON.stringify(dbData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in Edge Function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

function getMimeType(filename: string): string {
    // ... (getMimeType function remains unchanged) ...
    if (filename.endsWith('.js')) return 'application/javascript';
    if (filename.endsWith('.css')) return 'text/css';
    if (filename.endsWith('.png')) return 'image/png';
    if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg';
    if (filename.endsWith('.gif')) return 'image/gif';
    if (filename.endsWith('.svg')) return 'image/svg+xml';
    if (filename.endsWith('.html')) return 'text/html';
    return 'application/octet-stream';
}
