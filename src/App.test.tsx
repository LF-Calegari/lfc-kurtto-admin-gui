import { render, screen, waitFor } from '@testing-library/react';

import App from './App';
import { AUTH_SESSION_STORAGE_KEY } from './constants/storageKeys';

function jsonResponse(body: unknown, status = 200): Response {
  const ok = status >= 200 && status < 300;
  const payload = JSON.stringify(body);
  return {
    ok,
    status,
    text: async () => payload,
  } as Response;
}

describe('App', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    global.fetch = originalFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('redireciona rota raiz para a tela de login quando não autenticado', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /entrar no kurtto/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/kurtto admin/i)).toBeInTheDocument();
  });

  it('renderiza formulário de login na rota dedicada', async () => {
    window.history.pushState({}, '', '/login');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
    });

    const button = screen.getByRole('button', { name: /entrar/i });

    expect(button).toBeEnabled();
    expect(button).toHaveClass('btn', 'btn-primary');
  });

  it('redireciona rota não mapeada para login quando não autenticado', async () => {
    window.history.pushState({}, '', '/rota-inexistente');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /entrar no kurtto/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('redireciona /home para login quando não há sessão', async () => {
    window.history.pushState({}, '', '/home');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /entrar no kurtto/i })).toBeInTheDocument();
    });
  });

  it('redireciona rota raiz para Home quando já autenticado', async () => {
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({ token: 'jwt-sessao' }));
    global.fetch = jest.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/auth/permissions')) {
        return Promise.resolve(
          jsonResponse({
            user: {
              id: '44444444-4444-4444-4444-444444444444',
              name: 'Sessão',
              email: 'sessao@test.com',
              identity: 1,
            },
            permissions: [],
            permissionCodes: [],
            routeCodes: ['KURTTO_V1_HOME'],
          }),
        );
      }
      if (url.includes('/auth/verify-token')) {
        return Promise.resolve(
          jsonResponse({
            valid: true,
            issuedAt: '2026-04-26T18:00:00Z',
            expiresAt: '2026-04-26T19:00:00Z',
          }),
        );
      }
      // listLinks da kurtto-api: devolve estrutura mínima para Home não quebrar.
      return Promise.resolve(jsonResponse({ data: [], meta: { page: 1, limit: 1, total: 0, total_pages: 0 } }));
    });

    window.history.pushState({}, '', '/');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/olá,/i)).toBeInTheDocument();
    });
  });
});
