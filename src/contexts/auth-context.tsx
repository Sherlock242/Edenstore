
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { type User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";


type UserProfile = {
  id: string;
  email: string;
  role: 'admin' | 'user';
  display_name: string;
}

type AuthContextType = {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isadmin: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isadmin, setIsAdmin] = useState(false);
  const supabase = createClient();
  const router = useRouter();


  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setLoading(true);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentUser.id)
            .single();
          setUserProfile(profile as UserProfile | null);
          setIsAdmin(profile?.role === 'admin');
        } else {
          setUserProfile(null);
          setIsAdmin(false);
        }
        
        setLoading(false);
        router.refresh();
      }
    );
    
    // This handles the initial session check on component mount.
    const checkInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
         setUser(session.user);
         const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          setUserProfile(profile as UserProfile | null);
          setIsAdmin(profile?.role === 'admin');
      }
      setLoading(false);
    }
    checkInitialSession();


    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, router]);

  const value = { user, userProfile, loading, isadmin };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
