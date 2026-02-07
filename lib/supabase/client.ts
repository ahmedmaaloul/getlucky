// lib/supabase/client.ts
// Supabase client for file storage

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Supabase client for browser-side operations
 * Used for file uploads to public buckets
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Upload a file to Supabase Storage
 * @param bucket The storage bucket name (e.g., 'resumes')
 * @param path The file path within the bucket
 * @param file The file to upload
 * @returns Public URL of the uploaded file
 */
export async function uploadFile(
    bucket: string,
    path: string,
    file: File
): Promise<{ url: string | null; error: string | null }> {
    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
            cacheControl: '3600',
            upsert: true,
        });

    if (error) {
        console.error('Supabase upload error:', error);
        return { url: null, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

    return { url: urlData.publicUrl, error: null };
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(
    bucket: string,
    path: string
): Promise<{ success: boolean; error: string | null }> {
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true, error: null };
}
