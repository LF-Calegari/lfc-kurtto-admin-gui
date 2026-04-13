import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Login from './Login';

describe('Login', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renderiza estrutura principal da tela', () => {
    render(<Login />);

    expect(screen.getByRole('heading', { name: /entrar no kurtto/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toHaveClass('btn', 'btn-primary');
  });

  it('valida envio com campos vazios', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(<Login />);

    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(screen.getByText(/informe o e-mail para entrar/i)).toBeInTheDocument();
    expect(screen.getByText(/informe a senha para entrar/i)).toBeInTheDocument();
  });

  it('valida formato de e-mail inválido', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(<Login />);

    await user.type(screen.getByLabelText(/e-mail/i), 'email-invalido');
    await user.type(screen.getByLabelText(/senha/i), 'kurtto123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(screen.getByText(/informe um e-mail válido/i)).toBeInTheDocument();
  });

  it('exibe estado de sucesso ao autenticar com credenciais válidas', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(<Login />);

    await user.type(screen.getByLabelText(/e-mail/i), 'admin@kurtto.io');
    await user.type(screen.getByLabelText(/senha/i), 'kurtto123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(screen.getByRole('button', { name: /entrando/i })).toBeDisabled();

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(await screen.findByText(/login realizado com sucesso/i)).toBeInTheDocument();
  });

  it('exibe mensagem clara em erro de autenticação', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(<Login />);

    await user.type(screen.getByLabelText(/e-mail/i), 'admin@kurtto.io');
    await user.type(screen.getByLabelText(/senha/i), 'senha-errada');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /e-mail ou senha inválidos\. verifique seus dados e tente novamente/i,
    );
  });
});
