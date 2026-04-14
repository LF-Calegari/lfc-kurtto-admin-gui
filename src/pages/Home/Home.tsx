import { AppHeader } from '../../components/layout/AppHeader/AppHeader';
import { Sidebar } from '../../components/layout/Sidebar/Sidebar';

import styles from './Home.module.css';

function Home(): JSX.Element {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.mainColumn}>
        <AppHeader />
        <main className={styles.main}>
          <div className={`card border-0 shadow-sm ${styles.placeholderCard}`}>
            <div className="card-body p-5 text-center">
              <p className={`h5 fw-medium mb-2 ${styles.placeholderTitle}`}>Em construção</p>
              <p className="text-secondary mb-0">
                O conteúdo principal desta área será disponibilizado em breve.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Home;

