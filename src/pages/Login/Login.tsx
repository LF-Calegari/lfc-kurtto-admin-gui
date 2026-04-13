import { FormEvent, useState } from 'react';

import styles from './Login.module.css';

interface LoginFormState {
  email: string;
  password: string;
}

interface LoginValidationErrors {
  email?: string;
  password?: string;
}

const AUTH_DELAY_MS = 500;
const MOCK_EMAIL = process.env.REACT_APP_LOGIN_MOCK_EMAIL?.trim().toLowerCase();
const MOCK_PASSWORD_HASH = process.env.REACT_APP_LOGIN_MOCK_PASSWORD_HASH?.trim().toLowerCase();

function hashPassword(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; ) {
    const codePoint = value.codePointAt(index);
    if (codePoint === undefined) {
      break;
    }
    hash = Math.trunc((hash << 5) - hash + codePoint);
    index += codePoint > 0xffff ? 2 : 1;
  }

  return Math.abs(hash).toString(16);
}

function isEmailFormatValid(email: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail.length === 0 || normalizedEmail.includes(' ')) {
    return false;
  }

  const atIndex = normalizedEmail.indexOf('@');
  if (atIndex <= 0 || atIndex !== normalizedEmail.lastIndexOf('@')) {
    return false;
  }

  const domain = normalizedEmail.slice(atIndex + 1);
  if (domain.length < 3 || domain.startsWith('.') || domain.endsWith('.')) {
    return false;
  }

  return domain.includes('.');
}

function isMockLoginValid(formData: LoginFormState): boolean {
  if (MOCK_EMAIL && MOCK_PASSWORD_HASH) {
    return (
      formData.email.trim().toLowerCase() === MOCK_EMAIL &&
      hashPassword(formData.password) === MOCK_PASSWORD_HASH
    );
  }

  return isEmailFormatValid(formData.email) && formData.password.trim().length >= 8;
}

async function authenticateMock(formData: LoginFormState): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, AUTH_DELAY_MS);
  });

  if (!isMockLoginValid(formData)) {
    throw new Error('E-mail ou senha inválidos. Verifique seus dados e tente novamente.');
  }
}

function validateForm(formData: LoginFormState): LoginValidationErrors {
  const errors: LoginValidationErrors = {};

  if (!formData.email) {
    errors.email = 'Informe o e-mail para entrar.';
  } else if (!isEmailFormatValid(formData.email)) {
    errors.email = 'Informe um e-mail válido.';
  }

  if (!formData.password) {
    errors.password = 'Informe a senha para entrar.';
  }

  return errors;
}

function Login(): JSX.Element {
  const [formData, setFormData] = useState<LoginFormState>({
    email: '',
    password: '',
  });
  const [validationErrors, setValidationErrors] = useState<LoginValidationErrors>({});
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const errors = validateForm(formData);
    setValidationErrors(errors);
    setAuthError('');
    setIsAuthenticated(false);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await authenticateMock(formData);
      setIsAuthenticated(true);
    } catch (error) {
      if (error instanceof Error) {
        setAuthError(error.message);
      } else {
        setAuthError('Não foi possível autenticar no momento. Tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`container-fluid p-0 ${styles.wrapper}`}>
      <div className="row g-0 min-vh-100">
        <section className={`col-12 col-lg-6 d-flex align-items-center ${styles.brandSection}`}>
          <div className={`w-100 ${styles.brandContent}`}>
            <p className={`mb-3 fw-medium ${styles.brandEyebrow}`}>Kurtto Admin</p>
            <h1 className="h2 fw-medium mb-3">Gerencie seus links com rapidez</h1>
            <p className="mb-0 text-secondary">
              Centralize operações, acompanhe métricas e mantenha o controle da plataforma em um
              único painel.
            </p>
          </div>
        </section>

        <section className="col-12 col-lg-6 d-flex align-items-center justify-content-center px-3 py-5 px-md-5">
          <div className={`card border-0 shadow-sm w-100 ${styles.loginCard}`}>
            <div className="card-body p-4 p-md-5">
              <h2 className="h4 fw-medium mb-2">Entrar no Kurtto</h2>
              <p className="text-secondary mb-4">Use seu e-mail e senha para acessar o painel.</p>

              {authError && (
                <div className="alert alert-danger" role="alert">
                  {authError}
                </div>
              )}

              {isAuthenticated && (
                <output className="alert alert-success d-block" aria-live="polite">
                  Login realizado com sucesso.
                </output>
              )}

              <form noValidate onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label fw-medium">
                    E-mail
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    className={`form-control ${validationErrors.email ? 'is-invalid' : ''}`}
                    value={formData.email}
                    onChange={(event) => {
                      setFormData((previous) => ({
                        ...previous,
                        email: event.target.value,
                      }));
                    }}
                    aria-invalid={Boolean(validationErrors.email)}
                    aria-describedby={validationErrors.email ? 'email-error' : undefined}
                  />
                  {validationErrors.email && (
                    <div id="email-error" className="invalid-feedback">
                      {validationErrors.email}
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label htmlFor="password" className="form-label fw-medium">
                    Senha
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    className={`form-control ${validationErrors.password ? 'is-invalid' : ''}`}
                    value={formData.password}
                    onChange={(event) => {
                      setFormData((previous) => ({
                        ...previous,
                        password: event.target.value,
                      }));
                    }}
                    aria-invalid={Boolean(validationErrors.password)}
                    aria-describedby={validationErrors.password ? 'password-error' : undefined}
                  />
                  {validationErrors.password && (
                    <div id="password-error" className="invalid-feedback">
                      {validationErrors.password}
                    </div>
                  )}
                </div>

                <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting}>
                  {isSubmitting && (
                    <output
                      className="spinner-border spinner-border-sm me-2 d-inline-block"
                      aria-hidden="true"
                    />
                  )}
                  {isSubmitting ? 'Entrando...' : 'Entrar'}
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Login;
