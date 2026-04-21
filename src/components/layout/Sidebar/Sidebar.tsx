import { NavLink } from 'react-router-dom';

import { KurttoLogoIcon } from '../../../assets/icons/KurttoLogoIcon';
import { ROUTES } from '../../../constants/routes';

import styles from './Sidebar.module.css';

export function Sidebar(): JSX.Element {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brandBlock}>
        <div className={styles.brandLogo}>
          <KurttoLogoIcon width={44} height={30} />
          <div className={styles.brandText}>
            <span className={styles.brandName}>kurtto</span>
            <span className={styles.brandEyebrow}>Admin</span>
          </div>
        </div>
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
        <NavLink
          to={ROUTES.LINKS}
          className={({ isActive }) =>
            `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`.trim()
          }
        >
          Links
        </NavLink>
      </nav>
    </aside>
  );
}
