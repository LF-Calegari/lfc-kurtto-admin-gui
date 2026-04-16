import { render, screen } from '@testing-library/react';

import { GlobalToastRegion } from './GlobalToastRegion';

import type { ToastRecord } from '../../../types/toast';

function record(overrides: Partial<ToastRecord> & Pick<ToastRecord, 'variant' | 'message'>): ToastRecord {
  return {
    id: 't-1',
    durationMs: 5000,
    ...overrides,
  };
}

describe('GlobalToastRegion', () => {
  it('renderiza toast-header com título em PT-BR e mensagem no toast-body', () => {
    const onDismiss = jest.fn();
    render(
      <GlobalToastRegion
        toasts={[record({ id: 'a', variant: 'success', message: 'Operação concluída.' })]}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByText('Sucesso')).toBeInTheDocument();
    expect(screen.getByText('Operação concluída.')).toBeInTheDocument();
    expect(screen.getByText('Operação concluída.').closest('.toast-body')).toBeInTheDocument();
    expect(screen.getByText('Agora')).toBeInTheDocument();
  });

  it.each([
    ['error' as const, 'Erro'],
    ['danger' as const, 'Erro'],
    ['warning' as const, 'Atenção'],
    ['info' as const, 'Informação'],
  ])('mapeia variante %s para o título "%s"', (variant, title) => {
    render(
      <GlobalToastRegion
        toasts={[record({ id: 'x', variant, message: 'Corpo.' })]}
        onDismiss={jest.fn()}
      />,
    );
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText('Corpo.')).toBeInTheDocument();
  });

  it('não usa classes de alerta semântico no bloco inteiro', () => {
    const { container } = render(
      <GlobalToastRegion
        toasts={[record({ variant: 'success', message: 'Ok.' })]}
        onDismiss={jest.fn()}
      />,
    );
    expect(container.querySelector('.alert-success')).toBeNull();
    expect(container.querySelector('.alert-danger')).toBeNull();
    expect(container.querySelector('.alert-warning')).toBeNull();
    expect(container.querySelector('.bg-success')).toBeNull();
    expect(container.querySelector('.bg-danger')).toBeNull();
    expect(container.querySelector('.bg-warning')).toBeNull();
  });

  it('define role alert e aria-atomic no toast', () => {
    render(
      <GlobalToastRegion
        toasts={[record({ variant: 'success', message: 'Mensagem.' })]}
        onDismiss={jest.fn()}
      />,
    );
    const toast = screen.getByRole('alert');
    expect(toast).toHaveAttribute('aria-atomic', 'true');
    expect(toast).toHaveAttribute('aria-live', 'polite');
  });

  it('usa aria-live assertivo para erro', () => {
    render(
      <GlobalToastRegion
        toasts={[record({ variant: 'error', message: 'Falhou.' })]}
        onDismiss={jest.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  });
});
