
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { type ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/cookies';

const HERO_IMAGE_KEY = 'heroImageUrl';
const SITE_NAME_KEY = 'siteName';
const SITE_LOGO_KEY = 'siteLogoUrl';
const HEADER_DISPLAY_MODE_KEY = 'headerDisplayMode';
const ANNOUNCEMENT_ENABLED_KEY = 'announcementBarEnabled';
const ANNOUNCEMENT_MESSAGE_KEY = 'announcementBarMessage';


type ServerResponse = {
    success: boolean;
    message: string;
    url?: string | null;
    error?: { message: string } | null;
}

export type HeaderDisplayMode = 'title' | 'logo' | 'both';
export type AnnouncementSettings = {
    enabled: boolean;
    message: string;
};


export async function getHeroImageUrl(cookieStore: ReadonlyRequestCookies): Promise<{ success: boolean; url?: string | null; message: string; }> {
    const supabase = createClient(cookieStore);
    const { data, error } = await supabase
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

export async function updateHeroImage(cookieStore: ReadonlyRequestCookies, image: File): Promise<ServerResponse> {
    const supabase = createClient(cookieStore);
    const bucketName = 'product-images';

    // 1. Fetch the old image URL to delete it later
    const { data: oldSetting } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', HERO_IMAGE_KEY)
        .single();

    const oldImageUrl = oldSetting?.value;

    // 2. Upload the new image to Supabase Storage
    const fileExt = image.name.split('.').pop();
    const fileName = `hero-image-${Date.now()}.${fileExt}`;
    const filePath = `site-assets/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, image);

    if (uploadError) {
        console.error('Error uploading hero image:', uploadError);
        return { success: false, message: 'Failed to upload new hero image.', error: { message: uploadError.message } };
    }

    // 3. Get the public URL for the newly uploaded image
    const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

    if (!urlData) {
        return { success: false, message: 'Failed to get new image URL.' };
    }
    
    const newImageUrl = urlData.publicUrl;

    // 4. Update or insert the setting in the 'site_settings' table
    const { error: upsertError } = await supabase
        .from('site_settings')
        .upsert({ key: HERO_IMAGE_KEY, value: newImageUrl });

    if (upsertError) {
        console.error('Error upserting hero image URL:', upsertError);
        // Attempt to clean up the newly uploaded image if the DB operation fails
        await supabase.storage.from(bucketName).remove([filePath]);
        return { success: false, message: 'Failed to save new hero image setting.', error: { message: upsertError.message } };
    }

    // 5. Delete the old image from storage, if it existed
    if (oldImageUrl) {
        try {
            const url = new URL(oldImageUrl);
            // The path is everything after the bucket name in the URL's pathname.
            // e.g., for ".../product-images/site-assets/hero-image-123.jpg", the path is "site-assets/hero-image-123.jpg"
            const pathStartIndex = url.pathname.indexOf(bucketName) + bucketName.length + 1;
            const oldImagePath = url.pathname.substring(pathStartIndex);
            
            if (oldImagePath) {
              const { error: removeError } = await supabase.storage.from(bucketName).remove([oldImagePath]);
              if (removeError) {
                  // Don't fail the whole operation, but log the error.
                  console.error("Failed to delete old hero image, but continuing:", removeError.message);
              }
            }
        } catch (e) {
            console.error("Failed to parse or delete old hero image, but continuing:", e);
        }
    }

    revalidatePath('/'); // Revalidate the homepage to show the new image

    return {
        success: true,
        message: 'Hero image updated successfully!',
        url: newImageUrl,
    };
}


export async function getSiteName(cookieStore: ReadonlyRequestCookies): Promise<string> {
    const supabase = createClient(cookieStore);
    const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', SITE_NAME_KEY)
        .single();
    
    if (error && error.code !== 'PGRST116') {
        // This log was causing noise when the setting didn't exist.
        // The fallback handles this case gracefully.
    }

    return data?.value || 'ANISTORE'; // Return default if not found
}

export async function updateSiteName(cookieStore: ReadonlyRequestCookies, newName: string): Promise<{success: boolean; message: string}> {
    const supabase = createClient(cookieStore);
    if (!newName || newName.trim().length === 0) {
        return { success: false, message: 'Site name cannot be empty.' };
    }

    const { error } = await supabase
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

export async function getSiteLogoUrl(cookieStore: ReadonlyRequestCookies): Promise<{ success: boolean; url?: string | null; message: string; }> {
    const supabase = createClient(cookieStore);
    const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', SITE_LOGO_KEY)
        .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = 'exact one row not found'
        return { success: false, message: 'Could not fetch site logo setting.' };
    }

    return { success: true, url: data?.value, message: 'Fetched successfully.' };
}

export async function updateSiteLogo(cookieStore: ReadonlyRequestCookies, image: File): Promise<ServerResponse> {
    const supabase = createClient(cookieStore);
    const bucketName = 'product-images';

    // 1. Fetch the old image URL to delete it later
    const { data: oldSetting } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', SITE_LOGO_KEY)
        .single();

    const oldLogoUrl = oldSetting?.value;

    // 2. Upload the new image to Supabase Storage
    const fileExt = image.name.split('.').pop();
    const fileName = `site-logo-${Date.now()}.${fileExt}`;
    const filePath = `site-assets/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, image);

    if (uploadError) {
        return { success: false, message: 'Failed to upload new logo.', error: { message: uploadError.message } };
    }

    // 3. Get the public URL
    const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

    if (!urlData) {
        return { success: false, message: 'Failed to get new logo URL.' };
    }
    
    const newLogoUrl = urlData.publicUrl;

    // 4. Update or insert the setting
    const { error: upsertError } = await supabase
        .from('site_settings')
        .upsert({ key: SITE_LOGO_KEY, value: newLogoUrl });

    if (upsertError) {
        await supabase.storage.from(bucketName).remove([filePath]);
        return { success: false, message: 'Failed to save new logo setting.', error: { message: upsertError.message } };
    }

    // 5. Delete the old image
    if (oldLogoUrl) {
        try {
            const url = new URL(oldLogoUrl);
            const pathStartIndex = url.pathname.indexOf(bucketName) + bucketName.length + 1;
            const oldImagePath = url.pathname.substring(pathStartIndex);
            if (oldImagePath) {
              const { error: removeError } = await supabase.storage.from(bucketName).remove([oldImagePath]);
              if (removeError) {
                  console.error("Failed to delete old logo, but continuing:", removeError.message);
              }
            }
        } catch (e) {
            console.error("Failed to parse or delete old logo, but continuing:", e);
        }
    }

    revalidatePath('/', 'layout');

    return {
        success: true,
        message: 'Site logo updated successfully!',
        url: newLogoUrl,
    };
}

export async function getHeaderDisplayMode(cookieStore: ReadonlyRequestCookies): Promise<HeaderDisplayMode> {
    const supabase = createClient(cookieStore);
    const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', HEADER_DISPLAY_MODE_KEY)
        .single();
    
    if (error && error.code !== 'PGRST116') {
    }

    return (data?.value as HeaderDisplayMode) || 'title'; // Default to 'title'
}

export async function updateHeaderDisplayMode(cookieStore: ReadonlyRequestCookies, mode: HeaderDisplayMode): Promise<{success: boolean; message: string}> {
    const supabase = createClient(cookieStore);

    const { error } = await supabase
        .from('site_settings')
        .upsert({ key: HEADER_DISPLAY_MODE_KEY, value: mode });

    if (error) {
        console.error('Error updating header display mode:', error);
        return { success: false, message: 'Failed to update header display mode.' };
    }

    revalidatePath('/', 'layout');

    return { success: true, message: 'Header display updated successfully!' };
}

export async function getAnnouncementBarSettings(cookieStore: ReadonlyRequestCookies): Promise<AnnouncementSettings> {
    const supabase = createClient(cookieStore);
    const { data, error } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', [ANNOUNCEMENT_ENABLED_KEY, ANNOUNCEMENT_MESSAGE_KEY]);

    if (error) {
    }

    const settings = new Map(data?.map(item => [item.key, item.value]));

    return {
        enabled: settings.get(ANNOUNCEMENT_ENABLED_KEY) === 'true',
        message: settings.get(ANNOUNCEMENT_MESSAGE_KEY) || "Get 10% off using coupon code AKATSU10"
    };
}

export async function updateAnnouncementBarSettings(cookieStore: ReadonlyRequestCookies, settings: AnnouncementSettings): Promise<{success: boolean; message: string}> {
    const supabase = createClient(cookieStore);

    const { error } = await supabase
        .from('site_settings')
        .upsert([
            { key: ANNOUNCEMENT_ENABLED_KEY, value: settings.enabled.toString() },
            { key: ANNOUNCEMENT_MESSAGE_KEY, value: settings.message }
        ]);

    if (error) {
        console.error('Error updating announcement settings:', error);
        return { success: false, message: 'Failed to update announcement settings.' };
    }

    revalidatePath('/', 'layout');

    return { success: true, message: 'Announcement bar settings updated successfully!' };
}


    

    




    
