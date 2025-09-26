
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// This client is safe to use in the browser
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Automatically refreshes the session token in the background
    autoRefreshToken: true,
    // Persists the session in the browser's local storage
    persistSession: true,
    // Detects when the same user logs in from multiple tabs
    detectSessionInUrl: true,
  },
});
