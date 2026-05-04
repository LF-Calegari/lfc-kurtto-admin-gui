import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ROUTES } from '../../constants/routes';
import { useAuth } from '../../contexts/AuthContext';

import styles from './Forbidden.module.css';

interface ForbiddenLocationState {
  readonly from?: string;
}

function ShieldIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={32}
      height={32}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2.75 4.5 5.5v6.25c0 4.05 3.05 7.85 7.5 9.5 4.45-1.65 7.5-5.45 7.5-9.5V5.5L12 2.75Z" />
      <path d="M12 8.5v3.5" />
      <circle cx="12" cy="15.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

function Forbidden(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();

  const state = location.state as ForbiddenLocationState | null;
  const fromPathname = typeof state?.from === 'string' && state.from.length > 0 ? state.from : null;

  const handleBack = useCallback((): void => {
    if (user) {
      navigate(ROUTES.HOME, { replace: true });
      return;
    }
    navigate(ROUTES.LOGIN, { replace: true });
  }, [navigate, user]);

  const handleLogout = useCallback(async (): Promise<void> => {
    await logout();
  }, [logout]);

  return (
    <div className={styles.shell}>
      <main className={styles.card} aria-labelledby="forbidden-title">
        <div className={styles.iconWrapper} aria-hidden="true">
          <ShieldIcon />
        </div>
        <h1 id="forbidden-title" className={`h4 fw-medium ${styles.title}`}>
          Acesso negado
        </h1>
        <p className={styles.subtitle}>
          {fromPathname ? (
            <>
              Você não tem permissão para acessar <code>{fromPathname}</code>. Confira com seu
              administrador se você precisa desse acesso.
            </>
          ) : (
            <>Você não tem permissão para acessar esta página. Confira com seu administrador se você precisa desse acesso.</>
          )}
        </p>
        <div className={styles.actions}>
          <button type="button" className="btn btn-outline-secondary" onClick={handleBack}>
            {user ? 'Voltar para o início' : 'Ir para login'}
          </button>
          {user && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                void handleLogout();
              }}
            >
              Sair
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

export default Forbidden;
