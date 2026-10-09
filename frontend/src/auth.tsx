import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from './api';
import type { AppConfig, User } from './types';

interface AuthState {
  user: User | null;
  config: AppConfig;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    const restoreSession = tokenStore.get() ? api.me().catch(() => null) : Promise.resolve(null);
    Promise.all([api.config(), restoreSession])
      .then(([cfg, me]) => {
        setConfig(cfg);
        setUser(me);
      })
      .catch(() => setError('Cannot reach the API. Is the backend running?'))
      .finally(() => setLoading(false));
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    tokenStore.set(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const value = useMemo(
    () => (config ? { user, config, login, logout } : null),
    [user, config, login, logout],
  );

  if (loading) return <p className="center muted">Loading…</p>;
  if (error || !value) return <p className="center error">{error}</p>;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
