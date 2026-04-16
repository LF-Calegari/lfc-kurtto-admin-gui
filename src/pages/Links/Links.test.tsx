import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { ToastProvider } from '../../contexts/ToastContext';
import { createLink, deleteLink, LinkApiError, listLinks } from '../../services/linkService';

import Links from './Links';

jest.mock('bootstrap/js/dist/tooltip', () => {
  function MockTooltip() {
    return {
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
    mockedListLinks.mockResolvedValue({
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
    });
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
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('lista links ao abrir a página', async () => {
    renderLinks();

    expect(await screen.findByText('https://example.com')).toBeInTheDocument();
    expect(mockedListLinks).toHaveBeenCalledTimes(1);
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

  it('coloca Buscar e Adicionar link no rodapé do card de filtros e usa form sem recarregar', async () => {
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
    expect(adicionar.closest('.card-footer')).not.toBeNull();

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
});
