'use client';

import { useEffect } from 'react';
import { useFormState } from 'react-dom';
import Link from 'next/link';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CardContent, CardFooter } from '@/components/ui/card';
import { SubmitButton } from './submit-button';
import { signIn } from './actions';

export function LoginForm({ searchParams }: { searchParams: { message: string } }) {
  const initialState = { success: false, message: searchParams?.message || '' };
  const [state, formAction] = useFormState(signIn, initialState);

  useEffect(() => {
    if (state?.success) {
      // This forces a full page refresh and navigation to the home page.
      window.location.href = '/';
    }
  }, [state]);

  return (
    <>
      <CardContent>
        <form action={formAction} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" name="email" type="email" placeholder="you@example.com" required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" placeholder="••••••••" required />
            </div>
          </div>
          <SubmitButton className="w-full" pendingText="Signing In...">
            Sign In
          </SubmitButton>
          {state?.message && !state.success && (
            <p className="mt-4 p-4 bg-destructive/10 text-destructive text-center">
              {state.message}
            </p>
          )}
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            Sign Up
          </Link>
        </p>
      </CardFooter>
    </>
  );
}
