import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AppearanceMode } from '../types';
import { api } from '../services/api';
import { useTheme } from './ThemeContext';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
  updateUserAppearance: (preference: AppearanceMode) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { setMode } = useTheme();

  const fetchUser = async () => {
    try {
      const token = api.getToken();
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
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
  };

  useEffect(() => {
    fetchUser();
  }, []);

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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
