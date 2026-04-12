import { render, screen } from '@testing-library/react';

import App from './App';

describe('App', () => {
  it('renderiza Hello World e identificação Kurtto Admin', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /hello world/i })).toBeInTheDocument();
    expect(screen.getByText(/kurtto admin/i)).toBeInTheDocument();
  });

  it('renderiza botão primário de demonstração', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: /ação primária/i })).toBeInTheDocument();
  });
});
