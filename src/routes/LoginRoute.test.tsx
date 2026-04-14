import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { AUTH_SESSION_STORAGE_KEY } from '../constants/storageKeys';
import { AuthProvider } from '../contexts/AuthContext';

import { LoginRoute } from './LoginRoute';

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

describe('LoginRoute', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    global.fetch = originalFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('renderiza tela de login quando não há sessão', async () => {
    render(
      <MemoryRouter future={routerFuture} initialEntries={['/login']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/home" element={<div>Página Home</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /entrar no kurtto/i })).toBeInTheDocument();
    });
  });

  it('redireciona para Home quando já existe sessão válida', async () => {
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({ token: 'jwt' }));
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Logado',
        email: 'logado@test.com',
        identity: 1,
        permissions: [],
      }),
    );

    render(
      <MemoryRouter future={routerFuture} initialEntries={['/login']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/home" element={<div>Página Home</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Página Home')).toBeInTheDocument();
    });
  });

  it('mostra spinner durante verificação inicial de sessão', async () => {
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({ token: 'slow' }));
    global.fetch = jest.fn(
      () =>
        new Promise<Response>(() => {
          /* pendente */
        }),
    );

    render(
      <MemoryRouter future={routerFuture} initialEntries={['/login']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/home" element={<div>Página Home</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText(/carregando sessão/i)).toBeInTheDocument();
  });
});
