export function SessionBootstrapSpinner(): JSX.Element {
  return (
    <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center gap-3 bg-body-secondary bg-opacity-25">
      <output
        className="spinner-border text-primary"
        aria-live="polite"
        aria-label="Carregando sessão"
      >
        <span className="visually-hidden">Carregando sessão</span>
      </output>
      <p className="text-secondary mb-0 small">Verificando autenticação…</p>
    </div>
  );
}
