import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, sessionExpired, tokenStore } from '../services/api';
import type { User } from '../types';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  // Restore the session on load; an invalid token just lands on the login page.
  useEffect(() => {
    if (!tokenStore.get()) {
      setReady(true);
      return;
    }
    api<{ user: User }>('/auth/me')
      .then(({ user }) => setUser(user))
      .catch(() => tokenStore.clear())
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    const drop = () => setUser(null);
    sessionExpired.addEventListener('expired', drop);
    return () => sessionExpired.removeEventListener('expired', drop);
  }, []);

  const signIn = useCallback(async (login: string, password: string) => {
    const result = await api<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: { login, password },
    });
    tokenStore.set(result.token);
    setUser(result.user);
  }, []);

  const register = useCallback(
    async (
      fullName: string,
      email: string,
      password: string,
      username?: string
    ) => {
      const result = await api<{ token: string; user: User }>(
        '/auth/register',
        {
          method: 'POST',
          body: {
            fullName,
            email,
            password,
            ...(username ? { username } : {}),
          },
        }
      );
      tokenStore.set(result.token);
      setUser(result.user);
    },
    []
  );

  const signOut = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, signIn, register, signOut }),
    [user, ready, signIn, register, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
