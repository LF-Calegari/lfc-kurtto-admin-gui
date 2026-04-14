import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Home from './Home';

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
      name: 'Usuário Home',
      email: 'home.user@mail.test',
    },
    isBootstrapping: false,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

describe('Home', () => {
  it('renderiza sidebar, topo com usuário e placeholder principal', () => {
    render(
      <MemoryRouter
        initialEntries={['/home']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Home />
      </MemoryRouter>,
    );

    expect(screen.getByRole('navigation', { name: /navegação principal/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /início/i })).toBeInTheDocument();
    expect(screen.getByText(/usuário home/i)).toBeInTheDocument();
    expect(screen.getAllByText(/home\.user@mail\.test/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/^em construção$/i)).toBeInTheDocument();
  });
});
