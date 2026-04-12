import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import App from './App';

describe('App', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('renderiza Hello World e identificação Kurtto Admin', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /hello world/i })).toBeInTheDocument();
    expect(screen.getByText(/kurtto admin/i)).toBeInTheDocument();
    expect(
      screen.getByText(/projeto inicial carregado com react, typescript e bootstrap/i),
    ).toBeInTheDocument();
  });

  it('renderiza botão primário de demonstração com estilo bootstrap', () => {
    render(<App />);

    const button = screen.getByRole('button', { name: /ação primária/i });

    expect(button).toBeInTheDocument();
    expect(button).toBeEnabled();
    expect(button).toHaveClass('btn', 'btn-primary');
  });

  it('mantém a tela estável ao interagir com o botão principal', async () => {
    const user = userEvent.setup();

    render(<App />);

    const button = screen.getByRole('button', { name: /ação primária/i });
    await user.click(button);

    expect(screen.getByRole('heading', { name: /hello world/i })).toBeInTheDocument();
  });

  it('renderiza fallback da tela inicial para rota não mapeada', () => {
    window.history.pushState({}, '', '/rota-inexistente');
    render(<App />);

    expect(screen.getByRole('heading', { name: /hello world/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ação primária/i })).toBeInTheDocument();
  });
});
