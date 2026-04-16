import styles from './GlobalToastRegion.module.css';

import type { ToastRecord, ToastVariant } from '../../../types/toast';

export interface GlobalToastRegionProps {
  readonly toasts: readonly ToastRecord[];
  readonly onDismiss: (id: string) => void;
}

function titleForVariant(variant: ToastVariant): string {
  const map: Record<ToastVariant, string> = {
    success: 'Sucesso',
    error: 'Erro',
    danger: 'Erro',
    warning: 'Atenção',
    info: 'Informação',
  };
  return map[variant];
}

function ariaLiveForVariant(variant: ToastVariant): 'polite' | 'assertive' {
  if (variant === 'success' || variant === 'info') {
    return 'polite';
  }
  return 'assertive';
}

function accentClassForVariant(variant: ToastVariant): string {
  const map: Record<ToastVariant, string> = {
    success: styles.accentSuccess,
    error: styles.accentError,
    danger: styles.accentError,
    warning: styles.accentWarning,
    info: styles.accentInfo,
  };
  return map[variant];
}

function iconClassForVariant(variant: ToastVariant): string {
  const map: Record<ToastVariant, string> = {
    success: styles.iconSuccess,
    error: styles.iconError,
    danger: styles.iconError,
    warning: styles.iconWarning,
    info: styles.iconInfo,
  };
  return map[variant];
}

function ToastVariantIcon({ variant }: Readonly<{ variant: ToastVariant }>): JSX.Element {
  const svgProps = {
    className: styles.variantIconSvg,
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true as const,
  };

  if (variant === 'success') {
    return (
      <svg {...svgProps}>
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
        />
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m9 12 2 2 4-4"
        />
      </svg>
    );
  }

  if (variant === 'warning') {
    return (
      <svg {...svgProps}>
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          d="M12 4 20 18H4L12 4Z"
        />
        <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M12 10v4" />
        <circle cx="12" cy="17" r="1" fill="currentColor" />
      </svg>
    );
  }

  if (variant === 'info') {
    return (
      <svg {...svgProps}>
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
        />
        <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M12 16v-5" />
        <circle cx="12" cy="8" r="1" fill="currentColor" />
      </svg>
    );
  }

  /* error | danger */
  return (
    <svg {...svgProps}>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
      />
      <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="m15 9-6 6" />
      <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="m9 9 6 6" />
    </svg>
  );
}

export function GlobalToastRegion({ toasts, onDismiss }: Readonly<GlobalToastRegionProps>): JSX.Element | null {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className={styles.region} aria-label="Notificações" data-testid="global-toast-region">
      {toasts.map((toast) => {
        const ariaLive = ariaLiveForVariant(toast.variant);
        return (
          <div
            key={toast.id}
            className={`toast show ${styles.toastItem} ${accentClassForVariant(toast.variant)}`}
            role="alert"
            aria-live={ariaLive}
            aria-atomic="true"
          >
            <div className={`toast-header ${styles.toastHeader}`}>
              <span className={`${styles.iconWrap} ${iconClassForVariant(toast.variant)}`}>
                <ToastVariantIcon variant={toast.variant} />
              </span>
              <strong className="me-auto">{titleForVariant(toast.variant)}</strong>
              <small className="text-body-secondary">Agora</small>
              <button
                type="button"
                className="btn-close"
                aria-label="Fechar notificação"
                onClick={() => {
                  onDismiss(toast.id);
                }}
              />
            </div>
            <div className="toast-body">{toast.message}</div>
          </div>
        );
      })}
    </div>
  );
}
