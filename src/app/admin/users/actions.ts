
'use server';

import { createClient as createAdminClient } from '@supabase/supabase-js';

export type UserProfileInfo = {
    id: string;
    display_name: string;
    email: string;
    created_at: string;
}

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function getAllUsers(): Promise<{ success: boolean; users?: UserProfileInfo[]; message: string }> {
    const { data: usersData, error: usersError } = await supabaseAdmin
        .from('users')
        .select('id, display_name, email, created_at')
        .order('created_at', { ascending: true });

    if (usersError) {
        console.error('Error fetching all users:', usersError);
        return { success: false, message: 'Could not fetch users.' };
    }

    return { success: true, users: usersData, message: 'Users fetched successfully.' };
}
