import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { AuthProvider } from '../../contexts/AuthContext';
import Home from '../Home/Home';

import Login from './Login';

jest.mock('../../services/linkService', () => ({
  listLinks: jest.fn().mockResolvedValue({
    data: [],
    meta: { page: 1, limit: 1, total: 0, total_pages: 0 },
  }),
  LinkApiError: class LinkApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

function jsonResponse(body: unknown, status = 200): Response {
  const ok = status >= 200 && status < 300;
  const payload = JSON.stringify(body);
  return {
    ok,
    status,
    text: async () => payload,
  } as Response;
}

const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true } as const;

function renderLoginOnly(): void {
  render(
    <MemoryRouter future={routerFuture} initialEntries={['/login']}>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>,
  );
}

function renderLoginWithHomeRoute(): void {
  render(
    <MemoryRouter future={routerFuture} initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<Home />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Login', () => {
  const originalFetch = global.fetch;

  const createValidCredentials = (): { email: string; password: string } => {
    const timestamp = Date.now();
    return {
      email: `user.${timestamp}@mail.test`,
      password: `Pwd-${timestamp}-safe`,
    };
  };

  const setViewport = (width: number): void => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: width,
    });
    window.dispatchEvent(new Event('resize'));
  };

  beforeEach(() => {
    localStorage.clear();
    global.fetch = originalFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('renderiza estrutura principal da tela', () => {
    renderLoginOnly();

    expect(screen.getByRole('heading', { name: /entrar no kurtto/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toHaveClass('btn', 'btn-primary');
  });

  it('valida envio com campos vazios', async () => {
    const user = userEvent.setup();

    renderLoginOnly();

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /entrar/i }));
    });

    expect(screen.getByText(/informe o e-mail para entrar/i)).toBeInTheDocument();
    expect(screen.getByText(/informe a senha para entrar/i)).toBeInTheDocument();
  });

  it('valida formato de e-mail inválido', async () => {
    const user = userEvent.setup();

    renderLoginOnly();

    await act(async () => {
      await user.type(screen.getByLabelText(/e-mail/i), 'email-invalido');
      await user.type(screen.getByLabelText(/^senha$/i), 'senha-qualquer');
      await user.click(screen.getByRole('button', { name: /entrar/i }));
    });

    expect(screen.getByText(/informe um e-mail válido/i)).toBeInTheDocument();
  });

  it('redireciona para Home após login bem-sucedido', async () => {
    const user = userEvent.setup();
    const validCredentials = createValidCredentials();

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ token: 'jwt-login' }))
      .mockResolvedValueOnce(
        jsonResponse({
          user: {
            id: '22222222-2222-2222-2222-222222222222',
            name: 'Usuário QA',
            email: validCredentials.email,
            identity: 1,
          },
          permissions: [],
          permissionCodes: [],
          routeCodes: [],
        }),
      );
    global.fetch = fetchMock;

    renderLoginWithHomeRoute();

    await act(async () => {
      await user.type(screen.getByLabelText(/e-mail/i), validCredentials.email);
      await user.type(screen.getByLabelText(/^senha$/i), validCredentials.password);
      await user.click(screen.getByRole('button', { name: /entrar/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/olá,/i)).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalled();
  });

  it('exibe mensagem clara em erro de autenticação', async () => {
    const user = userEvent.setup();
    const validCredentials = createValidCredentials();

    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({ message: 'Credenciais inválidas.' }, 401),
    );

    renderLoginOnly();

    await act(async () => {
      await user.type(screen.getByLabelText(/e-mail/i), validCredentials.email);
      await user.type(screen.getByLabelText(/^senha$/i), 'wrong-pass');
      await user.click(screen.getByRole('button', { name: /entrar/i }));
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/credenciais inválidas/i);
    });
  });

  it.each([1024, 1920])(
    'mantem layout estrutural consistente para viewport desktop %ipx',
    (width) => {
      setViewport(width);
      const { container } = render(
        <MemoryRouter future={routerFuture}>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </MemoryRouter>,
      );

      const row = container.querySelector('.row');
      const sections = container.querySelectorAll('section');
      const [brandSection, formSection] = Array.from(sections);

      expect(window.innerWidth).toBe(width);
      expect(row).toHaveClass('row', 'g-0', 'min-vh-100');
      expect(sections).toHaveLength(2);
      expect(brandSection).toHaveClass('col-12', 'col-lg-6', 'd-flex', 'align-items-center');
      expect(formSection).toHaveClass(
        'col-12',
        'col-lg-6',
        'd-flex',
        'align-items-center',
        'justify-content-center',
      );
      expect(screen.getByRole('heading', { name: /gerencie seus links com rapidez/i })).toBeVisible();
      expect(screen.getByRole('button', { name: /entrar/i })).toHaveClass('btn', 'btn-primary', 'w-100');
      expect(screen.getByLabelText(/e-mail/i)).toBeVisible();
      expect(screen.getByLabelText(/^senha$/i)).toBeVisible();
    },
  );

  it('alterna visibilidade da senha sem recarregar e mantém acessibilidade', async () => {
    const user = userEvent.setup();

    renderLoginOnly();

    const passwordInput = screen.getByLabelText(/^senha$/i) as HTMLInputElement;
    const toggle = screen.getByRole('button', { name: /mostrar senha/i });

    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await act(async () => {
      await user.click(toggle);
    });

    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /ocultar senha/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /ocultar senha/i }));
    });

    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('alterna visibilidade com Enter no botão focado', async () => {
    const user = userEvent.setup();

    renderLoginOnly();

    const passwordInput = screen.getByLabelText(/^senha$/i) as HTMLInputElement;
    const toggle = screen.getByRole('button', { name: /mostrar senha/i });

    toggle.focus();
    await act(async () => {
      await user.keyboard('{Enter}');
    });

    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('ativa alternância de visibilidade com Space no botão', async () => {
    const user = userEvent.setup();

    renderLoginOnly();

    const passwordInput = screen.getByLabelText(/^senha$/i) as HTMLInputElement;
    const toggle = screen.getByRole('button', { name: /mostrar senha/i });

    toggle.focus();
    await act(async () => {
      await user.keyboard(' ');
    });

    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('anuncia aria-busy no botão de submit durante o envio', async () => {
    const validCredentials = createValidCredentials();
    let resolveLogin!: (value: Response) => void;
    global.fetch = jest.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveLogin = resolve;
        }),
    );

    const user = userEvent.setup();
    renderLoginOnly();

    await user.type(screen.getByLabelText(/e-mail/i), validCredentials.email);
    await user.type(screen.getByLabelText(/^senha$/i), validCredentials.password);

    const submitButton = screen.getByRole('button', { name: /entrar/i });
    expect(submitButton).not.toHaveAttribute('aria-busy', 'true');

    await act(async () => {
      await user.click(submitButton);
    });

    expect(submitButton).toHaveAttribute('aria-busy', 'true');
    expect(submitButton).toBeDisabled();

    resolveLogin(jsonResponse({ message: 'Credenciais inválidas.' }, 401));

    await waitFor(() => {
      expect(submitButton).not.toHaveAttribute('aria-busy', 'true');
      expect(submitButton).not.toBeDisabled();
    });
  });
});
