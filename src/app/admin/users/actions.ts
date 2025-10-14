
'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export type UserProfileInfo = {
    id: string;
    display_name: string;
    email: string;
    created_at: string;
}

export async function getAllUsers(): Promise<{ success: boolean; users?: UserProfileInfo[]; message: string }> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, display_name, email, created_at')
        .order('created_at', { ascending: true });

    if (usersError) {
        console.error('Error fetching all users:', usersError);
        return { success: false, message: 'Could not fetch users.' };
    }

    return { success: true, users: usersData, message: 'Users fetched successfully.' };
}
