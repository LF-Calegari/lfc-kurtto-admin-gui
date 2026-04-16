import styles from './GlobalToastRegion.module.css';

import type { ToastRecord, ToastVariant } from '../../../types/toast';

export interface GlobalToastRegionProps {
  readonly toasts: readonly ToastRecord[];
  readonly onDismiss: (id: string) => void;
}

function alertClassForVariant(variant: ToastVariant): string {
  const map: Record<ToastVariant, string> = {
    success: 'alert-success',
    error: 'alert-danger',
    danger: 'alert-danger',
    warning: 'alert-warning',
    info: 'alert-info',
  };
  return map[variant];
}

function roleForVariant(variant: ToastVariant): 'status' | 'alert' {
  return variant === 'success' ? 'status' : 'alert';
}

function ariaLiveForVariant(variant: ToastVariant): 'polite' | 'assertive' {
  if (variant === 'success' || variant === 'info') {
    return 'polite';
  }
  return 'assertive';
}

export function GlobalToastRegion({ toasts, onDismiss }: Readonly<GlobalToastRegionProps>): JSX.Element | null {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className={styles.region} aria-label="Notificações" data-testid="global-toast-region">
      {toasts.map((toast) => {
        const role = roleForVariant(toast.variant);
        const ariaLive = ariaLiveForVariant(toast.variant);
        return (
          <div
            key={toast.id}
            className={`alert ${alertClassForVariant(toast.variant)} alert-dismissible fade show ${styles.toast}`}
            role={role}
            aria-live={ariaLive}
            aria-atomic="true"
          >
            {toast.message}
            <button
              type="button"
              className="btn-close"
              aria-label="Fechar notificação"
              onClick={() => {
                onDismiss(toast.id);
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
