import React, { useEffect, useState, useCallback } from 'react';
import { User, AppearanceMode } from '../types';
import { api } from '../services/api';
import { useTheme } from './useTheme';
import { AuthContext } from './authContextDef';
export type { AuthContextType } from './authContextDef';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(() => !!api.getToken());
  const { setMode } = useTheme();

  const fetchUser = useCallback(async () => {
    const token = api.getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const u = await api.getMe();
      setUser(u);
      if (u.appearance_preference) {
        setMode(u.appearance_preference);
      }
    } catch {
      api.setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [setMode]);

  useEffect(() => {
    const token = api.getToken();
    if (!token) return;

    let isMounted = true;
    api.getMe()
      .then((u) => {
        if (!isMounted) return;
        setUser(u);
        if (u.appearance_preference) {
          setMode(u.appearance_preference);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        api.setToken(null);
        setUser(null);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [setMode]);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    setUser(res.user);
    if (res.user.appearance_preference) {
      setMode(res.user.appearance_preference);
    }
  };

  const loginDemo = async () => {
    return login('demo@careerlens.ai', 'CareerLens2026!');
  };

  const register = async (email: string, password: string, fullName?: string) => {
    const res = await api.register({ email, password, full_name: fullName });
    setUser(res.user);
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
  };

  const updateUserAppearance = async (preference: AppearanceMode) => {
    setMode(preference);
    if (user) {
      try {
        const updated = await api.updateAppearance(preference);
        setUser(updated);
      } catch (e) {
        console.error('Failed to sync appearance with account', e);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginDemo,
        register,
        logout,
        updateUserAppearance,
        refreshUser: fetchUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
