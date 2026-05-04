import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { ROUTES } from '../../constants/routes';
import { AUTH_SESSION_STORAGE_KEY } from '../../constants/storageKeys';
import { AuthProvider } from '../../contexts/AuthContext';

import Forbidden from './Forbidden';

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

function renderWithRouter(initialState?: { from?: string }): void {
  render(
    <MemoryRouter
      future={routerFuture}
      initialEntries={[{ pathname: ROUTES.FORBIDDEN, state: initialState }]}
    >
      <AuthProvider>
        <Routes>
          <Route path={ROUTES.FORBIDDEN} element={<Forbidden />} />
          <Route path={ROUTES.LOGIN} element={<div>Tela login</div>} />
          <Route path={ROUTES.HOME} element={<div>Tela home</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Forbidden', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    global.fetch = originalFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('renderiza título e mensagem padrão sem state.from', () => {
    renderWithRouter();

    expect(screen.getByRole('heading', { name: /acesso negado/i })).toBeInTheDocument();
    expect(screen.getByText(/não tem permissão para acessar esta página/i)).toBeInTheDocument();
  });

  it('exibe a rota de origem quando state.from foi preservado', () => {
    renderWithRouter({ from: '/links' });

    expect(screen.getByText('/links')).toBeInTheDocument();
  });

  it('botão "Ir para login" aparece quando o usuário não está autenticado', async () => {
    const user = userEvent.setup();
    renderWithRouter();

    const loginButton = await screen.findByRole('button', { name: /ir para login/i });
    await user.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText('Tela login')).toBeInTheDocument();
    });
  });

  it('botão "Voltar para o início" aparece quando o usuário está autenticado', async () => {
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({ token: 'session' }));
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        user: {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'Admin',
          email: 'a@test.com',
          identity: 1,
        },
        permissions: [],
        permissionCodes: [],
        routeCodes: ['KURTTO_V1_HOME'],
      }),
    );
    const user = userEvent.setup();
    renderWithRouter({ from: '/links' });

    const backButton = await screen.findByRole('button', { name: /voltar para o início/i });
    await user.click(backButton);

    await waitFor(() => {
      expect(screen.getByText('Tela home')).toBeInTheDocument();
    });
  });

  it('botão "Sair" só aparece para usuário autenticado', async () => {
    renderWithRouter();

    expect(screen.queryByRole('button', { name: /^sair$/i })).not.toBeInTheDocument();
  });
});
