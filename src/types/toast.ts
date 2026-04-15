export type ToastVariant = 'success' | 'error' | 'warning' | 'danger' | 'info';

export interface ShowToastOptions {
  readonly message: string;
  readonly variant: ToastVariant;
  /**
   * Tempo até remover o toast. Padrão: 5000 ms (`DEFAULT_TOAST_DURATION_MS`).
   * Use `0` para desativar o auto-fechamento (usuário fecha manualmente).
   */
  readonly durationMs?: number;
}

export interface ToastRecord {
  readonly id: string;
  readonly message: string;
  readonly variant: ToastVariant;
  readonly durationMs: number;
}
