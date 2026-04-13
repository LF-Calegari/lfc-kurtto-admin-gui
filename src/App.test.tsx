import { render, screen } from '@testing-library/react';

import App from './App';

describe('App', () => {
  it('redireciona rota raiz para a tela de login', () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    expect(screen.getByRole('heading', { name: /entrar no kurtto/i })).toBeInTheDocument();
    expect(screen.getByText(/kurtto admin/i)).toBeInTheDocument();
  });

  it('renderiza formulário de login na rota dedicada', () => {
    window.history.pushState({}, '', '/login');
    render(<App />);

    const button = screen.getByRole('button', { name: /entrar/i });

    expect(button).toBeInTheDocument();
    expect(button).toBeEnabled();
    expect(button).toHaveClass('btn', 'btn-primary');
  });

  it('redireciona rota não mapeada para login', () => {
    window.history.pushState({}, '', '/rota-inexistente');
    render(<App />);

    expect(screen.getByRole('heading', { name: /entrar no kurtto/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });
});
