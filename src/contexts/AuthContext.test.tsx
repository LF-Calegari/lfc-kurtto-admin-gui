import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

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

function UseAuthProbe(): JSX.Element {
  useAuth();
  return <div>ok</div>;
}

describe('AuthContext', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    global.fetch = originalFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
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

  it('restaura usuário quando o token armazenado é válido', async () => {
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({ token: 'good' }));
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Restaurado',
        email: 'r@test.com',
        identity: 1,
        permissions: [],
      }),
    );

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
  });

  it('limpa sessão quando verify-token falha', async () => {
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
});
