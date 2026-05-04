import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '../constants/routes';
import { AUTH_SESSION_STORAGE_KEY } from '../constants/storageKeys';
import {
  AuthApiError,
  getPermissions,
  loginWithPassword,
  logoutSession,
  toAuthUser,
  verifySessionToken,
} from '../services/authService';

import type { AuthUser } from '../types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  isBootstrapping: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /**
   * Verifica autorização do usuário para um `routeCode` específico
   * (Issue #58 / `lfc-authenticator#148`).
   *
   * Disparado pelo `ProtectedRoute` em toda mudança de pathname privado.
   *
   * - **200**: usuário autorizado → resolve `true`.
   * - **401**: token inválido/expirado → limpa sessão local e
   *   redireciona para `/login`. Resolve `false`.
   * - **403**: usuário sem direito → redireciona para `/error/403`
   *   preservando rota tentada em `state.from`. Resolve `false`.
   * - **400 / network / parse / 5xx**: tolerância. Não bloqueia o
   *   destino — preserva UX em redes instáveis ou enquanto rotas ainda
   *   não estão cadastradas no backend. Resolve `true`.
   */
  verifyRoute: (
    routeCode: string,
    options?: { signal?: AbortSignal; fromPathname?: string },
  ) => Promise<boolean>;
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

function isAuthApiErrorWithStatus(error: unknown, status: number): boolean {
  return error instanceof AuthApiError && error.status === status;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

interface AuthProviderProps {
  readonly children: ReactNode;
}

export function AuthProvider({ children }: Readonly<AuthProviderProps>): JSX.Element {
  const navigate = useNavigate();
  // `initialTokenRef` guarda o token lido do storage no primeiro render —
  // ler novamente em re-renders posteriores (após `login()` persistir um
  // novo token) faria o `useEffect` de bootstrap disparar uma segunda
  // hidratação, duplicando chamadas a `/auth/permissions`.
  const initialTokenRef = useRef<string | null | undefined>(undefined);
  if (initialTokenRef.current === undefined) {
    initialTokenRef.current = readStoredToken();
  }
  const initialToken = initialTokenRef.current;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(initialToken));
  // Token corrente em ref para que o `verifyRoute` consiga consultá-lo
  // sem depender de re-render — fluxo "fire-and-forget" do guard de
  // rota não tem garantia de ler o estado mais novo via closure.
  const tokenRef = useRef<string | null>(initialToken);

  useEffect(() => {
    if (initialToken === null) {
      return;
    }

    const sessionToken = initialToken;
    let cancelled = false;

    async function restoreSession(token: string): Promise<void> {
      try {
        const permissions = await getPermissions(token);
        if (cancelled) {
          return;
        }
        const profile = toAuthUser(permissions);
        tokenRef.current = token;
        setUser(profile);
        persistSession(token, profile);
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (isAuthApiErrorWithStatus(error, 401)) {
          // Sessão revogada/expirada: limpa storage e mantém usuário
          // anônimo. O `LoginRoute` detectará `user === null` e renderizará
          // a tela de login.
          clearStoredSession();
          tokenRef.current = null;
          setUser(null);
          return;
        }
        // Falha de rede / parse / 5xx / 400: limpa a sessão local para
        // evitar token órfão sem catálogo hidratado. Sem o resultado de
        // `/auth/permissions` não temos `routeCodes` nem perfil — manter
        // o token salvo levaria a um estado inconsistente em que o
        // usuário aparece "logado" mas qualquer guard de rota cairia
        // (não há `routeCodes` para validar). Trade-off aceito: rede
        // intermitente força novo login no próximo refresh, em troca
        // de não ter usuário "fantasma" navegando sem permissões
        // carregadas. Cenário 401 já foi tratado no branch acima.
        clearStoredSession();
        tokenRef.current = null;
        setUser(null);
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
    try {
      const permissions = await getPermissions(token);
      const profile = toAuthUser(permissions);
      tokenRef.current = token;
      persistSession(token, profile);
      setUser(profile);
    } catch (error) {
      // Login obteve token mas /auth/permissions falhou. Limpa o token
      // parcial para não deixar Authorization "vivo" sem perfil
      // correspondente, e re-lança para o caller (Login.tsx) tratar.
      clearStoredSession();
      tokenRef.current = null;
      setUser(null);
      throw error;
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    const token = tokenRef.current ?? readStoredToken();
    try {
      if (token) {
        await logoutSession(token);
      }
    } catch {
      /* encerra sessão local mesmo se o auth-service não responder */
    }
    clearStoredSession();
    tokenRef.current = null;
    setUser(null);
    navigate(ROUTES.LOGIN, { replace: true });
  }, [navigate]);

  const verifyRoute = useCallback(
    async (
      routeCode: string,
      options?: { signal?: AbortSignal; fromPathname?: string },
    ): Promise<boolean> => {
      const token = tokenRef.current;
      if (!token) {
        return false;
      }
      try {
        const result = await verifySessionToken(token, routeCode, { signal: options?.signal });
        return result.valid === true;
      } catch (error) {
        if (isAbortError(error)) {
          // Cancelamento por navegação/unmount: não decide nada.
          return false;
        }
        if (isAuthApiErrorWithStatus(error, 401)) {
          // Sessão revogada/expirada: limpa e devolve para login.
          clearStoredSession();
          tokenRef.current = null;
          setUser(null);
          navigate(ROUTES.LOGIN, { replace: true });
          return false;
        }
        if (isAuthApiErrorWithStatus(error, 403)) {
          // Token válido mas sem direito à rota: redireciona para a
          // tela de 403 preservando a rota tentada em `state.from`.
          const fromPathname = options?.fromPathname;
          navigate(ROUTES.FORBIDDEN, {
            replace: true,
            state: fromPathname ? { from: fromPathname } : undefined,
          });
          return false;
        }
        // Falha de rede / parse / 5xx / 400 ("Rota inválida"):
        // tolerância — libera a navegação. O próximo tick periódico
        // ou a próxima navegação tentará de novo.
        return true;
      }
    },
    [navigate],
  );

  const value = useMemo(
    () => ({
      user,
      isBootstrapping,
      login,
      logout,
      verifyRoute,
    }),
    [user, isBootstrapping, login, logout, verifyRoute],
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
