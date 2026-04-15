import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { createLink, deleteLink, LinkApiError, listLinks, updateLink } from '../../services/linkService';

import Links from './Links';

jest.mock('../../services/linkService', () => ({
  listLinks: jest.fn(),
  createLink: jest.fn(),
  updateLink: jest.fn(),
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
const mockedUpdateLink = updateLink as jest.MockedFunction<typeof updateLink>;
const mockedDeleteLink = deleteLink as jest.MockedFunction<typeof deleteLink>;

describe('Links', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
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
    mockedUpdateLink.mockResolvedValue({
      id: '1',
      originalUrl: 'https://example.com/editado',
      shortCode: 'abc123',
      shortUrl: 'https://k.tt/abc123',
      clicks: 2,
      isActive: true,
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
      expiresAt: null,
      deletedAt: null,
    });
    mockedDeleteLink.mockResolvedValue();
    jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('lista links ao abrir a página', async () => {
    render(
      <MemoryRouter>
        <Links />
      </MemoryRouter>,
    );

    expect(await screen.findByText('https://example.com')).toBeInTheDocument();
    expect(mockedListLinks).toHaveBeenCalledTimes(1);
  });

  it('bloqueia envio inválido e exibe mensagem', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Links />
      </MemoryRouter>,
    );

    await screen.findByText('https://example.com');
    await user.click(screen.getByRole('button', { name: /cadastrar link/i }));

    expect(
      screen.getAllByText('Revise os campos obrigatórios antes de continuar.').length,
    ).toBeGreaterThan(0);
    expect(mockedCreateLink).not.toHaveBeenCalled();
  });

  it('cadastra link válido e exibe sucesso', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Links />
      </MemoryRouter>,
    );

    await screen.findByText('https://example.com');
    await user.type(screen.getByLabelText(/url original/i), 'https://novo.com');
    await user.type(screen.getByLabelText(/código curto/i), 'novo12');
    await user.click(screen.getByRole('button', { name: /cadastrar link/i }));

    await waitFor(() => {
      expect(mockedCreateLink).toHaveBeenCalledWith({
        originalUrl: 'https://novo.com',
        customCode: 'novo12',
      });
    });
    expect(await screen.findByText('Link cadastrado com sucesso.')).toBeInTheDocument();
  });

  it('edita e exclui com atualização da lista', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Links />
      </MemoryRouter>,
    );

    await screen.findByText('https://example.com');
    await user.click(screen.getByRole('button', { name: /editar/i }));
    await user.clear(screen.getByLabelText(/url original/i));
    await user.type(screen.getByLabelText(/url original/i), 'https://example.com/editado');
    await user.click(screen.getByRole('button', { name: /salvar edição/i }));

    await waitFor(() => {
      expect(mockedUpdateLink).toHaveBeenCalledWith('abc123', {
        originalUrl: 'https://example.com/editado',
      });
    });
    expect(await screen.findByText('Link atualizado com sucesso.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /excluir/i }));
    await waitFor(() => {
      expect(mockedDeleteLink).toHaveBeenCalledWith('abc123');
    });
    expect(await screen.findByText('Link removido com sucesso.')).toBeInTheDocument();
  });

  it('exibe erro de indisponibilidade quando listagem falha por timeout/rede', async () => {
    mockedListLinks.mockRejectedValueOnce(new Error('Não foi possível concluir a operação. Tente novamente.'));

    render(
      <MemoryRouter>
        <Links />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('Não foi possível concluir a operação. Tente novamente.'),
    ).toBeInTheDocument();
  });

  it('rejeita URL com protocolo diferente de http(s)', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Links />
      </MemoryRouter>,
    );

    await screen.findByText('https://example.com');
    await user.type(screen.getByLabelText(/url original/i), 'ftp://files.example/resource');
    await user.click(screen.getByRole('button', { name: /cadastrar link/i }));

    expect(await screen.findByText('Informe uma URL válida.')).toBeInTheDocument();
    expect(mockedCreateLink).not.toHaveBeenCalled();
  });

  it('rejeita URL acima do limite de caracteres', async () => {
    const user = userEvent.setup();
    const longUrl = `https://example.com/${'a'.repeat(2040)}`;
    render(
      <MemoryRouter>
        <Links />
      </MemoryRouter>,
    );

    await screen.findByText('https://example.com');
    const urlInput = screen.getByLabelText(/url original/i);
    fireEvent.change(urlInput, { target: { value: longUrl } });
    await user.click(screen.getByRole('button', { name: /cadastrar link/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Revise os campos obrigatórios antes de continuar.');
    expect(mockedCreateLink).not.toHaveBeenCalled();
  });

  it('rejeita código curto com formato inválido', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Links />
      </MemoryRouter>,
    );

    await screen.findByText('https://example.com');
    await user.type(screen.getByLabelText(/url original/i), 'https://novo.com');
    await user.type(screen.getByLabelText(/código curto/i), 'ab');
    await user.click(screen.getByRole('button', { name: /cadastrar link/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Revise os campos obrigatórios antes de continuar.');
    expect(mockedCreateLink).not.toHaveBeenCalled();
  });

  it('exibe erro retornado pela API ao cadastrar', async () => {
    const user = userEvent.setup();
    mockedCreateLink.mockImplementationOnce(() =>
      Promise.reject(new LinkApiError('Já existe um link com estes dados.', 409)),
    );

    render(
      <MemoryRouter>
        <Links />
      </MemoryRouter>,
    );

    await screen.findByText('https://example.com');
    await user.type(screen.getByLabelText(/url original/i), 'https://duplicado.com');
    await user.click(screen.getByRole('button', { name: /cadastrar link/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe um link com estes dados.');
  });

  it('exibe mensagem genérica quando ocorre erro inesperado ao salvar', async () => {
    const user = userEvent.setup();
    mockedCreateLink.mockImplementationOnce(() => Promise.reject(new Error('falha genérica')));

    render(
      <MemoryRouter>
        <Links />
      </MemoryRouter>,
    );

    await screen.findByText('https://example.com');
    await user.type(screen.getByLabelText(/url original/i), 'https://novo.com');
    await user.click(screen.getByRole('button', { name: /cadastrar link/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('falha genérica');
  });

  it('cancela edição e restaura o estado inicial', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Links />
      </MemoryRouter>,
    );

    await screen.findByText('https://example.com');
    await user.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.getByRole('heading', { name: /editar link/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancelar edição/i }));

    expect(screen.getByRole('heading', { name: /cadastrar link/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/url original/i)).toHaveValue('');
  });

  it('não chama exclusão quando o usuário cancela a confirmação', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <MemoryRouter>
        <Links />
      </MemoryRouter>,
    );

    await screen.findByText('https://example.com');
    await user.click(screen.getByRole('button', { name: /^excluir$/i }));

    expect(mockedDeleteLink).not.toHaveBeenCalled();
  });

  it('exibe erro ao falhar a exclusão', async () => {
    const user = userEvent.setup();
    mockedDeleteLink.mockRejectedValueOnce(new LinkApiError('Link não encontrado para esta operação.', 404));

    render(
      <MemoryRouter>
        <Links />
      </MemoryRouter>,
    );

    await screen.findByText('https://example.com');
    await user.click(screen.getByRole('button', { name: /^excluir$/i }));

    expect(await screen.findByText('Link não encontrado para esta operação.')).toBeInTheDocument();
  });

  it('reseta edição ao excluir o link em edição', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Links />
      </MemoryRouter>,
    );

    await screen.findByText('https://example.com');
    await user.click(screen.getByRole('button', { name: /editar/i }));
    await user.click(screen.getByRole('button', { name: /^excluir$/i }));

    await waitFor(() => {
      expect(mockedDeleteLink).toHaveBeenCalledWith('abc123');
    });
    expect(screen.getByRole('heading', { name: /cadastrar link/i })).toBeInTheDocument();
  });
});
