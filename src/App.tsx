import { BrowserRouter, Route, Routes } from 'react-router-dom';

import styles from './App.module.css';

function HelloWorld(): JSX.Element {
  return (
    <div className={`container py-5 ${styles.page}`}>
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4 p-md-5 text-center">
              <p className={`text-uppercase fw-medium small mb-2 ${styles.eyebrow}`}>Kurtto Admin</p>
              <h1 className="h3 fw-semibold mb-3">Hello World</h1>
              <p className={`text-secondary mb-4 ${styles.lead}`}>
                Projeto inicial carregado com React, TypeScript e Bootstrap. Ambiente pronto para evoluir o painel.
              </p>
              <button type="button" className="btn btn-primary px-4">
                Ação primária (demo)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App(): JSX.Element {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<HelloWorld />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
