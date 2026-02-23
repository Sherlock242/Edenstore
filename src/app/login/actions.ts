'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

type SignInResponse = {
  success: boolean;
  message: string;
};

export async function signIn(
  prevState: SignInResponse | null,
  formData: FormData
): Promise<SignInResponse> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      success: false,
      message: `Could not authenticate user: ${error.message}`,
    };
  }

  return { success: true, message: 'Successfully signed in!' };
}
