
import { createClient } from '@/lib/supabase/server';
import { HeaderClient } from './header-client';
import { cookies } from 'next/headers';
import type { HeaderDisplayMode } from '@/app/admin/settings/actions';

type UserProfile = {
  id: string;
  email: string;
  role: 'admin' | 'user';
  display_name: string;
}

type HeaderProps = {
  siteName: string;
  logoUrl: string | null | undefined;
  displayMode: HeaderDisplayMode;
};

export async function Header({ siteName, logoUrl, displayMode }: HeaderProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
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
    <HeaderClient user={user} userProfile={userProfile} isadmin={isadmin} siteName={siteName} logoUrl={logoUrl} displayMode={displayMode} />
  );
}
