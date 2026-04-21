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
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        id: '44444444-4444-4444-4444-444444444444',
        name: 'Sessão',
        email: 'sessao@test.com',
        identity: 1,
        permissions: [],
      }),
    );

    window.history.pushState({}, '', '/');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/olá,/i)).toBeInTheDocument();
    });
  });
});
