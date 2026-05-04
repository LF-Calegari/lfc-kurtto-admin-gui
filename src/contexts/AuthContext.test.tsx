import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AUTH_PERMISSIONS_PATH } from '../constants/authEndpoints';
import { AUTH_SESSION_STORAGE_KEY } from '../constants/storageKeys';

import { AuthProvider, useAuth } from './AuthContext';

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

function permissionsBody(overrides?: { routeCodes?: string[] }): unknown {
  return {
    user: {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'Restaurado',
      email: 'r@test.com',
      identity: 1,
    },
    permissions: [],
    permissionCodes: [],
    routeCodes: overrides?.routeCodes ?? ['KURTTO_V1_HOME'],
  };
}

function UseAuthProbe(): JSX.Element {
  useAuth();
  return <div>ok</div>;
}

describe('AuthContext', () => {
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

  it('useAuth fora do AuthProvider lança erro', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      expect(() => {
        render(<UseAuthProbe />);
      }).toThrow(/useAuth deve ser usado dentro de AuthProvider/);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('restaura usuário quando o token armazenado é válido (via getPermissions)', async () => {
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({ token: 'good' }));
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(permissionsBody()));
    global.fetch = fetchMock;

    function DisplayUser(): JSX.Element {
      const { user } = useAuth();
      return <div>{user?.email ?? 'none'}</div>;
    }

    render(
      <MemoryRouter future={routerFuture}>
        <AuthProvider>
          <DisplayUser />
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('r@test.com')).toBeInTheDocument();
    });
    // O bootstrap deve consultar /auth/permissions, não /auth/verify-token.
    expect(fetchMock).toHaveBeenCalledWith(
      `http://auth.test${AUTH_PERMISSIONS_PATH}`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('limpa sessão quando getPermissions retorna 401', async () => {
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({ token: 'bad' }));
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ message: 'Token inválido.' }, 401));

    function DisplayUser(): JSX.Element {
      const { user } = useAuth();
      return <div>{user ? user.email : 'anon'}</div>;
    }

    render(
      <MemoryRouter future={routerFuture}>
        <AuthProvider>
          <DisplayUser />
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('anon')).toBeInTheDocument();
    });
    expect(localStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
  });

  it('login chama loginWithPassword + getPermissions e popula user', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ token: 'jwt-new' }))
      .mockResolvedValueOnce(jsonResponse(permissionsBody({ routeCodes: ['KURTTO_V1_HOME'] })));
    global.fetch = fetchMock;

    let triggerLogin: (() => Promise<void>) | null = null;
    function LoginCapture(): JSX.Element {
      const { login, user } = useAuth();
      triggerLogin = (): Promise<void> => login('user@test.com', 'pwd');
      return <div>{user?.email ?? 'anon'}</div>;
    }

    render(
      <MemoryRouter future={routerFuture}>
        <AuthProvider>
          <LoginCapture />
        </AuthProvider>
      </MemoryRouter>,
    );

    await act(async () => {
      await triggerLogin?.();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe(`http://auth.test${AUTH_PERMISSIONS_PATH}`);
    await waitFor(() => {
      expect(screen.getByText('r@test.com')).toBeInTheDocument();
    });
    const stored = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    expect(stored).not.toBeNull();
    expect(stored).toContain('"token":"jwt-new"');
  });

  it('login limpa token parcial quando getPermissions falha após login feliz', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ token: 'jwt-new' }))
      .mockResolvedValueOnce(jsonResponse({ message: 'Token revogado.' }, 401));
    global.fetch = fetchMock;

    let triggerLogin: (() => Promise<void>) | null = null;
    function LoginCapture(): JSX.Element {
      const { login, user } = useAuth();
      triggerLogin = (): Promise<void> => login('user@test.com', 'pwd');
      return <div>{user?.email ?? 'anon'}</div>;
    }

    render(
      <MemoryRouter future={routerFuture}>
        <AuthProvider>
          <LoginCapture />
        </AuthProvider>
      </MemoryRouter>,
    );

    await expect(act(async () => {
      await triggerLogin?.();
    })).rejects.toMatchObject({ status: 401 });

    expect(localStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
    expect(screen.getByText('anon')).toBeInTheDocument();
  });
});
