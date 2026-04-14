import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '../constants/routes';
import { AUTH_SESSION_STORAGE_KEY } from '../constants/storageKeys';
import { loginWithPassword, logoutSession, verifySessionToken } from '../services/authService';

import type { AuthUser } from '../types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  isBootstrapping: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredToken(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as { token?: unknown };
    return typeof parsed.token === 'string' && parsed.token.length > 0 ? parsed.token : null;
  } catch {
    return null;
  }
}

function persistSession(token: string, user: AuthUser): void {
  localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({ token, user }));
}

function clearStoredSession(): void {
  localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const navigate = useNavigate();
  const initialToken = readStoredToken();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(initialToken));

  useEffect(() => {
    if (initialToken === null) {
      return;
    }

    const sessionToken = initialToken;
    let cancelled = false;

    async function restoreSession(token: string): Promise<void> {
      try {
        const profile = await verifySessionToken(token);
        if (cancelled) {
          return;
        }
        setUser(profile);
        persistSession(token, profile);
      } catch {
        if (!cancelled) {
          clearStoredSession();
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    }

    void restoreSession(sessionToken);

    return () => {
      cancelled = true;
    };
  }, [initialToken]);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const token = await loginWithPassword(email, password);
    const profile = await verifySessionToken(token);
    persistSession(token, profile);
    setUser(profile);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    const token = readStoredToken();
    try {
      if (token) {
        await logoutSession(token);
      }
    } catch {
      /* encerra sessão local mesmo se o auth-service não responder */
    }
    clearStoredSession();
    setUser(null);
    navigate(ROUTES.LOGIN, { replace: true });
  }, [navigate]);

  const value = useMemo(
    () => ({
      user,
      isBootstrapping,
      login,
      logout,
    }),
    [user, isBootstrapping, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
