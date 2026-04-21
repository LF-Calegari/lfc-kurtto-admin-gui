import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { AppHeader } from '../../components/layout/AppHeader/AppHeader';
import { Sidebar } from '../../components/layout/Sidebar/Sidebar';
import { ROUTES } from '../../constants/routes';
import { useAuth } from '../../contexts/AuthContext';
import { listLinks } from '../../services/linkService';

import styles from './Home.module.css';

interface DashboardStats {
  totalLinks: number;
  activeLinks: number;
  totalClicks: number;
}

type StatsState = 'loading' | 'ready' | 'error';

function StatCard({
  label,
  value,
  description,
  isLoading,
  isError,
}: Readonly<{
  label: string;
  value: string | number;
  description: string;
  isLoading: boolean;
  isError: boolean;
}>): JSX.Element {
  return (
    <div className={`card shadow-sm ${styles.statCard}`}>
      <div className={`card-body ${styles.statCardBody}`}>
        <p className={styles.statLabel}>{label}</p>
        {isLoading && (
          <div className={styles.statSkeleton} aria-hidden="true" />
        )}
        {isError && !isLoading && (
          <p className={`${styles.statValue} ${styles.statValueError}`}>—</p>
        )}
        {!isLoading && !isError && (
          <p className={styles.statValue}>{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}</p>
        )}
        <p className={styles.statDescription}>{description}</p>
      </div>
    </div>
  );
}

function Home(): JSX.Element {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({ totalLinks: 0, activeLinks: 0, totalClicks: 0 });
  const [statsState, setStatsState] = useState<StatsState>('loading');

  const loadStats = useCallback(async (): Promise<void> => {
    setStatsState('loading');
    try {
      const [allResult, activeResult] = await Promise.all([
        listLinks({ page: 1, limit: 1 }),
        listLinks({ page: 1, limit: 1, active: true }),
      ]);

      const totalLinks = allResult.meta.total;
      const activeLinks = activeResult.meta.total;

      let totalClicks = 0;
      if (totalLinks > 0) {
        const fullResult = await listLinks({ page: 1, limit: 100 });
        totalClicks = fullResult.data.reduce((sum, link) => sum + link.clicks, 0);
      }

      setStats({ totalLinks, activeLinks, totalClicks });
      setStatsState('ready');
    } catch {
      setStatsState('error');
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const isLoading = statsState === 'loading';
  const isError = statsState === 'error';

  const firstName = user?.name?.split(' ')[0] ?? 'usuário';

  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.mainColumn}>
        <AppHeader />
        <main className={styles.main}>
          <div className={styles.pageHeader}>
            <h1 className={`h3 fw-medium mb-1 ${styles.welcomeTitle}`}>
              Olá, {firstName}
            </h1>
            <p className={`mb-0 ${styles.welcomeSubtitle}`}>
              Aqui está um resumo dos seus links encurtados.
            </p>
          </div>

          {isError && (
            <div className={`alert ${styles.statsErrorAlert} mb-4`} role="alert">
              <span className={styles.statsErrorText}>
                Não foi possível carregar as métricas.{' '}
              </span>
              <button
                type="button"
                className="btn btn-link btn-sm p-0 align-baseline"
                style={{ color: 'var(--color-error)' }}
                onClick={() => { void loadStats(); }}
              >
                Tentar novamente
              </button>
            </div>
          )}

          <div className={`row g-4 mb-5 ${styles.statsRow}`}>
            <div className="col-12 col-sm-6 col-xl-4">
              <StatCard
                label="Total de links"
                value={stats.totalLinks}
                description="Links encurtados cadastrados"
                isLoading={isLoading}
                isError={isError}
              />
            </div>
            <div className="col-12 col-sm-6 col-xl-4">
              <StatCard
                label="Links ativos"
                value={stats.activeLinks}
                description="Links disponíveis para redirecionamento"
                isLoading={isLoading}
                isError={isError}
              />
            </div>
            <div className="col-12 col-sm-6 col-xl-4">
              <StatCard
                label="Total de cliques"
                value={stats.totalClicks}
                description="Acessos registrados nos links"
                isLoading={isLoading}
                isError={isError}
              />
            </div>
          </div>

          <div className={`card shadow-sm ${styles.quickActionsCard}`}>
            <div className={`card-header py-3 px-4 ${styles.cardHeader}`}>
              <h2 className="h6 fw-medium mb-0">Acesso rápido</h2>
            </div>
            <div className={`card-body ${styles.quickActionsBody}`}>
              <Link
                to={ROUTES.LINKS}
                className={styles.quickActionItem}
              >
                <span className={styles.quickActionIcon}>
                  <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} fill="currentColor" viewBox="0 0 16 16" aria-hidden>
                    <path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1 1 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l1.373-1.373a2 2 0 0 1 .144-.274l-.852-.854z" />
                    <path d="M11.285 9.458 12.657 8.086a3 3 0 1 0-4.243-4.243L6.586 5.672a3 3 0 0 0 .415 4.314l.586-.586a1 1 0 0 0 .154-.199 2 2 0 0 1-.861-3.337L8.752 4.02a2 2 0 0 1 2.83 2.83L10.21 8.22a2 2 0 0 1-.144.274l.852.854z" />
                  </svg>
                </span>
                <span className={styles.quickActionContent}>
                  <span className={styles.quickActionTitle}>Gerenciar links</span>
                  <span className={styles.quickActionDesc}>Listar, filtrar, cadastrar e excluir links</span>
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} fill="currentColor" viewBox="0 0 16 16" className={styles.quickActionArrow} aria-hidden>
                  <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z" />
                </svg>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Home;
