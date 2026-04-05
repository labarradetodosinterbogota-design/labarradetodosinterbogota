import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, UserStatus } from '../types';
import { supabase } from '../services/supabaseClient';
import { uploadFanVerificationPhoto, FAN_VERIFICATION_BUCKET } from '../services/fanVerificationStorage';

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
          const { data, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (fetchError) throw fetchError;
          setUser(normalizeUserRow(data));
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
            const { data, error: profileError } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();
            if (profileError) throw profileError;
            setUser(normalizeUserRow(data));
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

  const signUp = async (payload: SignUpPayload) => {
    setError(null);
    const { email, password, fullName, phone, verificationPhoto } = payload;

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('No se pudo completar el registro.');

      let session = authData.session;
      if (!session) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          throw new Error(
            'Cuenta creada. Si debes confirmar el correo, hazlo y luego inicia sesión para completar el registro.'
          );
        }
        session = signInData.session;
      }

      if (!session?.user) {
        throw new Error('No hay sesión activa. Confirma tu correo e inicia sesión.');
      }

      const userId = session.user.id;
      let storagePath: string | null = null;

      try {
        storagePath = await uploadFanVerificationPhoto(userId, verificationPhoto);
      } catch (uploadErr) {
        throw uploadErr instanceof Error ? uploadErr : new Error('No se pudo subir la foto de verificación.');
      }

      const memberId = `INTER-${Date.now()}`;

      const { data, error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email,
          phone: phone.trim(),
          full_name: fullName.trim(),
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
      const message = err instanceof Error ? err.message : 'No se pudo completar el registro.';
      setError(message);
      throw err;
    }
  };

  const signIn = async (email: string, password: string): Promise<User | null> => {
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

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileError) throw profileError;
      const normalized = normalizeUserRow(profile);
      setUser(normalized);
      return normalized;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo iniciar sesión.';
      setError(message);
      throw err;
    }
  };

  const refreshProfile = async () => {
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
  };

  const signOut = async () => {
    setError(null);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      setUser(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo cerrar sesión.';
      setError(message);
      throw err;
    }
  };

  const canAccessPrivateArea = !!user && user.status === UserStatus.ACTIVE;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        signUp,
        signIn,
        signOut,
        isAuthenticated: !!user,
        canAccessPrivateArea,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

function normalizeUserRow(data: unknown): User | null {
  if (!data || typeof data !== 'object') return null;
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    email: String(row.email),
    phone: row.phone != null ? String(row.phone) : null,
    full_name: String(row.full_name),
    photo_url: row.photo_url != null ? String(row.photo_url) : null,
    fan_verification_storage_path:
      row.fan_verification_storage_path != null
        ? String(row.fan_verification_storage_path)
        : null,
    member_id: String(row.member_id),
    join_date: String(row.join_date),
    role: row.role as User['role'],
    status: row.status as User['status'],
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider.');
  }
  return context;
};
