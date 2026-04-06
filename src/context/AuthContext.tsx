import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { User, UserStatus } from '../types';
import { supabase } from '../services/supabaseClient';
import { uploadFanVerificationPhoto, FAN_VERIFICATION_BUCKET } from '../services/fanVerificationStorage';
import { bootstrapPendingMemberRegistration } from '../services/registrationBootstrapClient';

export interface SignUpPayload {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  verificationPhoto: File;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  signUp: (payload: SignUpPayload) => Promise<void>;
  signIn: (email: string, password: string) => Promise<User | null>;
  signOut: () => Promise<void>;
  /** Hay fila en `users` vinculada a la sesión. */
  isAuthenticated: boolean;
  /** Puede usar rutas privadas (solo `active`). */
  canAccessPrivateArea: boolean;
  /** Vuelve a cargar la fila `users` (p. ej. tras aprobación de un admin). */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && typeof error.message === 'string' && error.message.trim().length > 0) {
    return error.message;
  }
  if (error && typeof error === 'object') {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === 'string' && maybeMessage.trim().length > 0) {
      return maybeMessage;
    }
  }
  return fallback;
}

function extractErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : null;
}

function mapSignUpErrorMessage(error: unknown): string {
  const fallback = 'No se pudo completar el registro.';
  const message = extractErrorMessage(error, fallback);
  const normalized = message.toLowerCase();

  if (message.startsWith('Cuenta creada.')) {
    return message;
  }

  if (normalized.includes('user already registered')) {
    return 'Este correo ya está registrado. Intenta iniciar sesión o recuperar tu contraseña.';
  }

  const status = extractErrorStatus(error);
  const isEmailRateLimit =
    status === 429 || normalized.includes('email rate limit exceeded') || normalized.includes('rate limit');
  if (isEmailRateLimit) {
    return 'Se alcanzó temporalmente el límite de correos de verificación. Espera unos minutos e intenta nuevamente.';
  }

  return message;
}

function mapSignInErrorMessage(error: unknown): string {
  const fallback = 'No se pudo iniciar sesión.';
  const message = extractErrorMessage(error, fallback);
  const normalized = message.toLowerCase();

  if (normalized.includes('email not confirmed')) {
    return 'Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada y spam.';
  }

  if (normalized.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos.';
  }

  const status = extractErrorStatus(error);
  const isRateLimit = status === 429 || normalized.includes('too many requests') || normalized.includes('rate limit');
  if (isRateLimit) {
    return 'Demasiados intentos de inicio de sesión. Espera un momento e intenta nuevamente.';
  }

  const isEmailConstraintConflict =
    normalized.includes('users_email_key') ||
    (normalized.includes('duplicate key value') && normalized.includes('email'));
  if (isEmailConstraintConflict) {
    return 'Tu cuenta tiene un conflicto de registro con el correo. Contacta a coordinación para regularizarla.';
  }

  return message;
}

function resolveSignUpEmailRedirectUrl(): string | undefined {
  const configured = import.meta.env.VITE_AUTH_EMAIL_REDIRECT_URL;
  if (typeof configured === 'string' && configured.trim().length > 0) {
    return configured.trim();
  }

  const runtimeWindow = globalThis.window;
  if (runtimeWindow !== undefined && typeof runtimeWindow.location?.origin === 'string') {
    return `${runtimeWindow.location.origin}/login`;
  }

  return undefined;
}

async function resolveSignUpSession(
  initialSession: Session | null
): Promise<Session> {
  if (initialSession?.user) {
    return initialSession;
  }
  throw new Error(
    'Cuenta creada. Revisa tu correo para confirmarlo y luego inicia sesión para completar el registro.'
  );
}

async function ensureMemberProfileRow(userId: string): Promise<void> {
  const { error } = await supabase.from('member_profiles').insert({ user_id: userId });
  if (error && error.code !== '23505') {
    throw error;
  }
}

