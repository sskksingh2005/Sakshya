import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { mapAuthError } from './authErrorMapper';

export interface AuthResult {
  error: string | null;
  rawError?: unknown;
  needsConfirmation?: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  sendOtp: (identifier: string, type: 'email' | 'sms') => Promise<AuthResult>;
  verifyOtp: (identifier: string, token: string, type: 'email' | 'sms') => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  sendPasswordReset: (email: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

export function normalizePhoneNumber(countryCode: string, value: string): string {
  const countryDigits = countryCode.replace(/\D/g, '');
  const digits = value.replace(/\D/g, '');
  if (value.trim().startsWith('+')) return `+${digits}`;
  const localDigits = digits.startsWith(countryDigits) && digits.length > countryDigits.length
    ? digits.slice(countryDigits.length)
    : digits.replace(/^0+/, '');
  return `+${countryDigits}${localDigits}`;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (identifier: string, password: string): Promise<AuthResult> => {
    const credentials = identifier.startsWith('+') ? { phone: identifier, password } : { email: identifier, password };
    const { error } = await supabase.auth.signInWithPassword(credentials);
    if (error) {
      return { error: mapAuthError(error), rawError: error };
    }
    return { error: null, needsConfirmation: false };
  };

  const signUp = async (email: string, password: string): Promise<AuthResult> => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      return { error: mapAuthError(error), rawError: error };
    }
    const needsConfirmation = Boolean(data.user && !data.session);
    return { error: null, needsConfirmation };
  };

  const sendOtp = async (identifier: string, type: 'email' | 'sms'): Promise<AuthResult> => {
    const normalizedIdentifier = type === 'sms' ? normalizePhoneNumber('+91', identifier) : identifier;
    const { error } = await supabase.auth.signInWithOtp(
      type === 'email'
        ? { email: normalizedIdentifier, options: { shouldCreateUser: true } }
        : { phone: normalizedIdentifier, options: { shouldCreateUser: true } }
    );
    return error ? { error: mapAuthError(error), rawError: error } : { error: null };
  };

  const verifyOtp = async (identifier: string, token: string, type: 'email' | 'sms'): Promise<AuthResult> => {
    const normalizedIdentifier = type === 'sms' ? normalizePhoneNumber('+91', identifier) : identifier;
    const { error } = await supabase.auth.verifyOtp(
      type === 'email' ? { email: normalizedIdentifier, token, type: 'email' } : { phone: normalizedIdentifier, token, type: 'sms' }
    );
    return error ? { error: mapAuthError(error), rawError: error } : { error: null };
  };

  const updatePassword = async (password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.updateUser({ password });
    return error ? { error: mapAuthError(error), rawError: error } : { error: null };
  };

  const sendPasswordReset = async (email: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${window.location.pathname}#/auth?mode=reset`,
    });
    return error ? { error: mapAuthError(error), rawError: error } : { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user || null, loading, signIn, signUp, sendOtp, verifyOtp, updatePassword, sendPasswordReset, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
