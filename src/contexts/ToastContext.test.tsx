import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DEFAULT_TOAST_DURATION_MS } from '../constants/toast';

import { ToastProvider, useToast } from './ToastContext';

function ToastTrigger(): JSX.Element {
  const { showToast } = useToast();
  return (
    <button
      type="button"
      onClick={() => {
        showToast({ variant: 'success', message: 'Mensagem de teste.' });
      }}
    >
      Mostrar toast
    </button>
  );
}

function ToastCustomDuration(): JSX.Element {
  const { showToast } = useToast();
  return (
    <button
      type="button"
      onClick={() => {
        showToast({ variant: 'info', message: 'Curta.', durationMs: 2000 });
      }}
    >
      Toast 2s
    </button>
  );
}

describe('ToastContext', () => {
  it('lança quando useToast é usado fora do ToastProvider', () => {
    expect(() => renderHook(() => useToast())).toThrow(/ToastProvider/);
  });

  it('exibe toast na região global e remove ao fechar', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );

    expect(screen.queryByTestId('global-toast-region')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /mostrar toast/i }));

    const region = await screen.findByTestId('global-toast-region');
    expect(region).toBeInTheDocument();
    expect(screen.getByText('Mensagem de teste.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /fechar notificação/i }));

    expect(screen.queryByText('Mensagem de teste.')).not.toBeInTheDocument();
  });

  it('remove toast automaticamente após duração padrão', () => {
    jest.useFakeTimers();

    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /mostrar toast/i }));

    expect(screen.getByText('Mensagem de teste.')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(DEFAULT_TOAST_DURATION_MS);
    });

    expect(screen.queryByText('Mensagem de teste.')).not.toBeInTheDocument();

    jest.useRealTimers();
  });

  it('respeita durationMs customizado', () => {
    jest.useFakeTimers();

    render(
      <ToastProvider>
        <ToastCustomDuration />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /toast 2s/i }));

    expect(screen.getByText('Curta.')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1999);
    });
    expect(screen.getByText('Curta.')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.queryByText('Curta.')).not.toBeInTheDocument();

    jest.useRealTimers();
  });

  it('empilha múltiplos toasts sem quebrar', async () => {
    const user = userEvent.setup();

    function DoubleTrigger(): JSX.Element {
      const { showToast } = useToast();
      return (
        <button
          type="button"
          onClick={() => {
            showToast({ variant: 'warning', message: 'Primeiro.' });
            showToast({ variant: 'error', message: 'Segundo.' });
          }}
        >
          Dois toasts
        </button>
      );
    }

    render(
      <ToastProvider>
        <DoubleTrigger />
      </ToastProvider>,
    );

    await user.click(screen.getByRole('button', { name: /dois toasts/i }));

    expect(await screen.findByText('Primeiro.')).toBeInTheDocument();
    expect(screen.getByText('Segundo.')).toBeInTheDocument();
  });
});
