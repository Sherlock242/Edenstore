'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { type z } from 'zod';
import type { loginSchema, signupSchema } from '@/lib/zod-schemas';

type LoginResponse = {
    success: boolean;
    message: string;
}

export async function login(values: z.infer<typeof loginSchema>): Promise<LoginResponse> {
  const origin = headers().get('origin');
  const email = values.email;
  const password = values.password;
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, message: error.message || "Could not authenticate user." };
  }

  revalidatePath('/', 'layout');
  return { success: true, message: "Logged in successfully." };
}

type SignupResponse = {
    success: boolean;
    message: string;
}

export async function signup(values: z.infer<typeof signupSchema>): Promise<SignupResponse> {
    const origin = headers().get('origin');
    const email = values.email;
    const password = values.password;
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
        // TODO: This should be a deep link into the app.
        emailRedirectTo: `${origin}/auth/callback`,
        },
    });

    if (error) {
        return { success: false, message: error.message || "Could not sign up user." };
    }

    return { success: true, message: "Check your email to continue the sign-up process." };
}

export async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    redirect('/login');
}
