import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import {
  AUTH_PERMISSIONS_PATH,
  AUTH_VERIFY_TOKEN_PATH,
} from '../constants/authEndpoints';
import { ROUTES } from '../constants/routes';
import { AUTH_SESSION_STORAGE_KEY } from '../constants/storageKeys';
import { AuthProvider } from '../contexts/AuthContext';

import { ProtectedRoute } from './ProtectedRoute';

const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true } as const;

function jsonResponse(body: unknown, status = 200): Response {
  const ok = status >= 200 && status < 300;
  const payload = JSON.stringify(body);
  return {
    ok,
    status,
    text: async () => payload,
  } as Response;
}

function permissionsBody(): unknown {
  return {
    user: {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Usuário',
      email: 'u@test.com',
      identity: 1,
    },
    permissions: [],
    permissionCodes: [],
    routeCodes: ['KURTTO_V1_HOME'],
  };
}

function verifyOkBody(): unknown {
  return {
    valid: true,
    issuedAt: '2026-04-26T18:00:00Z',
    expiresAt: '2026-04-26T19:00:00Z',
  };
}

interface PathRouting {
  initial: string;
  permissionsResponse: Response | Promise<Response>;
  verifyResponse?: Response | Promise<Response>;
}

function renderProtectedFlow({
  initial,
  permissionsResponse,
  verifyResponse,
}: PathRouting): jest.Mock {
  const fetchMock = jest.fn().mockImplementation((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes(AUTH_PERMISSIONS_PATH)) {
      return permissionsResponse instanceof Promise ? permissionsResponse : Promise.resolve(permissionsResponse);
    }
    if (url.includes(AUTH_VERIFY_TOKEN_PATH)) {
      if (verifyResponse === undefined) {
        return Promise.resolve(jsonResponse(verifyOkBody()));
      }
      return verifyResponse instanceof Promise ? verifyResponse : Promise.resolve(verifyResponse);
    }
    return Promise.resolve(jsonResponse({}));
  });
  global.fetch = fetchMock;

  render(
    <MemoryRouter future={routerFuture} initialEntries={[initial]}>
      <AuthProvider>
        <Routes>
          <Route path={ROUTES.LOGIN} element={<div>Tela login</div>} />
          <Route path={ROUTES.FORBIDDEN} element={<div>Tela 403</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path={ROUTES.HOME} element={<div>Área protegida</div>} />
            <Route path={ROUTES.LINKS} element={<div>Tela links</div>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );

  return fetchMock;
}

describe('ProtectedRoute', () => {
  const originalFetch = global.fetch;
  const originalAuthUrl = process.env.REACT_APP_AUTH_API_URL;
  const originalSystemId = process.env.REACT_APP_SYSTEM_ID;

  beforeEach(() => {
    localStorage.clear();
    global.fetch = originalFetch;
    process.env.REACT_APP_AUTH_API_URL = 'http://auth.test';
    process.env.REACT_APP_SYSTEM_ID = '11111111-1111-1111-1111-111111111111';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.REACT_APP_AUTH_API_URL = originalAuthUrl;
    process.env.REACT_APP_SYSTEM_ID = originalSystemId;
  });

  it('exibe spinner durante restauração de sessão', async () => {
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({ token: 'pending' }));
    global.fetch = jest.fn(
      () =>
        new Promise<Response>(() => {
          /* nunca resolve para manter isBootstrapping */
        }),
    );

    render(
      <MemoryRouter future={routerFuture} initialEntries={[ROUTES.HOME]}>
        <AuthProvider>
          <Routes>
            <Route path={ROUTES.LOGIN} element={<div>Tela login</div>} />
            <Route element={<ProtectedRoute />}>
              <Route path={ROUTES.HOME} element={<div>Área protegida</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText(/carregando sessão/i)).toBeInTheDocument();
  });

  it('renderiza conteúdo protegido e dispara verify-token com o routeCode da rota', async () => {
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({ token: 'valid' }));
    const fetchMock = renderProtectedFlow({
      initial: ROUTES.HOME,
      permissionsResponse: jsonResponse(permissionsBody()),
    });

    await waitFor(() => {
      expect(screen.getByText('Área protegida')).toBeInTheDocument();
    });

    await waitFor(() => {
      const verifyCall = fetchMock.mock.calls.find(([url]) =>
        typeof url === 'string' ? url.includes(AUTH_VERIFY_TOKEN_PATH) : false,
      );
      expect(verifyCall).toBeDefined();
      const headers = (verifyCall?.[1] as RequestInit | undefined)?.headers as
        | Record<string, string>
        | undefined;
      expect(headers?.['X-Route-Code']).toBe('KURTTO_V1_HOME');
    });
  });

  it('redireciona para login quando não há usuário autenticado', async () => {
    render(
      <MemoryRouter future={routerFuture} initialEntries={[ROUTES.HOME]}>
        <AuthProvider>
          <Routes>
            <Route path={ROUTES.LOGIN} element={<div>Tela login</div>} />
            <Route element={<ProtectedRoute />}>
              <Route path={ROUTES.HOME} element={<div>Área protegida</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Tela login')).toBeInTheDocument();
    });
    expect(screen.queryByText('Área protegida')).not.toBeInTheDocument();
  });

  it('redireciona para /error/403 quando verify-token retorna 403', async () => {
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({ token: 'valid' }));
    renderProtectedFlow({
      initial: ROUTES.LINKS,
      permissionsResponse: jsonResponse(permissionsBody()),
      verifyResponse: jsonResponse({ message: 'Sem direito a esta rota.' }, 403),
    });

    await waitFor(() => {
      expect(screen.getByText('Tela 403')).toBeInTheDocument();
    });
    expect(screen.queryByText('Tela links')).not.toBeInTheDocument();
  });

  it('redireciona para login quando verify-token retorna 401', async () => {
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({ token: 'expired' }));
    renderProtectedFlow({
      initial: ROUTES.HOME,
      permissionsResponse: jsonResponse(permissionsBody()),
      verifyResponse: jsonResponse({ message: 'Token revogado.' }, 401),
    });

    await waitFor(() => {
      expect(screen.getByText('Tela login')).toBeInTheDocument();
    });
    expect(localStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
  });

  it('mantém usuário no destino quando verify-token falha por rede/5xx (tolerância)', async () => {
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({ token: 'valid' }));
    renderProtectedFlow({
      initial: ROUTES.HOME,
      permissionsResponse: jsonResponse(permissionsBody()),
      verifyResponse: jsonResponse({ message: 'Erro interno.' }, 500),
    });

    await waitFor(() => {
      expect(screen.getByText('Área protegida')).toBeInTheDocument();
    });
  });
});
