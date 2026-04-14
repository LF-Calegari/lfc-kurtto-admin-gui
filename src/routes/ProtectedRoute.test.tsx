import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

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

describe('ProtectedRoute', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    global.fetch = originalFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
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
      <MemoryRouter future={routerFuture} initialEntries={['/home']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div>Tela login</div>} />
            <Route element={<ProtectedRoute />}>
              <Route path="/home" element={<div>Área protegida</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText(/carregando sessão/i)).toBeInTheDocument();
  });

  it('renderiza conteúdo protegido quando a sessão é válida', async () => {
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({ token: 'valid' }));
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Usuário',
        email: 'u@test.com',
        identity: 1,
        permissions: [],
      }),
    );

    render(
      <MemoryRouter future={routerFuture} initialEntries={['/home']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div>Tela login</div>} />
            <Route element={<ProtectedRoute />}>
              <Route path="/home" element={<div>Área protegida</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Área protegida')).toBeInTheDocument();
    });
  });

  it('redireciona para login quando não há usuário autenticado', async () => {
    render(
      <MemoryRouter future={routerFuture} initialEntries={['/home']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div>Tela login</div>} />
            <Route element={<ProtectedRoute />}>
              <Route path="/home" element={<div>Área protegida</div>} />
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
});
