
'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const HERO_IMAGE_KEY = 'heroImageUrl';
const SITE_NAME_KEY = 'siteName';

type ServerResponse = {
    success: boolean;
    message: string;
    url?: string | null;
    error?: { message: string } | null;
}

export async function getHeroImageUrl(): Promise<{ success: boolean; url?: string | null; message: string; }> {
    const { data, error } = await supabaseAdmin
        .from('site_settings')
        .select('value')
        .eq('key', HERO_IMAGE_KEY)
        .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = 'exact one row not found'
        console.error('Error fetching hero image URL:', error);
        return { success: false, message: 'Could not fetch hero image setting.' };
    }

    return { success: true, url: data?.value, message: 'Fetched successfully.' };
}

export async function updateHeroImage(image: File): Promise<ServerResponse> {
    // 1. Fetch the old image URL to delete it later
    const { data: oldSetting } = await supabaseAdmin
        .from('site_settings')
        .select('value')
        .eq('key', HERO_IMAGE_KEY)
        .single();

    const oldImageUrl = oldSetting?.value;

    // 2. Upload the new image to Supabase Storage
    const fileExt = image.name.split('.').pop();
    const fileName = `hero-image-${Date.now()}.${fileExt}`;
    const filePath = `site-assets/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
        .from('product-images') // Reusing the same bucket as products for simplicity
        .upload(filePath, image);

    if (uploadError) {
        console.error('Error uploading hero image:', uploadError);
        return { success: false, message: 'Failed to upload new hero image.', error: { message: uploadError.message } };
    }

    // 3. Get the public URL for the newly uploaded image
    const { data: urlData } = supabaseAdmin.storage
        .from('product-images')
        .getPublicUrl(filePath);

    if (!urlData) {
        return { success: false, message: 'Failed to get new image URL.' };
    }
    
    const newImageUrl = urlData.publicUrl;

    // 4. Update or insert the setting in the 'site_settings' table
    const { error: upsertError } = await supabaseAdmin
        .from('site_settings')
        .upsert({ key: HERO_IMAGE_KEY, value: newImageUrl });

    if (upsertError) {
        console.error('Error upserting hero image URL:', upsertError);
        // Attempt to clean up the newly uploaded image if the DB operation fails
        await supabaseAdmin.storage.from('product-images').remove([filePath]);
        return { success: false, message: 'Failed to save new hero image setting.', error: { message: upsertError.message } };
    }

    // 5. Delete the old image from storage, if it existed
    if (oldImageUrl) {
        try {
            const oldImagePath = new URL(oldImageUrl).pathname.split('/product-images/').pop();
            if (oldImagePath) {
                await supabaseAdmin.storage.from('product-images').remove([`product-images/${oldImagePath}`]);
            }
        } catch (e) {
            console.error("Failed to delete old hero image, but continuing:", e)
        }
    }

    revalidatePath('/'); // Revalidate the homepage to show the new image

    return {
        success: true,
        message: 'Hero image updated successfully!',
        url: newImageUrl,
    };
}


export async function getSiteName(): Promise<string> {
    const { data, error } = await supabaseAdmin
        .from('site_settings')
        .select('value')
        .eq('key', SITE_NAME_KEY)
        .single();
    
    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching site name:', error);
    }

    return data?.value || 'ANISTORE'; // Return default if not found
}

export async function updateSiteName(newName: string): Promise<{success: boolean; message: string}> {
    if (!newName || newName.trim().length === 0) {
        return { success: false, message: 'Site name cannot be empty.' };
    }

    const { error } = await supabaseAdmin
        .from('site_settings')
        .upsert({ key: SITE_NAME_KEY, value: newName.trim() });

    if (error) {
        console.error('Error updating site name:', error);
        return { success: false, message: 'Failed to update site name.' };
    }

    // Revalidate the entire site to reflect the new name everywhere
    revalidatePath('/', 'layout');

    return { success: true, message: 'Site name updated successfully!' };
}
