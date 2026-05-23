'use client';

import React, { useEffect, useMemo, useState } from 'react';

import logger from '@/lib/logger';
import { supabase } from '@/lib/supabase';

import type { AuthUser, LocalUser } from '../types';
import { AuthContext } from './AuthProvider';

export function SupabaseProviderWrapper({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Bootstrap from existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          displayName: session.user.user_metadata?.full_name ?? session.user.email,
          provider: 'local',
          provider_id: session.user.id,
        });
      }
      setLoading(false);
    });

    // Listen for auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          displayName: session.user.user_metadata?.full_name ?? session.user.email,
          provider: 'local',
          provider_id: session.user.id,
        });
      } else {
        setUser(null);
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth/')) {
          window.location.href = '/auth/login';
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const getAccessToken = React.useCallback(async (): Promise<string> => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      logger.warn('No Supabase session available');
      return '';
    }
    return session.access_token;
  }, []);

  const redirectToLogin = React.useCallback(() => {
    window.location.href = '/auth/login';
  }, []);

  const logout = React.useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = '/auth/login';
  }, []);

  const contextValue = useMemo(() => ({
    user: user as AuthUser,
    isAuthenticated: !!user,
    loading,
    getAccessToken,
    redirectToLogin,
    logout,
    provider: 'supabase' as const,
  }), [user, loading, getAccessToken, redirectToLogin, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
