import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { AppHeader } from './AppHeader';

const mockLogout = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../../contexts/AuthContext'),
  useAuth: (): {
    user: { id: string; name: string; email: string };
    isBootstrapping: boolean;
    login: jest.Mock;
    logout: jest.Mock;
  } => ({
    user: {
      id: '55555555-5555-5555-5555-555555555555',
      name: 'Header User',
      email: 'header.user@mail.test',
    },
    isBootstrapping: false,
    login: jest.fn(),
    logout: mockLogout,
  }),
}));

function renderHeader(pathname = '/home'): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <AppHeader />
    </MemoryRouter>,
  );
}

describe('AppHeader', () => {
  beforeEach(() => {
    mockLogout.mockClear();
  });

  it('exibe nome e e-mail do usuário e permite sair', async () => {
    const user = userEvent.setup();

    renderHeader();

    expect(screen.getByText('Header User')).toBeInTheDocument();
    expect(screen.getAllByText(/header\.user@mail\.test/i).length).toBeGreaterThanOrEqual(1);

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /header user/i }));
      await user.click(screen.getByRole('button', { name: /^sair$/i }));
    });

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  it('exibe título "Início" na rota /home', () => {
    renderHeader('/home');
    expect(screen.getByText('Início')).toBeInTheDocument();
  });

  it('exibe título "Links" na rota /links', () => {
    renderHeader('/links');
    expect(screen.getByText('Links')).toBeInTheDocument();
  });
});
