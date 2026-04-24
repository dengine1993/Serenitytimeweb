import { useState, useEffect, createContext, useContext, ReactNode, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getLanguage } from '@/hooks/useI18n';
import { clearUserData, getPreservedSettings, restoreSettings } from '@/lib/storage';
import ruTranslations from '@/i18n/ru.json';
import enTranslations from '@/i18n/en.json';
import type { User, Session } from '@supabase/supabase-js';

interface RegistrationData {
  gender?: string;
  birthYear?: number;
  country?: string;
  city?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string, registration?: RegistrationData) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  userId: string | null;
  isSignedIn: boolean;
  isRecoveryMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const navigate = useNavigate();

  const lang = getLanguage();
  const t = lang === 'ru' ? ruTranslations : enTranslations;

  // Initialize auth state
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);

        // Handle password recovery event
        if (event === 'PASSWORD_RECOVERY') {
          setIsRecoveryMode(true);
          navigate('/auth?recovery=true');
          return;
        }

        // Reset recovery mode on other auth events
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          setIsRecoveryMode(false);
        }

        // Check blocked status after auth change (deferred)
        if (currentSession?.user) {
          setTimeout(() => {
            checkBlocked(currentSession.user.id);
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setLoading(false);

      if (existingSession?.user) {
        checkBlocked(existingSession.user.id);
      }
    });

    // Cross-tab logout synchronization
    const handleStorageChange = (e: StorageEvent) => {
      // Supabase stores session in key like sb-{project-ref}-auth-token
      if (e.key?.includes('auth-token') && e.newValue === null) {
        setUser(null);
        setSession(null);
        setIsRecoveryMode(false);
        navigate('/');
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [navigate]);

  const checkBlocked = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('blocked_at')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (profile?.blocked_at) {
      setIsBlocked(true);
      toast.error('Ваш аккаунт заблокирован');
      await supabase.auth.signOut();
      navigate('/');
    }
  };

  const signUp = useCallback(async (email: string, password: string, username: string, registration?: RegistrationData) => {
    const redirectUrl = `${window.location.origin}/email-confirmed`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: username,
          gender: registration?.gender || null,
        },
      },
    });

    if (error) {
      console.error('Sign up error:', error);
      return { error };
    }

    // Update profile with extended registration data
    if (data?.user && registration) {
      const updateData: Record<string, unknown> = {};
      if (registration.gender) updateData.gender_extended = registration.gender;
      if (registration.birthYear) updateData.birth_year = registration.birthYear;
      if (registration.country) updateData.country = registration.country;
      if (registration.city) updateData.city = registration.city;
      
      if (Object.keys(updateData).length > 0) {
        // Use service role would be ideal, but we can update after profile is created
        // The trigger will create the profile, then we update it
        setTimeout(async () => {
          await supabase
            .from('profiles')
            .update(updateData)
            .eq('user_id', data.user!.id);
        }, 1000);
      }
    }

    return { error: null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Sign in error:', error);
      return { error };
    }

    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    try {
      // Preserve global settings before clearing
      const preserved = getPreservedSettings();

      await supabase.auth.signOut();

      // Clear user-specific data
      clearUserData();

      // Restore global settings
      restoreSettings(preserved);

      navigate('/');
      toast.success(t.auth.logoutSuccess);
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error(t.auth.logoutError);
      throw error;
    }
  }, [navigate, t]);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/app`,
      },
    });

    if (error) {
      console.error('Google sign in error:', error);
      toast.error('Ошибка входа через Google');
    }
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });

    if (error) {
      console.error('Password reset error:', error);
      return { error };
    }

    return { error: null };
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      console.error('Update password error:', error);
      return { error };
    }

    setIsRecoveryMode(false);
    return { error: null };
  }, []);

  const value: AuthContextType = useMemo(() => ({
    user: isBlocked ? null : user,
    session: isBlocked ? null : session,
    loading,
    signUp,
    signIn,
    signOut,
    signInWithGoogle,
    sendPasswordReset,
    updatePassword,
    userId: isBlocked ? null : user?.id ?? null,
    isSignedIn: isBlocked ? false : !!session,
    isRecoveryMode,
  }), [user, session, loading, isBlocked, isRecoveryMode, signUp, signIn, signOut, signInWithGoogle, sendPasswordReset, updatePassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.error('useAuth called outside AuthProvider. Falling back to minimal implementation.');

    const fallback: AuthContextType = {
      user: null,
      session: null,
      loading: false,
      signUp: async () => ({ error: new Error('AuthProvider not found') }),
      signIn: async () => ({ error: new Error('AuthProvider not found') }),
      signOut: async () => {
        toast.error('AuthProvider not found');
      },
      signInWithGoogle: async () => {
        toast.error('AuthProvider not found');
      },
      sendPasswordReset: async () => ({ error: new Error('AuthProvider not found') }),
      updatePassword: async () => ({ error: new Error('AuthProvider not found') }),
      userId: null,
      isSignedIn: false,
      isRecoveryMode: false,
    };

    return fallback;
  }
  return context;
};
