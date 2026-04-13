import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';

import Login from './Login';

describe('Login', () => {
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
      await user.type(screen.getByLabelText(/senha/i), 'kurtto123');
      await user.click(screen.getByRole('button', { name: /entrar/i }));
    });

    expect(screen.getByText(/informe um e-mail válido/i)).toBeInTheDocument();
  });

  it('exibe estado de sucesso ao autenticar com credenciais válidas', async () => {
    const user = userEvent.setup();

    render(<Login />);

    await act(async () => {
      await user.type(screen.getByLabelText(/e-mail/i), 'admin@kurtto.dev');
      await user.type(screen.getByLabelText(/senha/i), 'abc12345');
      await user.click(screen.getByRole('button', { name: /entrar/i }));
    });

    expect(screen.getByRole('button', { name: /entrando/i })).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByText(/login realizado com sucesso/i)).toBeInTheDocument();
    });
  });

  it('exibe mensagem clara em erro de autenticação', async () => {
    const user = userEvent.setup();

    render(<Login />);

    await act(async () => {
      await user.type(screen.getByLabelText(/e-mail/i), 'admin@kurtto.dev');
      await user.type(screen.getByLabelText(/senha/i), '123');
      await user.click(screen.getByRole('button', { name: /entrar/i }));
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /e-mail ou senha inválidos\. verifique seus dados e tente novamente/i,
      );
    });
  });

  it('mantem layout estrutural consistente nos breakpoints 1024 e 1920', () => {
    setViewport(1024);
    const { container, rerender } = render(<Login />);

    const sections1024 = container.querySelectorAll('section');
    const [brandSection1024, formSection1024] = Array.from(sections1024);
    const button1024 = screen.getByRole('button', { name: /entrar/i });

    expect(sections1024).toHaveLength(2);
    expect(window.innerWidth).toBe(1024);
    expect(brandSection1024).toHaveClass('col-12', 'col-lg-6', 'd-flex', 'align-items-center');
    expect(formSection1024).toHaveClass(
      'col-12',
      'col-lg-6',
      'd-flex',
      'align-items-center',
      'justify-content-center',
    );
    expect(button1024).toHaveClass('w-100');
    expect(screen.getByLabelText(/e-mail/i)).toBeVisible();
    expect(screen.getByLabelText(/senha/i)).toBeVisible();

    setViewport(1920);
    rerender(<Login />);

    const sections1920 = container.querySelectorAll('section');
    const [brandSection1920, formSection1920] = Array.from(sections1920);

    expect(sections1920).toHaveLength(2);
    expect(window.innerWidth).toBe(1920);
    expect(brandSection1920).toHaveClass('col-12', 'col-lg-6');
    expect(formSection1920).toHaveClass('col-12', 'col-lg-6');
    expect(screen.getByRole('heading', { name: /gerencie seus links com rapidez/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toHaveClass('w-100');
  });
});
