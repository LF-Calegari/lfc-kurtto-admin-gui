import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '../../constants/routes';
import { useAuth } from '../../contexts/AuthContext';
import { AuthApiError } from '../../services/authService';

import styles from './Login.module.css';

interface LoginFormState {
  email: string;
  password: string;
}

interface LoginValidationErrors {
  email?: string;
  password?: string;
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

function EyeIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function EyeSlashIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.182 4.182L9.88 9.88" />
    </svg>
  );
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
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<LoginFormState>({
    email: '',
    password: '',
  });
  const [validationErrors, setValidationErrors] = useState<LoginValidationErrors>({});
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const errors = validateForm(formData);
    setValidationErrors(errors);
    setAuthError('');

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await login(formData.email.trim(), formData.password);
      navigate(ROUTES.HOME, { replace: true });
    } catch (error) {
      if (error instanceof AuthApiError) {
        setAuthError(error.message);
      } else if (error instanceof Error) {
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
                  <div
                    className={`input-group ${validationErrors.password ? 'has-validation' : ''}`}
                  >
                    <input
                      id="password"
                      name="password"
                      type={isPasswordVisible ? 'text' : 'password'}
                      autoComplete="current-password"
                      maxLength={60}
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
                    <button
                      type="button"
                      className={`btn btn-outline-secondary ${styles.passwordToggle}`}
                      onClick={() => setIsPasswordVisible((previous) => !previous)}
                      aria-label={isPasswordVisible ? 'Ocultar senha' : 'Mostrar senha'}
                      aria-pressed={isPasswordVisible}
                    >
                      <span className={styles.passwordToggleIcon}>
                        {isPasswordVisible ? <EyeSlashIcon /> : <EyeIcon />}
                      </span>
                    </button>
                  </div>
                  {validationErrors.password && (
                    <div id="password-error" className="invalid-feedback d-block">
                      {validationErrors.password}
                    </div>
                  )}
                </div>

                <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting}>
                  {isSubmitting && (
                    <output
                      className="spinner-border spinner-border-sm me-2 d-inline-block"
                      aria-live="polite"
                      aria-label="Entrando"
                    >
                      <span className="visually-hidden">Entrando</span>
                    </output>
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