function fallbackFullNameFromEmail(email: string | null): string {
  if (!email) return 'Nuevo integrante';
  const localPart = email.split('@')[0]?.trim() ?? '';
  if (!localPart) return 'Nuevo integrante';
  return localPart
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

async function ensureUserRowForAuthUser(authUser: SupabaseAuthUser): Promise<User | null> {
  const { data: existingProfile, error: profileFetchError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();
  if (profileFetchError) throw profileFetchError;
  if (existingProfile) {
    await ensureMemberProfileRow(authUser.id);
    return normalizeUserRow(existingProfile);
  }

  const metadata = (authUser.user_metadata ?? {}) as Record<string, unknown>;
  const fullName =
    toNullableString(metadata.full_name)?.trim() || fallbackFullNameFromEmail(authUser.email ?? null);
  const phone = toNullableString(metadata.phone)?.trim() || null;
  const memberId = `INTER-${Date.now()}`;

  const { data: insertedProfile, error: profileInsertError } = await supabase
    .from('users')
    .insert({
      id: authUser.id,
      email: authUser.email ?? '',
      phone,
      full_name: fullName,
      member_id: memberId,
      status: 'pending',
    })
    .select('*')
    .single();

  if (profileInsertError) {
    const { data: rowAfterError, error: refetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();
    if (refetchError) throw refetchError;
    if (!rowAfterError) throw profileInsertError;
    await ensureMemberProfileRow(authUser.id);
    return normalizeUserRow(rowAfterError);
  }

  await ensureMemberProfileRow(authUser.id);
  return normalizeUserRow(insertedProfile);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const profile = await ensureUserRowForAuthUser(session.user);
          setUser(profile);
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error('Auth init error:', err);
        }
        setError(err instanceof Error ? err.message : 'No se pudo autenticar.');
      } finally {
        setIsLoading(false);
      }
    };

    void initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        try {
          if (session?.user) {
            const profile = await ensureUserRowForAuthUser(session.user);
            setUser(profile);
          } else {
            setUser(null);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'No se pudo autenticar.');
        }
      })();
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (payload: SignUpPayload) => {
    setError(null);
    const { email, password, fullName, phone, verificationPhoto } = payload;
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();
    const normalizedFullName = fullName.trim();
    const emailRedirectTo = resolveSignUpEmailRedirectUrl();

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          ...(emailRedirectTo ? { emailRedirectTo } : {}),
          data: {
            full_name: normalizedFullName,
            phone: normalizedPhone,
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('No se pudo completar el registro.');

      if (!authData.session) {
        await bootstrapPendingMemberRegistration({
          userId: authData.user.id,
          email: normalizedEmail,
          fullName: normalizedFullName,
          phone: normalizedPhone,
        });
      }

      const session = await resolveSignUpSession(authData.session);

      const userId = session.user.id;
      const storagePath = await uploadFanVerificationPhoto(userId, verificationPhoto);

      const memberId = `INTER-${Date.now()}`;

      const { data, error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: normalizedEmail,
          phone: normalizedPhone,
          full_name: normalizedFullName,
          member_id: memberId,
          status: 'pending',
          fan_verification_storage_path: storagePath,
        })
        .select()
        .single();

      if (insertError) {
        if (storagePath) {
          await supabase.storage.from(FAN_VERIFICATION_BUCKET).remove([storagePath]);
        }
        throw insertError;
      }

      const { error: profileError } = await supabase.from('member_profiles').insert({
        user_id: userId,
      });

      if (profileError) {
        throw profileError;
      }

      setUser(normalizeUserRow(data));
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Sign up error:', err);
      }
      const message = mapSignUpErrorMessage(err);
      setError(message);
      if (err instanceof Error && err.message === message) {
        throw err;
      }
      throw new Error(message);
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<User | null> => {
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser?.id) return null;

      if (authUser.email) {
        const metadata = (authUser.user_metadata ?? {}) as Record<string, unknown>;
        const metadataFullName =
          toNullableString(metadata.full_name)?.trim() || fallbackFullNameFromEmail(authUser.email);
        const metadataPhone = toNullableString(metadata.phone)?.trim() || '';
        try {
          await bootstrapPendingMemberRegistration({
            userId: authUser.id,
            email: authUser.email,
            fullName: metadataFullName,
            phone: metadataPhone,
          });
        } catch (bootstrapError) {
          if (import.meta.env.DEV) {
            console.error('Sign in bootstrap warning:', bootstrapError);
          }
        }
      }

      const normalized = await ensureUserRowForAuthUser(authUser);
      setUser(normalized);
      return normalized;
    } catch (err) {
      const message = mapSignInErrorMessage(err);
      setError(message);
      if (err instanceof Error && err.message === message) {
        throw err;
      }
      throw new Error(message);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser?.id) {
      setUser(null);
      return;
    }
    const { data, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    setUser(normalizeUserRow(data));
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    try {
      const { error: globalSignOutError } = await supabase.auth.signOut({ scope: 'global' });
      if (globalSignOutError) {
        const { error: localSignOutError } = await supabase.auth.signOut({ scope: 'local' });
        if (localSignOutError) {
          throw globalSignOutError;
        }
      }
      setUser(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo cerrar sesión.';
      setError(message);
      if (err instanceof Error && err.message === message) {
        throw err;
      }
      throw new Error(message);
    }
  }, []);

  const canAccessPrivateArea = useMemo(() => !!user && user.status === UserStatus.ACTIVE, [user]);
  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading,
      error,
      signUp,
      signIn,
      signOut,
      isAuthenticated: !!user,
      canAccessPrivateArea,
      refreshProfile,
    }),
    [user, isLoading, error, signUp, signIn, signOut, canAccessPrivateArea, refreshProfile]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

function toStringValue(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

function normalizeUserRow(data: unknown): User | null {
  if (!data || typeof data !== 'object') return null;
  const row = data as Record<string, unknown>;
  return {
    id: toStringValue(row.id),
    email: toStringValue(row.email),
    phone: toNullableString(row.phone),
    full_name: toStringValue(row.full_name),
    photo_url: toNullableString(row.photo_url),
    fan_verification_storage_path: toNullableString(row.fan_verification_storage_path),
    member_id: toStringValue(row.member_id),
    join_date: toStringValue(row.join_date),
    role: row.role as User['role'],
    status: row.status as User['status'],
    created_at: toStringValue(row.created_at),
    updated_at: toStringValue(row.updated_at),
  };
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider.');
  }
  return context;
};
