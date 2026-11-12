import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { gatewaySignIn } from '@/lib/auth-gateway';
import type { Profile, UserRole } from '@/lib/types';

interface AuthContextType {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role: UserRole, phone: string) => Promise<{ error: string | null }>;
  signIn: (identifier: string, password: string, captchaToken: string) => Promise<{ error: string | null; profile: Profile | null }>;
  signUpWithPhone: (phone: string, password: string, fullName: string, role: UserRole) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionRef = useRef<string | null>(null);

  const loadProfile = async (uid: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    if (error) {
      console.error('Profile load error:', error);
      return null;
    }
    return data as Profile | null;
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (session?.user) {
        sessionRef.current = session.user.id;
        setUser({ id: session.user.id, email: session.user.email || '' });
        const prof = await loadProfile(session.user.id);
        if (!mounted) return;
        if (prof) setProfile(prof);
      }
      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      const uid = session?.user?.id ?? null;

      // Skip duplicate events for the same session user — prevents
      // the race between signIn() setting state and onAuthStateChange
      // firing afterward with the same session.
      if (event === 'SIGNED_IN' && sessionRef.current === uid) return;
      sessionRef.current = uid;

      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '' });
        (async () => {
          const prof = await loadProfile(session.user.id);
          if (!mounted) return;
          if (prof) setProfile(prof);
          else setProfile(null);
          setLoading(false);
        })();
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: UserRole, phone: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role, phone },
      },
    });
    if (error) return { error: error.message };
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName, phone, role })
        .eq('id', data.user.id);
      if (profileError) console.error('Profile update error:', profileError);
    }
    return { error: null };
  };

  const signIn = async (identifier: string, password: string, captchaToken: string) => {
    const gateway = await gatewaySignIn(identifier, password, captchaToken);
    if (gateway.error || !gateway.session) {
      return { error: gateway.error ?? 'Sign in failed. Please try again.', profile: null };
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession(gateway.session);
    const userId = sessionData.user?.id;
    if (sessionError || !userId) {
      return { error: 'Sign in failed. Please try again.', profile: null };
    }

    // Set immediately so ProtectedRoute doesn't bounce back to /login.
    // Track in sessionRef so the duplicate onAuthStateChange SIGNED_IN
    // event is ignored and doesn't race with this profile load.
    sessionRef.current = userId;
    setUser({ id: userId, email: sessionData.user?.email || '' });

    const prof = await loadProfile(userId);
    if (prof) setProfile(prof);
    return { error: null, profile: prof };
  };

  const signUpWithPhone = async (phone: string, password: string, fullName: string, role: UserRole) => {
    const generatedEmail = `${phone.replace(/\D/g, '')}@isoko.link`;
    const { data, error } = await supabase.auth.signUp({
      email: generatedEmail,
      password,
      options: {
        data: { full_name: fullName, role, phone },
      },
    });
    if (error) return { error: error.message };
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName, phone, role, email: generatedEmail })
        .eq('id', data.user.id);
      if (profileError) console.error('Profile update error:', profileError);
    }
    return { error: null };
  };

  const signOut = async () => {
    sessionRef.current = null;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signUpWithPhone, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
