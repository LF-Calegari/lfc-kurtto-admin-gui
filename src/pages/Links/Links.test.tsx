import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { AUTH_SESSION_STORAGE_KEY } from '../../constants/storageKeys';
import { ToastProvider } from '../../contexts/ToastContext';
import { listUsersByIds } from '../../services/authService';
import { createLink, deleteLink, LinkApiError, listLinks, restoreLink } from '../../services/linkService';

import Links from './Links';

import type { ListLinksParams } from '../../types/link';

jest.mock('bootstrap/js/dist/tooltip', () => {
  function MockTooltip() {
    return {
      hide: jest.fn(),
      dispose: jest.fn(),
    };
  }
  return {
    __esModule: true,
    default: MockTooltip,
  };
});

jest.mock('../../services/linkService', () => ({
  listLinks: jest.fn(),
  createLink: jest.fn(),
  deleteLink: jest.fn(),
  restoreLink: jest.fn(),
  LinkApiError: class LinkApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

jest.mock('../../services/authService', () => ({
  listUsersByIds: jest.fn(),
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
      name: 'Usuário Links',
      email: 'links.user@mail.test',
    },
    isBootstrapping: false,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

const mockedListLinks = listLinks as jest.MockedFunction<typeof listLinks>;
const mockedCreateLink = createLink as jest.MockedFunction<typeof createLink>;
const mockedDeleteLink = deleteLink as jest.MockedFunction<typeof deleteLink>;
const mockedRestoreLink = restoreLink as jest.MockedFunction<typeof restoreLink>;
const mockedListUsersByIds = listUsersByIds as jest.MockedFunction<typeof listUsersByIds>;

const defaultListMeta = { page: 1, limit: 10, total: 1, total_pages: 1 } as const;

function renderLinks(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Links />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('Links', () => {
  beforeEach(() => {
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({ token: 'jwt-token' }));
    mockedListLinks.mockResolvedValue({
      data: [
        {
          id: '1',
          ownerId: '99999999-9999-9999-9999-999999999999',
          originalUrl: 'https://example.com',
          shortCode: 'abc123',
          shortUrl: 'https://k.tt/abc123',
          clicks: 2,
          isActive: true,
          createdAt: '2026-01-01T10:00:00.000Z',
          updatedAt: '2026-01-01T10:00:00.000Z',
          expiresAt: null,
          deletedAt: null,
        },
      ],
      meta: defaultListMeta,
    });
    mockedListUsersByIds.mockResolvedValue([
      {
        id: '99999999-9999-9999-9999-999999999999',
        name: 'Usuário Dono',
        email: 'owner@mail.test',
      },
    ]);
    mockedCreateLink.mockResolvedValue({
      id: '2',
      originalUrl: 'https://novo.com',
      shortCode: 'novo12',
      shortUrl: 'https://k.tt/novo12',
      clicks: 0,
      isActive: true,
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
      expiresAt: null,
      deletedAt: null,
    });
    mockedDeleteLink.mockResolvedValue();
    mockedRestoreLink.mockResolvedValue({
      id: '1',
      originalUrl: 'https://example.com',
      shortCode: 'abc123',
      shortUrl: 'https://k.tt/abc123',
      clicks: 2,
      isActive: true,
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
      expiresAt: null,
      deletedAt: null,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('lista links ao abrir a página', async () => {
    renderLinks();

    expect(await screen.findByText('https://example.com')).toBeInTheDocument();
    expect(await screen.findByText('Usuário Dono')).toBeInTheDocument();
    expect(mockedListLinks).toHaveBeenCalledTimes(1);
    expect(mockedListUsersByIds).toHaveBeenCalledWith(
      'jwt-token',
      ['99999999-9999-9999-9999-999999999999'],
    );
  });

  it('mostra fallback "Não resolvido" quando a resolução de dono falha', async () => {
    mockedListUsersByIds.mockRejectedValueOnce(new Error('indisponível'));

    renderLinks();

    expect(await screen.findByText('https://example.com')).toBeInTheDocument();
    expect(await screen.findByText('Não resolvido')).toBeInTheDocument();
  });

  it('marca dono como não resolvido quando não há token para resolver ownerId', async () => {
    localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);

    renderLinks();

    expect(await screen.findByText('https://example.com')).toBeInTheDocument();
    expect(await screen.findByText('Não resolvido')).toBeInTheDocument();
    expect(mockedListUsersByIds).not.toHaveBeenCalled();
  });

  it('mantém "Não resolvido" para ownerIds não retornados pelo auth-service', async () => {
    mockedListLinks.mockResolvedValueOnce({
      data: [
        {
          id: '1',
          ownerId: '99999999-9999-9999-9999-999999999999',
          originalUrl: 'https://example.com',
          shortCode: 'abc123',
          shortUrl: 'https://k.tt/abc123',
          clicks: 2,
          isActive: true,
          createdAt: '2026-01-01T10:00:00.000Z',
          updatedAt: '2026-01-01T10:00:00.000Z',
          expiresAt: null,
          deletedAt: null,
        },
        {
          id: '2',
          ownerId: '88888888-8888-8888-8888-888888888888',
          originalUrl: 'https://second.example.com',
          shortCode: 'def456',
          shortUrl: 'https://k.tt/def456',
          clicks: 0,
          isActive: true,
          createdAt: '2026-01-01T10:00:00.000Z',
          updatedAt: '2026-01-01T10:00:00.000Z',
          expiresAt: null,
          deletedAt: null,
        },
      ],
      meta: { page: 1, limit: 10, total: 2, total_pages: 1 },
    });
    mockedListUsersByIds.mockResolvedValueOnce([
      {
        id: '99999999-9999-9999-9999-999999999999',
        name: 'Usuário Dono',
        email: 'owner@mail.test',
      },
    ]);

    renderLinks();

    expect(await screen.findByText('https://example.com')).toBeInTheDocument();
    expect(await screen.findByText('https://second.example.com')).toBeInTheDocument();
    expect(await screen.findByText('Usuário Dono')).toBeInTheDocument();
    expect(await screen.findByText('Não resolvido')).toBeInTheDocument();
    expect(mockedListUsersByIds).toHaveBeenCalledWith(
      'jwt-token',
      expect.arrayContaining([
        '99999999-9999-9999-9999-999999999999',
        '88888888-8888-8888-8888-888888888888',
      ]),
    );
  });

  it('exibe estado transitório de loading do dono antes de resolver o nome', async () => {
    let resolveOwners!: (users: Array<{ id: string; name: string; email: string }>) => void;
    mockedListUsersByIds.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOwners = resolve;
        }),
    );

    renderLinks();

    expect(await screen.findByText('https://example.com')).toBeInTheDocument();
    expect(screen.getByText('Carregando…')).toBeInTheDocument();

    await act(async () => {
      resolveOwners([
        {
          id: '99999999-9999-9999-9999-999999999999',
          name: 'Usuário Dono',
          email: 'owner@mail.test',
        },
      ]);
      await Promise.resolve();
    });

    expect(await screen.findByText('Usuário Dono')).toBeInTheDocument();
  });

  it('tenta novamente resolver dono após erro em nova listagem da sessão', async () => {
    const user = userEvent.setup();
    let resolveSecondAttempt!: (users: Array<{ id: string; name: string; email: string }>) => void;
    mockedListLinks.mockImplementation(() =>
      Promise.resolve({
        data: [
          {
            id: '1',
            ownerId: '99999999-9999-9999-9999-999999999999',
            originalUrl: 'https://example.com',
            shortCode: 'abc123',
            shortUrl: 'https://k.tt/abc123',
            clicks: 2,
            isActive: true,
            createdAt: '2026-01-01T10:00:00.000Z',
            updatedAt: '2026-01-01T10:00:00.000Z',
            expiresAt: null,
            deletedAt: null,
          },
        ],
        meta: defaultListMeta,
      }),
    );
    mockedListUsersByIds
      .mockRejectedValueOnce(new Error('indisponível'))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecondAttempt = resolve;
          }),
      );

    renderLinks();

    expect(await screen.findByText('Não resolvido')).toBeInTheDocument();
    expect(mockedListUsersByIds).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /^buscar$/i }));

    await waitFor(() => {
      expect(mockedListUsersByIds).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByText('Carregando…')).toBeInTheDocument();

    await act(async () => {
      resolveSecondAttempt([
        {
          id: '99999999-9999-9999-9999-999999999999',
          name: 'Usuário Dono',
          email: 'owner@mail.test',
        },
      ]);
      await Promise.resolve();
    });

    expect(await screen.findByText('Usuário Dono')).toBeInTheDocument();
  });

  it('mostra "Sem dono" para link legado sem owner definido', async () => {
    mockedListLinks.mockResolvedValueOnce({
      data: [
        {
          id: 'legacy-1',
          ownerId: '00000000-0000-0000-0000-000000000001',
          originalUrl: 'https://legacy.example.com',
          shortCode: 'legacy1',
          shortUrl: 'https://k.tt/legacy1',
          clicks: 0,
          isActive: true,
          createdAt: '2026-01-01T10:00:00.000Z',
          updatedAt: '2026-01-01T10:00:00.000Z',
          expiresAt: null,
          deletedAt: null,
        },
      ],
      meta: defaultListMeta,
    });

    renderLinks();

    expect(await screen.findByText('https://legacy.example.com')).toBeInTheDocument();
    expect(await screen.findByText('Sem dono')).toBeInTheDocument();
    expect(mockedListUsersByIds).not.toHaveBeenCalled();
  });

  it('abre o modal com diálogo semântico e fecha ao cancelar, no backdrop e com Escape', async () => {
    const user = userEvent.setup();
    renderLinks();

    await screen.findByText('https://example.com');
    await user.click(screen.getByRole('button', { name: /adicionar link/i }));
    expect(screen.getByRole('dialog', { name: /cadastrar link/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^cancelar$/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /adicionar link/i }));
    const backdrop = document.querySelector('.modal-backdrop');
    expect(backdrop).not.toBeNull();
    await user.click(backdrop as HTMLElement);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /adicionar link/i }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('bloqueia envio inválido no modal e exibe mensagem', async () => {
    const user = userEvent.setup();
    renderLinks();

    await screen.findByText('https://example.com');
    await user.click(screen.getByRole('button', { name: /adicionar link/i }));
    await user.click(screen.getByRole('button', { name: /^cadastrar link$/i }));

    expect(
      screen.getAllByText('Revise os campos obrigatórios antes de continuar.').length,
    ).toBeGreaterThan(0);
    expect(mockedCreateLink).not.toHaveBeenCalled();
  });

  it('não fecha o modal com Escape enquanto o envio está em andamento', async () => {
    const user = userEvent.setup();
    const pendingCreate: {
      resolve?: (value: Awaited<ReturnType<typeof createLink>>) => void;
    } = {};
    mockedCreateLink.mockImplementationOnce(
      () =>
        new Promise<Awaited<ReturnType<typeof createLink>>>((resolve) => {
          pendingCreate.resolve = resolve;
        }),
    );

    renderLinks();

    await screen.findByText('https://example.com');
    await user.click(screen.getByRole('button', { name: /adicionar link/i }));
    await user.type(screen.getByLabelText(/^url original$/i), 'https://pendente.com');
    await user.click(screen.getByRole('button', { name: /^cadastrar link$/i }));

    await waitFor(() => {
      expect(mockedCreateLink).toHaveBeenCalled();
    });
    expect(await screen.findByLabelText('Salvando')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await act(async () => {
      pendingCreate.resolve?.({
        id: '9',
        originalUrl: 'https://pendente.com',
        shortCode: 'p1',
        shortUrl: 'https://k.tt/p1',
        clicks: 0,
        isActive: true,
        createdAt: '2026-01-01T10:00:00.000Z',
        updatedAt: '2026-01-01T10:00:00.000Z',
        expiresAt: null,
        deletedAt: null,
      });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('cadastra link válido pelo modal e exibe sucesso', async () => {
    const user = userEvent.setup();
    renderLinks();

    await screen.findByText('https://example.com');
    await user.click(screen.getByRole('button', { name: /adicionar link/i }));
    await user.type(screen.getByLabelText(/^url original$/i), 'https://novo.com');
    await user.click(screen.getByRole('button', { name: /^cadastrar link$/i }));

    await waitFor(() => {
      expect(mockedCreateLink).toHaveBeenCalledWith({
        originalUrl: 'https://novo.com',
      });
    });
    expect(await screen.findByText('Link cadastrado com sucesso.')).toBeInTheDocument();
    await waitFor(() => {
      expect(mockedListLinks.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('exclui com atualização da lista', async () => {
    const user = userEvent.setup();
    renderLinks();

    await screen.findByText('https://example.com');
    await user.click(screen.getByRole('button', { name: /excluir link/i }));
    const deleteDialog = screen.getByRole('dialog', { name: /excluir link/i });
    expect(deleteDialog).toBeInTheDocument();
    await user.click(within(deleteDialog).getByRole('button', { name: /confirmar exclusão/i }));

    await waitFor(() => {
      expect(mockedDeleteLink).toHaveBeenCalledWith('abc123');
    });
    expect(await screen.findByText('Link removido com sucesso.')).toBeInTheDocument();
    await waitFor(() => {
      expect(mockedListLinks.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('exibe erro de indisponibilidade quando listagem falha por timeout/rede', async () => {
    mockedListLinks.mockRejectedValueOnce(new Error('Não foi possível concluir a operação. Tente novamente.'));

    renderLinks();

    expect(
      await screen.findByText('Não foi possível concluir a operação. Tente novamente.'),
    ).toBeInTheDocument();
  });

  it('rejeita URL com protocolo diferente de http(s)', async () => {
    const user = userEvent.setup();
    renderLinks();

    await screen.findByText('https://example.com');
    await user.click(screen.getByRole('button', { name: /adicionar link/i }));
    await user.type(screen.getByLabelText(/^url original$/i), 'ftp://files.example/resource');
    await user.click(screen.getByRole('button', { name: /^cadastrar link$/i }));

    expect(await screen.findByText('Informe uma URL válida.')).toBeInTheDocument();
    expect(mockedCreateLink).not.toHaveBeenCalled();
  });

  it('rejeita URL acima do limite de caracteres', async () => {
    const user = userEvent.setup();
    const longUrl = `https://example.com/${'a'.repeat(2040)}`;
    renderLinks();

    await screen.findByText('https://example.com');
    await user.click(screen.getByRole('button', { name: /adicionar link/i }));
    const urlInput = screen.getByLabelText(/^url original$/i);
    fireEvent.change(urlInput, { target: { value: longUrl } });
    await user.click(screen.getByRole('button', { name: /^cadastrar link$/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Revise os campos obrigatórios antes de continuar.');
    expect(mockedCreateLink).not.toHaveBeenCalled();
  });

  it('exibe erro retornado pela API ao cadastrar', async () => {
    const user = userEvent.setup();
    mockedCreateLink.mockImplementationOnce(() =>
      Promise.reject(new LinkApiError('Já existe um link com estes dados.', 409)),
    );

    renderLinks();

    await screen.findByText('https://example.com');
    await user.click(screen.getByRole('button', { name: /adicionar link/i }));
    await user.type(screen.getByLabelText(/^url original$/i), 'https://duplicado.com');
    await user.click(screen.getByRole('button', { name: /^cadastrar link$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe um link com estes dados.');
  });

  it('exibe mensagem genérica quando ocorre erro inesperado ao salvar', async () => {
    const user = userEvent.setup();
    mockedCreateLink.mockImplementationOnce(() => Promise.reject(new Error('falha genérica')));

    renderLinks();

    await screen.findByText('https://example.com');
    await user.click(screen.getByRole('button', { name: /adicionar link/i }));
    await user.type(screen.getByLabelText(/^url original$/i), 'https://novo.com');
    await user.click(screen.getByRole('button', { name: /^cadastrar link$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('falha genérica');
  });

  it('não chama exclusão quando o usuário cancela a confirmação', async () => {
    const user = userEvent.setup();

    renderLinks();

    await screen.findByText('https://example.com');
    await user.click(screen.getByRole('button', { name: /excluir link/i }));
    const deleteDialog = screen.getByRole('dialog', { name: /excluir link/i });
    expect(deleteDialog).toBeInTheDocument();
    await user.click(within(deleteDialog).getByRole('button', { name: /^cancelar$/i }));

    expect(mockedDeleteLink).not.toHaveBeenCalled();
  });

  it('exibe erro ao falhar a exclusão', async () => {
    const user = userEvent.setup();
    mockedDeleteLink.mockRejectedValueOnce(new LinkApiError('Link não encontrado para esta operação.', 404));

    renderLinks();

    await screen.findByText('https://example.com');
    await user.click(screen.getByRole('button', { name: /excluir link/i }));
    const deleteDialog = screen.getByRole('dialog', { name: /excluir link/i });
    await user.click(within(deleteDialog).getByRole('button', { name: /confirmar exclusão/i }));

    expect(await screen.findByText('Link não encontrado para esta operação.')).toBeInTheDocument();
  });

  it('mantém Buscar no rodapé do card de filtros, expõe Adicionar link no cabeçalho da página e usa form sem recarregar', async () => {
    const user = userEvent.setup();
    renderLinks();

    await screen.findByText('https://example.com');
    expect(mockedListLinks).toHaveBeenCalledTimes(1);

    const filterForm = document.getElementById('links-filter-form');
    expect(filterForm).not.toBeNull();
    expect(filterForm?.tagName.toLowerCase()).toBe('form');

    const buscar = screen.getByRole('button', { name: /^buscar$/i });
    const adicionar = screen.getByRole('button', { name: /adicionar link/i });
    expect(buscar.closest('.card-footer')).not.toBeNull();
    // "Adicionar link" é ação primária da página — fica no cabeçalho, fora do card de filtros.
    expect(adicionar.closest('.card-footer')).toBeNull();
    expect(adicionar.closest('form#links-filter-form')).toBeNull();

    await user.click(buscar);
    await waitFor(() => {
      expect(mockedListLinks).toHaveBeenCalledTimes(2);
    });
    expect(mockedListLinks.mock.calls[1][0]).toEqual(
      expect.objectContaining({ page: 1, limit: 10 }),
    );
  });

  it('não consulta o backend ao digitar; Buscar e Enter disparam listagem com q', async () => {
    const user = userEvent.setup();
    mockedListLinks.mockResolvedValue({
      data: [
        {
          id: '1',
          originalUrl: 'https://alpha.com',
          shortCode: 'alpha1',
          shortUrl: 'https://k.tt/alpha1',
          clicks: 1,
          isActive: true,
          createdAt: '2026-01-01T10:00:00.000Z',
          updatedAt: '2026-01-01T10:00:00.000Z',
          expiresAt: null,
          deletedAt: null,
        },
      ],
      meta: { page: 1, limit: 10, total: 2, total_pages: 1 },
    });

    renderLinks();

    await screen.findByText('https://alpha.com');
    expect(mockedListLinks).toHaveBeenCalledTimes(1);
    expect(mockedListLinks.mock.calls[0][0]).toEqual(expect.objectContaining({ page: 1, limit: 10 }));

    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, 'beta');
    expect(mockedListLinks).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /^buscar$/i }));
    await waitFor(() => {
      expect(mockedListLinks).toHaveBeenCalledTimes(2);
    });
    expect(mockedListLinks.mock.calls[1][0]).toEqual(
      expect.objectContaining({ page: 1, limit: 10, q: 'beta' }),
    );

    await user.clear(searchInput);
    await user.type(searchInput, 'gamma');
    await user.keyboard('{Enter}');
    await waitFor(() => {
      expect(mockedListLinks).toHaveBeenCalledTimes(3);
    });
    expect(mockedListLinks.mock.calls[2][0]).toEqual(
      expect.objectContaining({ page: 1, limit: 10, q: 'gamma' }),
    );
  });

  it('troca de página reutiliza o termo de busca aplicado', async () => {
    const user = userEvent.setup();
    const rowP2 = {
      id: '2',
      originalUrl: 'https://page-two.com',
      shortCode: 'pgtwo',
      shortUrl: 'https://k.tt/pgtwo',
      clicks: 0,
      isActive: true,
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
      expiresAt: null,
      deletedAt: null,
    };
    mockedListLinks
      .mockResolvedValueOnce({
        data: [
          {
            id: '1',
            originalUrl: 'https://alpha.com',
            shortCode: 'alpha1',
            shortUrl: 'https://k.tt/alpha1',
            clicks: 1,
            isActive: true,
            createdAt: '2026-01-01T10:00:00.000Z',
            updatedAt: '2026-01-01T10:00:00.000Z',
            expiresAt: null,
            deletedAt: null,
          },
        ],
        meta: { page: 1, limit: 10, total: 15, total_pages: 2 },
      })
      .mockResolvedValueOnce({
        data: [rowP2],
        meta: { page: 1, limit: 10, total: 15, total_pages: 2 },
      })
      .mockResolvedValue({
        data: [rowP2],
        meta: { page: 2, limit: 10, total: 15, total_pages: 2 },
      });

    renderLinks();
    await screen.findByText('https://alpha.com');

    await user.type(screen.getByRole('searchbox'), 'termo');
    await user.click(screen.getByRole('button', { name: /^buscar$/i }));
    await waitFor(() => {
      expect(mockedListLinks.mock.calls.some((c) => c[0]?.q === 'termo')).toBe(true);
    });

    await user.click(screen.getByRole('button', { name: /^próxima$/i }));
    await waitFor(() => {
      expect(mockedListLinks.mock.calls.some((c) => c[0]?.page === 2 && c[0]?.q === 'termo')).toBe(true);
    });
  });

  it('aplica filtro avançado de código curto e exibe resumo em chips', async () => {
    const user = userEvent.setup();
    renderLinks();

    await screen.findByText('https://example.com');
    await user.click(screen.getByRole('button', { name: /filtros avançados/i }));
    expect(document.getElementById('links-advanced-filters')?.tagName.toLowerCase()).toBe('section');
    await user.selectOptions(screen.getByLabelText(/modo de filtro do código curto/i), 'eq');
    await user.type(screen.getByLabelText(/^valor do código curto$/i), 'xcode');
    await user.click(screen.getByRole('button', { name: /^buscar$/i }));

    await waitFor(() => {
      expect(mockedListLinks.mock.calls.some((c) => c[0]?.short_code__eq === 'xcode')).toBe(true);
    });
    expect(screen.getByText(/Código \(igual\): xcode/)).toBeInTheDocument();
  });

  it('limpa filtros avançados e volta à listagem sem parâmetros de filtro', async () => {
    const user = userEvent.setup();
    renderLinks();

    await screen.findByText('https://example.com');
    await user.click(screen.getByRole('button', { name: /filtros avançados/i }));
    await user.selectOptions(screen.getByLabelText(/modo de filtro do código curto/i), 'eq');
    await user.type(screen.getByLabelText(/^valor do código curto$/i), 'abc');
    await user.click(screen.getByRole('button', { name: /^buscar$/i }));

    await waitFor(() => {
      expect(mockedListLinks.mock.calls.some((c) => c[0]?.short_code__eq === 'abc')).toBe(true);
    });

    await user.click(screen.getByRole('button', { name: /^limpar filtros$/i }));

    await waitFor(() => {
      const lastCall = mockedListLinks.mock.calls[mockedListLinks.mock.calls.length - 1]?.[0];
      expect(lastCall).toEqual(expect.objectContaining({ page: 1, limit: 10 }));
      expect(lastCall?.short_code__eq).toBeUndefined();
      expect(lastCall?.q).toBeUndefined();
    });
  });

  it('remove um filtro individual pelo chip sem afetar os demais', async () => {
    const user = userEvent.setup();
    renderLinks();
    await screen.findByText('https://example.com');

    await user.click(screen.getByRole('button', { name: /filtros avançados/i }));
    await user.selectOptions(screen.getByLabelText(/modo de filtro do código curto/i), 'eq');
    await user.type(screen.getByLabelText(/^valor do código curto$/i), 'abc');
    await user.selectOptions(screen.getByLabelText(/^status$/i), 'true');
    await user.click(screen.getByRole('button', { name: /^buscar$/i }));

    await waitFor(() => {
      expect(
        mockedListLinks.mock.calls.some(
          (c) => c[0]?.short_code__eq === 'abc' && c[0]?.active === true,
        ),
      ).toBe(true);
    });

    // Remove somente o chip de código curto
    await user.click(screen.getByRole('button', { name: /remover filtro código \(igual\): abc/i }));

    await waitFor(() => {
      const last = mockedListLinks.mock.calls[mockedListLinks.mock.calls.length - 1]?.[0];
      expect(last?.short_code__eq).toBeUndefined();
      expect(last?.active).toBe(true);
    });
  });

  it('remove o chip de busca e reaplica listagem sem parâmetro q', async () => {
    const user = userEvent.setup();
    renderLinks();
    await screen.findByText('https://example.com');

    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, 'chip-q');
    await user.click(screen.getByRole('button', { name: /^buscar$/i }));

    await waitFor(() => {
      expect(mockedListLinks.mock.calls.some((c) => c[0]?.q === 'chip-q')).toBe(true);
    });

    await user.click(screen.getByRole('button', { name: /remover filtro busca: chip-q/i }));

    await waitFor(() => {
      const last = mockedListLinks.mock.calls[mockedListLinks.mock.calls.length - 1]?.[0];
      expect(last).toEqual(expect.objectContaining({ page: 1, limit: 10 }));
      expect(last?.q).toBeUndefined();
    });
  });

  it('copia a URL curta ao clicar no botão de copiar e exibe feedback de sucesso', async () => {
    const user = userEvent.setup();
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    renderLinks();
    await screen.findByText('https://example.com');

    const copyButton = screen.getByRole('button', { name: /copiar url curta https:\/\/k\.tt\/abc123/i });
    await user.click(copyButton);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('https://k.tt/abc123');
    });
    expect(await screen.findByText('URL curta copiada.')).toBeInTheDocument();
  });

  it('exibe erro quando falha ao copiar a URL curta', async () => {
    const user = userEvent.setup();
    const writeText = jest.fn().mockRejectedValue(new Error('clipboard blocked'));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    renderLinks();
    await screen.findByText('https://example.com');

    const copyButton = screen.getByRole('button', { name: /copiar url curta https:\/\/k\.tt\/abc123/i });
    await user.click(copyButton);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('https://k.tt/abc123');
    });
    expect(await screen.findByText('Não foi possível copiar a URL.')).toBeInTheDocument();
  });

  it('exibe erro quando clipboard não está disponível no navegador', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });

    renderLinks();
    await screen.findByText('https://example.com');

    await user.click(
      screen.getByRole('button', { name: /copiar url curta https:\/\/k\.tt\/abc123/i }),
    );

    expect(await screen.findByText('Não foi possível copiar a URL.')).toBeInTheDocument();
  });

  it('exibe estado vazio sem cadastros quando não há filtros', async () => {
    mockedListLinks.mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 10, total: 0, total_pages: 0 },
    });

    renderLinks();

    expect(await screen.findByText('Nenhum link cadastrado.')).toBeInTheDocument();
  });

  it('exibe estado de busca vazia e limpa filtros pelo painel da listagem', async () => {
    const user = userEvent.setup();
    mockedListLinks
      .mockResolvedValueOnce({
        data: [
          {
            id: '1',
            originalUrl: 'https://example.com',
            shortCode: 'abc123',
            shortUrl: 'https://k.tt/abc123',
            clicks: 2,
            isActive: true,
            createdAt: '2026-01-01T10:00:00.000Z',
            updatedAt: '2026-01-01T10:00:00.000Z',
            expiresAt: null,
            deletedAt: null,
          },
        ],
        meta: defaultListMeta,
      })
      .mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 10, total: 0, total_pages: 0 },
      });

    renderLinks();
    await screen.findByText('https://example.com');

    await user.type(screen.getByRole('searchbox'), 'nada');
    await user.click(screen.getByRole('button', { name: /^buscar$/i }));

    expect(await screen.findByText('Nenhum link corresponde aos filtros.')).toBeInTheDocument();
    const emptySearchHint = screen.getByText('Ajuste os filtros ou limpe para ver todos os links.');
    await user.click(within(emptySearchHint.closest('div') as HTMLElement).getByRole('button', { name: /^limpar filtros$/i }));

    await waitFor(() => {
      const last = mockedListLinks.mock.calls[mockedListLinks.mock.calls.length - 1]?.[0];
      expect(last).toEqual(expect.objectContaining({ page: 1, limit: 10 }));
      expect(last?.q).toBeUndefined();
    });
  });

  it('recarrega a listagem ao clicar em Tentar novamente após erro', async () => {
    const user = userEvent.setup();
    mockedListLinks
      .mockRejectedValueOnce(new Error('falha rede'))
      .mockResolvedValue({
        data: [
          {
            id: '1',
            originalUrl: 'https://retry.com',
            shortCode: 'retry1',
            shortUrl: 'https://k.tt/retry1',
            clicks: 0,
            isActive: true,
            createdAt: '2026-01-01T10:00:00.000Z',
            updatedAt: '2026-01-01T10:00:00.000Z',
            expiresAt: null,
            deletedAt: null,
          },
        ],
        meta: defaultListMeta,
      });

    renderLinks();
    expect(await screen.findByText('Não foi possível carregar a listagem.')).toBeInTheDocument();
    expect(mockedListLinks).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /tentar novamente/i }));

    expect(await screen.findByText('https://retry.com')).toBeInTheDocument();
    await waitFor(() => {
      expect(mockedListLinks).toHaveBeenCalledTimes(2);
    });
  });

  it('ignora segunda listagem enquanto a primeira ainda está em voo', async () => {
    let resolvePending!: (value: Awaited<ReturnType<typeof listLinks>>) => void;
    const listRow = {
      id: '1',
      originalUrl: 'https://example.com',
      shortCode: 'abc123',
      shortUrl: 'https://k.tt/abc123',
      clicks: 2,
      isActive: true,
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
      expiresAt: null,
      deletedAt: null,
    };
    const payload: Awaited<ReturnType<typeof listLinks>> = { data: [listRow], meta: defaultListMeta };

    mockedListLinks.mockResolvedValueOnce(payload).mockImplementation(
      () =>
        new Promise<Awaited<ReturnType<typeof listLinks>>>((resolve) => {
          resolvePending = resolve;
        }),
    );

    renderLinks();
    await screen.findByText('https://example.com');
    expect(mockedListLinks).toHaveBeenCalledTimes(1);

    const buscar = screen.getByRole('button', { name: /^buscar$/i });
    act(() => {
      fireEvent.click(buscar);
      fireEvent.click(buscar);
    });
    await waitFor(() => {
      expect(mockedListLinks).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      resolvePending(payload);
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(screen.getByText('https://example.com')).toBeInTheDocument();
    });
  });

  it('alterna expansão dos filtros avançados e reflete aria-expanded', async () => {
    const user = userEvent.setup();
    renderLinks();
    await screen.findByText('https://example.com');

    const toggle = screen.getByRole('button', { name: /filtros avançados/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById('links-advanced-filters')).toHaveClass('d-none');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById('links-advanced-filters')).not.toHaveClass('d-none');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('exibe contagem de filtros ativos no botão de filtros avançados', async () => {
    const user = userEvent.setup();
    renderLinks();
    await screen.findByText('https://example.com');

    await user.click(screen.getByRole('button', { name: /filtros avançados/i }));
    await user.type(document.getElementById('links-filter-id') as HTMLInputElement, 'uuid-test');
    await user.click(screen.getByRole('button', { name: /^buscar$/i }));

    await waitFor(() => {
      expect(mockedListLinks.mock.calls.some((c) => c[0]?.id__eq === 'uuid-test')).toBe(true);
    });

    const toggle = screen.getByRole('button', { name: /filtros avançados/i });
    expect(within(toggle).getByText('1')).toBeInTheDocument();
  });

  it('preenche campos avançados (URL, cliques entre, datas, status e excluídos) e aplica', async () => {
    const user = userEvent.setup();
    renderLinks();
    await screen.findByText('https://example.com');

    await user.click(screen.getByRole('button', { name: /filtros avançados/i }));

    await user.selectOptions(screen.getByLabelText(/modo de filtro da url original/i), 'like');
    await user.type(screen.getByLabelText(/^valor da url original$/i), 'loja');

    await user.selectOptions(screen.getByLabelText(/operador de cliques/i), 'between');
    await user.type(screen.getByLabelText(/^cliques mínimos$/i), '1');
    await user.type(screen.getByLabelText(/^cliques máximos$/i), '10');

    const createdFrom = '2026-02-01T08:00';
    const createdTo = '2026-02-10T18:00';
    await user.type(screen.getByLabelText('De', { selector: '#links-filter-created-from' }), createdFrom);
    await user.type(screen.getByLabelText('Até', { selector: '#links-filter-created-to' }), createdTo);

    await user.selectOptions(screen.getByLabelText(/^status$/i), 'false');

    await user.click(screen.getByRole('checkbox', { name: /incluir excluídos/i }));

    const deletedFrom = '2026-03-01T09:00';
    const deletedTo = '2026-03-05T09:00';
    await user.type(screen.getByLabelText('De', { selector: '#links-filter-deleted-from' }), deletedFrom);
    await user.type(screen.getByLabelText('Até', { selector: '#links-filter-deleted-to' }), deletedTo);

    await user.click(screen.getByRole('button', { name: /^buscar$/i }));

    await waitFor(() => {
      const hit = mockedListLinks.mock.calls.find(
        (c) =>
          c[0]?.original_url__like === 'loja' &&
          c[0]?.clicks__between === '1,10' &&
          c[0]?.active === false &&
          c[0]?.include_deleted === true,
      );
      expect(hit).toBeDefined();
      expect(hit?.[0]?.created_at__between).toBeDefined();
      expect(hit?.[0]?.deleted_at__between).toBeDefined();
    });

    expect(screen.getByText(/URL \(contém\): loja/)).toBeInTheDocument();
  });

  it('navega para página anterior mantendo filtros aplicados', async () => {
    const user = userEvent.setup();
    const rowP1 = {
      id: '1',
      originalUrl: 'https://p1.com',
      shortCode: 'p1code',
      shortUrl: 'https://k.tt/p1code',
      clicks: 0,
      isActive: true,
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
      expiresAt: null,
      deletedAt: null,
    };
    mockedListLinks.mockImplementation((params?: Readonly<ListLinksParams>) => {
      const page = params?.page ?? 1;
      return Promise.resolve({
        data: [rowP1],
        meta: {
          page,
          limit: 10,
          total: 25,
          total_pages: 3,
        },
      });
    });

    renderLinks();
    await screen.findByText('https://p1.com');

    await user.type(screen.getByRole('searchbox'), 'x');
    await user.click(screen.getByRole('button', { name: /^buscar$/i }));
    await waitFor(() => {
      expect(mockedListLinks.mock.calls.some((c) => c[0]?.q === 'x')).toBe(true);
    });

    await user.click(screen.getByRole('button', { name: /^próxima$/i }));
    await waitFor(() => {
      expect(mockedListLinks.mock.calls.some((c) => c[0]?.page === 2)).toBe(true);
    });

    await user.click(screen.getByRole('button', { name: /^anterior$/i }));
    await waitFor(() => {
      expect(mockedListLinks.mock.calls.some((c) => c[0]?.page === 1 && c[0]?.q === 'x')).toBe(true);
    });
  });

  it('fecha o modal de exclusão ao clicar no backdrop quando não está excluindo', async () => {
    const user = userEvent.setup();
    renderLinks();

    await screen.findByText('https://example.com');
    await user.click(screen.getByRole('button', { name: /excluir link/i }));

    const backdrop = document.querySelectorAll('.modal-backdrop')[0];
    expect(backdrop).not.toBeNull();
    await user.click(backdrop as HTMLElement);

    expect(screen.queryByRole('dialog', { name: /excluir link/i })).not.toBeInTheDocument();
  });

  it('não fecha o modal de exclusão com Escape enquanto a exclusão está em andamento', async () => {
    const user = userEvent.setup();
    let resolveDelete!: () => void;
    mockedDeleteLink.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveDelete = resolve;
        }),
    );

    renderLinks();
    await screen.findByText('https://example.com');
    await user.click(screen.getByRole('button', { name: /excluir link/i }));
    await user.click(screen.getByRole('button', { name: /confirmar exclusão/i }));

    await waitFor(() => {
      expect(mockedDeleteLink).toHaveBeenCalled();
    });

    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog', { name: /excluir link/i })).toBeInTheDocument();

    await act(async () => {
      resolveDelete();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /excluir link/i })).not.toBeInTheDocument();
    });
  });

  it('exibe toast de erro quando a listagem falha após aplicar filtros', async () => {
    const user = userEvent.setup();
    mockedListLinks
      .mockResolvedValueOnce({
        data: [
          {
            id: '1',
            originalUrl: 'https://example.com',
            shortCode: 'abc123',
            shortUrl: 'https://k.tt/abc123',
            clicks: 2,
            isActive: true,
            createdAt: '2026-01-01T10:00:00.000Z',
            updatedAt: '2026-01-01T10:00:00.000Z',
            expiresAt: null,
            deletedAt: null,
          },
        ],
        meta: defaultListMeta,
      })
      .mockRejectedValueOnce(new Error('erro ao filtrar'));

    renderLinks();
    await screen.findByText('https://example.com');

    await user.click(screen.getByRole('button', { name: /filtros avançados/i }));
    await user.selectOptions(screen.getByLabelText(/modo de filtro do código curto/i), 'eq');
    await user.type(screen.getByLabelText(/^valor do código curto$/i), 'z');
    await user.click(screen.getByRole('button', { name: /^buscar$/i }));

    expect(await screen.findByText('erro ao filtrar')).toBeInTheDocument();
  });

  it('exibe botão Restaurar (e oculta Excluir) para link soft-deleted', async () => {
    mockedListLinks.mockResolvedValueOnce({
      data: [
        {
          id: '1',
          originalUrl: 'https://example.com',
          shortCode: 'abc123',
          shortUrl: 'https://k.tt/abc123',
          clicks: 2,
          isActive: false,
          createdAt: '2026-01-01T10:00:00.000Z',
          updatedAt: '2026-01-01T10:00:00.000Z',
          expiresAt: null,
          deletedAt: '2026-01-02T10:00:00.000Z',
        },
      ],
      meta: defaultListMeta,
    });

    renderLinks();

    await screen.findByText('https://example.com');
    expect(screen.getByRole('button', { name: /restaurar link/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /excluir link/i })).not.toBeInTheDocument();
  });

  it('exibe badge de status inativo para link não excluído e inativo', async () => {
    mockedListLinks.mockResolvedValueOnce({
      data: [
        {
          id: 'inactive-1',
          originalUrl: 'https://inactive.example.com',
          shortCode: 'inactive1',
          shortUrl: 'https://k.tt/inactive1',
          clicks: 0,
          isActive: false,
          createdAt: '2026-01-01T10:00:00.000Z',
          updatedAt: '2026-01-01T10:00:00.000Z',
          expiresAt: null,
          deletedAt: null,
        },
      ],
      meta: defaultListMeta,
    });

    renderLinks();

    expect(await screen.findByText('https://inactive.example.com')).toBeInTheDocument();
    expect(screen.getByText('Inativo')).toBeInTheDocument();
  });

  it('restaura link ao clicar em Restaurar, exibe toast de sucesso e refaz a listagem', async () => {
    const user = userEvent.setup();
    mockedListLinks.mockResolvedValueOnce({
      data: [
        {
          id: '1',
          originalUrl: 'https://example.com',
          shortCode: 'abc123',
          shortUrl: 'https://k.tt/abc123',
          clicks: 2,
          isActive: false,
          createdAt: '2026-01-01T10:00:00.000Z',
          updatedAt: '2026-01-01T10:00:00.000Z',
          expiresAt: null,
          deletedAt: '2026-01-02T10:00:00.000Z',
        },
      ],
      meta: defaultListMeta,
    });

    renderLinks();
    await screen.findByText('https://example.com');

    await user.click(screen.getByRole('button', { name: /restaurar link/i }));

    await waitFor(() => {
      expect(mockedRestoreLink).toHaveBeenCalledWith('abc123');
    });
    expect(await screen.findByText(/Link restaurado com sucesso\./i)).toBeInTheDocument();
    await waitFor(() => {
      expect(mockedListLinks).toHaveBeenCalledTimes(2);
    });
  });

  it('exibe toast de erro quando restauração falha', async () => {
    const user = userEvent.setup();
    mockedListLinks.mockResolvedValueOnce({
      data: [
        {
          id: '1',
          originalUrl: 'https://example.com',
          shortCode: 'abc123',
          shortUrl: 'https://k.tt/abc123',
          clicks: 2,
          isActive: false,
          createdAt: '2026-01-01T10:00:00.000Z',
          updatedAt: '2026-01-01T10:00:00.000Z',
          expiresAt: null,
          deletedAt: '2026-01-02T10:00:00.000Z',
        },
      ],
      meta: defaultListMeta,
    });
    mockedRestoreLink.mockRejectedValueOnce(new LinkApiError('Este link não está excluído.', 422));

    renderLinks();
    await screen.findByText('https://example.com');

    await user.click(screen.getByRole('button', { name: /restaurar link/i }));

    expect(await screen.findByText('Este link não está excluído.')).toBeInTheDocument();
    await waitFor(() => {
      const restoreButton = screen.getByRole('button', { name: /restaurar link/i });
      expect(restoreButton).not.toBeDisabled();
    });
  });
});
