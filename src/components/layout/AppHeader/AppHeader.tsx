import { useState } from 'react';
import { useLocation } from 'react-router-dom';

import { ROUTES } from '../../../constants/routes';
import { useAuth } from '../../../contexts/AuthContext';

import styles from './AppHeader.module.css';

function resolvePageTitle(pathname: string): string {
  if (pathname === ROUTES.HOME || pathname === '/') {
    return 'Início';
  }
  if (pathname.startsWith(ROUTES.LINKS)) {
    return 'Links';
  }
  return '';
}

export function AppHeader(): JSX.Element {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [isBusy, setIsBusy] = useState(false);

  const pageTitle = resolvePageTitle(pathname);

  const handleLogout = async (): Promise<void> => {
    setIsBusy(true);
    try {
      await logout();
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <header className={`border-bottom bg-white ${styles.header}`}>
      <div className="d-flex align-items-center justify-content-between w-100 gap-3">
        {pageTitle ? (
          <span className={styles.pageTitle}>{pageTitle}</span>
        ) : (
          <span />
        )}
        <div className="dropdown">
          <button
            type="button"
            className={`btn btn-link text-decoration-none text-dark dropdown-toggle d-flex align-items-center gap-2 ${styles.userTrigger}`}
            data-bs-toggle="dropdown"
            aria-expanded="false"
            aria-haspopup="true"
          >
            <span className={`rounded-circle d-inline-flex align-items-center justify-content-center ${styles.avatar}`}>
              {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
            </span>
            <span className="d-none d-sm-inline text-start">
              <span className={`d-block fw-medium text-truncate ${styles.textClamp}`}>{user?.name}</span>
              <span className={`d-block small text-secondary text-truncate ${styles.textClamp}`}>
                {user?.email}
              </span>
            </span>
          </button>
          <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0 py-2">
            <li className="px-3 pb-2 d-sm-none">
              <span className="small text-secondary d-block text-truncate">{user?.email}</span>
            </li>
            <li>
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  void handleLogout();
                }}
                disabled={isBusy}
              >
                {isBusy && (
                  <output
                    className="spinner-border spinner-border-sm me-2 d-inline-block"
                    aria-live="polite"
                    aria-label="Encerrando sessão"
                  >
                    <span className="visually-hidden">Encerrando sessão</span>
                  </output>
                )}
                Sair
              </button>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}
