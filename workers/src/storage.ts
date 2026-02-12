
import { createClient } from '@supabase/supabase-js';
import { Env } from './index';
// import { Buffer } from 'node:buffer'; // Remove explicit import if causing issues with bundling

export async function uploadToStorage(
    env: Env,
    file: ArrayBuffer | ArrayBufferView | Blob | File | FormData | ReadableStream | string,
    fileName: string,
    contentType: string
): Promise<string | null> {
    try {
        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

        // Ensure unique filename
        const uniquePath = `${Date.now()}_${fileName}`;

        const { data, error } = await supabase.storage
            .from('public-assets')
            .upload(uniquePath, file, {
                contentType,
                upsert: false
            });

        if (error) {
            console.error('Storage Upload Error:', error);
            return null;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('public-assets')
            .getPublicUrl(uniquePath);

        return publicUrl;
    } catch (e) {
        console.error('Upload Exception:', e);
        return null;
    }
}
