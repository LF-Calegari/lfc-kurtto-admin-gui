import { render, screen } from '@testing-library/react';

import { SessionBootstrapSpinner } from './SessionBootstrapSpinner';

describe('SessionBootstrapSpinner', () => {
  it('renderiza indicador de carregamento com semântica de status acessível', () => {
    render(<SessionBootstrapSpinner />);

    expect(screen.getByLabelText(/carregando sessão/i)).toBeInTheDocument();
    expect(screen.getByText(/verificando autenticação/i)).toBeInTheDocument();
    expect(screen.getByText(/carregando sessão/i)).toHaveClass('visually-hidden');
  });

  it('usa output com aria-live para anunciar estado de carregamento', () => {
    const { container } = render(<SessionBootstrapSpinner />);

    const output = container.querySelector('output[aria-live="polite"]');
    expect(output).not.toBeNull();
    expect(output).toHaveClass('spinner-border', 'text-primary');
  });
});
