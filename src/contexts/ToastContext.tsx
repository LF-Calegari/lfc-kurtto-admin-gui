/**
 * Sistema global de toasts (Bootstrap `toast` com `toast-header` + `toast-body`), com auto-fechamento configurável.
 *
 * **Inventário / depreciação:** mensagens de sucesso e erro que antes ficavam inline no
 * conteúdo principal (por exemplo em `Links.tsx` com `alert` no `<main>`) foram migradas
 * para este mecanismo. Novas telas devem usar `useToast().showToast(...)` em vez de
 * duplicar blocos `alert` locais.
 *
 * **Uso mínimo:**
 * ```tsx
 * const { showToast } = useToast();
 * showToast({ variant: 'success', message: 'Salvo.', durationMs: 5000 });
 * showToast({ variant: 'error', message: 'Falhou.' }); // duração padrão 5s
 * ```
 *
 * O `ToastProvider` envolve a árvore em `App.tsx`; o viewport fica fixo abaixo do header
 * (desktop: canto direito; mobile: centralizado).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { GlobalToastRegion } from '../components/ui/GlobalToastRegion/GlobalToastRegion';
import { DEFAULT_TOAST_DURATION_MS } from '../constants/toast';

import type { ShowToastOptions, ToastRecord } from '../types/toast';

interface ToastContextValue {
  showToast: (options: ShowToastOptions) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let toastIdFallbackSeq = 0;

function createToastIdFromRandomBytes(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function createToastId(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj !== undefined && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  if (cryptoObj !== undefined && typeof cryptoObj.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    cryptoObj.getRandomValues(bytes);
    return `toast-${createToastIdFromRandomBytes(bytes)}`;
  }
  toastIdFallbackSeq += 1;
  return `toast-${Date.now()}-${toastIdFallbackSeq}`;
}

interface ToastProviderProps {
  readonly children: ReactNode;
}

export function ToastProvider({ children }: Readonly<ToastProviderProps>): JSX.Element {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearTimer = useCallback((id: string) => {
    const handle = timersRef.current.get(id);
    if (handle !== undefined) {
      clearTimeout(handle);
      timersRef.current.delete(id);
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    clearTimer(id);
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, [clearTimer]);

  const showToast = useCallback(
    (options: ShowToastOptions): string => {
      const id = createToastId();
      const durationMs = options.durationMs ?? DEFAULT_TOAST_DURATION_MS;
      const record: ToastRecord = {
        id,
        message: options.message,
        variant: options.variant,
        durationMs,
      };
      setToasts((previous) => [record, ...previous]);

      if (durationMs > 0) {
        const handle = globalThis.setTimeout(() => {
          dismissToast(id);
        }, durationMs);
        timersRef.current.set(id, handle);
      }

      return id;
    },
    [dismissToast],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((handle) => {
        clearTimeout(handle);
      });
      timers.clear();
    };
  }, []);

  const value = useMemo(
    () => ({
      showToast,
      dismissToast,
    }),
    [dismissToast, showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <GlobalToastRegion toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast deve ser usado dentro de ToastProvider.');
  }
  return context;
}
