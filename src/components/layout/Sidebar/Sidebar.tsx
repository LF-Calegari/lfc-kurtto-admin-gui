import { NavLink } from 'react-router-dom';

import { ROUTES } from '../../../constants/routes';

import styles from './Sidebar.module.css';

export function Sidebar(): JSX.Element {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brandBlock}>
        <span className={styles.brandEyebrow}>Kurtto Admin</span>
        <p className={styles.brandTitle}>Painel</p>
      </div>
      <nav className={styles.nav} aria-label="Navegação principal">
        <NavLink
          to={ROUTES.HOME}
          end
          className={({ isActive }) =>
            `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`.trim()
          }
        >
          Início
        </NavLink>
      </nav>
    </aside>
  );
}
