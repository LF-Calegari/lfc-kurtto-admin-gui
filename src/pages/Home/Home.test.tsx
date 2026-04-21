import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { listLinks } from '../../services/linkService';

import Home from './Home';

jest.mock('../../services/linkService', () => ({
  listLinks: jest.fn(),
  LinkApiError: class LinkApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

jest.mock('../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../contexts/AuthContext'),
  useAuth: (): {
    user: { id: string; name: string; email: string };
    isBootstrapping: boolean;
    login: jest.Mock;
    logout: jest.Mock;
  } => ({
    user: {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'Usuário Home',
      email: 'home.user@mail.test',
    },
    isBootstrapping: false,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

const mockedListLinks = listLinks as jest.MockedFunction<typeof listLinks>;

const emptyResult = {
  data: [],
  meta: { page: 1, limit: 1, total: 0, total_pages: 0 },
};

function renderHome(): ReturnType<typeof render> {
  return render(
    <MemoryRouter
      initialEntries={['/home']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Home />
    </MemoryRouter>,
  );
}

describe('Home', () => {
  beforeEach(() => {
    mockedListLinks.mockResolvedValue(emptyResult);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('renderiza sidebar, topo com usuário e saudação', async () => {
    renderHome();

    expect(screen.getByRole('navigation', { name: /navegação principal/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /início/i })).toBeInTheDocument();
    expect(screen.getByText(/usuário home/i)).toBeInTheDocument();
    expect(screen.getAllByText(/home\.user@mail\.test/i).length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText(/olá, usuário/i)).toBeInTheDocument();
  });

  it('exibe cards de estatísticas com valores carregados da API', async () => {
    mockedListLinks
      .mockResolvedValueOnce({ data: [], meta: { page: 1, limit: 1, total: 12, total_pages: 12 } })
      .mockResolvedValueOnce({ data: [], meta: { page: 1, limit: 1, total: 8, total_pages: 8 } })
      .mockResolvedValueOnce({
        data: [
          {
            id: '1',
            originalUrl: 'https://a.com',
            shortCode: 'a1',
            shortUrl: 'https://k.tt/a1',
            clicks: 42,
            isActive: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            expiresAt: null,
            deletedAt: null,
          },
        ],
        meta: { page: 1, limit: 100, total: 12, total_pages: 1 },
      });

    renderHome();

    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  it('exibe erro quando a API falha e permite tentar novamente', async () => {
    mockedListLinks.mockRejectedValueOnce(new Error('falha rede'));

    renderHome();

    expect(await screen.findByText(/não foi possível carregar as métricas/i)).toBeInTheDocument();

    mockedListLinks.mockResolvedValue(emptyResult);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /tentar novamente/i }));

    // A primeira carga dispara Promise.all (2 chamadas em paralelo) e falha.
    // O retry dispara mais 2 chamadas em paralelo; como o total volta 0, não há 3ª busca.
    await waitFor(() => {
      expect(mockedListLinks.mock.calls.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('exibe link de acesso rápido para a página de links', async () => {
    renderHome();
    expect(await screen.findByRole('link', { name: /gerenciar links/i })).toBeInTheDocument();
  });

  it('não exibe seção de erro quando os dados carregam com sucesso', async () => {
    renderHome();

    await waitFor(() => {
      expect(screen.queryByText(/não foi possível carregar as métricas/i)).not.toBeInTheDocument();
    });
  });
});
