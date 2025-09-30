import { createClient } from '@/lib/supabase/server';
import { HeaderClient } from './header-client';

type UserProfile = {
  id: string;
  email: string;
  role: 'admin' | 'user';
  display_name: string;
}

export async function Header() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userProfile: UserProfile | null = null;
  let isadmin = false;
  
  if (user) {
      const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
      userProfile = profile as UserProfile | null;
      isadmin = profile?.role === 'admin';
  }

  return (
    <HeaderClient user={user} userProfile={userProfile} isadmin={isadmin} />
  );
}
