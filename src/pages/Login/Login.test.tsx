import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';

import Login from './Login';

describe('Login', () => {
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

  it('renderiza estrutura principal da tela', () => {
    render(<Login />);

    expect(screen.getByRole('heading', { name: /entrar no kurtto/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toHaveClass('btn', 'btn-primary');
  });

  it('valida envio com campos vazios', async () => {
    const user = userEvent.setup();

    render(<Login />);

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /entrar/i }));
    });

    expect(screen.getByText(/informe o e-mail para entrar/i)).toBeInTheDocument();
    expect(screen.getByText(/informe a senha para entrar/i)).toBeInTheDocument();
  });

  it('valida formato de e-mail inválido', async () => {
    const user = userEvent.setup();

    render(<Login />);

    await act(async () => {
      await user.type(screen.getByLabelText(/e-mail/i), 'email-invalido');
      await user.type(screen.getByLabelText(/senha/i), 'senha-curta');
      await user.click(screen.getByRole('button', { name: /entrar/i }));
    });

    expect(screen.getByText(/informe um e-mail válido/i)).toBeInTheDocument();
  });

  it('exibe estado de sucesso ao autenticar com credenciais válidas', async () => {
    const user = userEvent.setup();
    const validCredentials = createValidCredentials();

    render(<Login />);

    await act(async () => {
      await user.type(screen.getByLabelText(/e-mail/i), validCredentials.email);
      await user.type(screen.getByLabelText(/senha/i), validCredentials.password);
      await user.click(screen.getByRole('button', { name: /entrar/i }));
    });

    expect(screen.getByRole('button', { name: /entrando/i })).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByText(/login realizado com sucesso/i)).toBeInTheDocument();
    });
  });

  it('exibe mensagem clara em erro de autenticação', async () => {
    const user = userEvent.setup();
    const validCredentials = createValidCredentials();

    render(<Login />);

    await act(async () => {
      await user.type(screen.getByLabelText(/e-mail/i), validCredentials.email);
      await user.type(screen.getByLabelText(/senha/i), '123');
      await user.click(screen.getByRole('button', { name: /entrar/i }));
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /e-mail ou senha inválidos\. verifique seus dados e tente novamente/i,
      );
    });
  });

  it.each([1024, 1920])(
    'mantem layout estrutural consistente para viewport desktop %ipx',
    (width) => {
      setViewport(width);
      const { container } = render(<Login />);

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
      expect(screen.getByLabelText(/senha/i)).toBeVisible();
    },
  );
});
