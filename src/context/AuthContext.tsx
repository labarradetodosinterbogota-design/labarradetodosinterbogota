import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabaseClient';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
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
          setUser(data);
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

    initAuth();

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
            setUser(data);
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

  const signUp = async (email: string, password: string, fullName: string) => {
    setError(null);
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('No se pudo completar el registro.');

      const memberId = `INTER-${Date.now()}`;

      const { data, error: insertError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          full_name: fullName,
          member_id: memberId,
          status: 'active',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await supabase.from('member_profiles').insert({
        user_id: authData.user.id,
      });

      setUser(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo completar el registro.';
      setError(message);
      throw err;
    }
  };

  const signIn = async (email: string, password: string) => {
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo iniciar sesión.';
      setError(message);
      throw err;
    }
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider.');
  }
  return context;
};
