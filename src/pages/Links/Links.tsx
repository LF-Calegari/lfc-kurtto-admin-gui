import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { AppHeader } from '../../components/layout/AppHeader/AppHeader';
import { Sidebar } from '../../components/layout/Sidebar/Sidebar';
import { createLink, deleteLink, LinkApiError, listLinks, updateLink } from '../../services/linkService';

import styles from './Links.module.css';

import type { CreateLinkPayload, LinkItem, UpdateLinkPayload } from '../../types/link';

interface LinkFormState {
  originalUrl: string;
  customCode: string;
}

interface LinkValidationErrors {
  originalUrl?: string;
  customCode?: string;
}

const INITIAL_FORM: LinkFormState = { originalUrl: '', customCode: '' };
const LOCAL_VALIDATION_MESSAGE = 'Revise os campos obrigatórios antes de continuar.';

function isValidHttpUrl(value: string): boolean {
  try {
    const normalized = new URL(value.trim());
    return normalized.protocol === 'http:' || normalized.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateForm(form: LinkFormState): LinkValidationErrors {
  const errors: LinkValidationErrors = {};
  const urlValue = form.originalUrl.trim();
  const customCode = form.customCode.trim();

  if (!urlValue) {
    errors.originalUrl = LOCAL_VALIDATION_MESSAGE;
  } else if (!isValidHttpUrl(urlValue)) {
    errors.originalUrl = 'Informe uma URL válida.';
  } else if (urlValue.length > 2048) {
    errors.originalUrl = LOCAL_VALIDATION_MESSAGE;
  }

  if (customCode && (customCode.length < 3 || customCode.length > 10 || !/^[a-zA-Z0-9]+$/.test(customCode))) {
    errors.customCode = LOCAL_VALIDATION_MESSAGE;
  }

  return errors;
}

function buildCreatePayload(form: LinkFormState): CreateLinkPayload {
  const customCode = form.customCode.trim();
  return {
    originalUrl: form.originalUrl.trim(),
    ...(customCode ? { customCode } : {}),
  };
}

function buildUpdatePayload(form: LinkFormState): UpdateLinkPayload {
  return {
    originalUrl: form.originalUrl.trim(),
  };
}

function toUiError(error: unknown): string {
  if (error instanceof LinkApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Ocorreu um erro inesperado. Tente novamente em instantes.';
}

function Links(): JSX.Element {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingCode, setIsDeletingCode] = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [form, setForm] = useState<LinkFormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<LinkValidationErrors>({});
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [feedbackError, setFeedbackError] = useState('');

  const loadLinks = useCallback(async () => {
    setIsLoadingList(true);
    setFeedbackError('');
    try {
      const result = await listLinks();
      setLinks(result.data);
    } catch (error) {
      console.error('Falha ao listar links.', error);
      setFeedbackError(toUiError(error));
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadLinks();
  }, [loadLinks]);

  const editingItem = useMemo(
    () => links.find((link) => link.shortCode === editingCode) ?? null,
    [links, editingCode],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const validationErrors = validateForm(form);
    setErrors(validationErrors);
    setFeedbackSuccess('');
    setFeedbackError('');

    if (Object.keys(validationErrors).length > 0) {
      setFeedbackError(LOCAL_VALIDATION_MESSAGE);
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCode) {
        await updateLink(editingCode, buildUpdatePayload(form));
        setFeedbackSuccess('Link atualizado com sucesso.');
      } else {
        await createLink(buildCreatePayload(form));
        setFeedbackSuccess('Link cadastrado com sucesso.');
      }
      setForm(INITIAL_FORM);
      setEditingCode(null);
      await loadLinks();
    } catch (error) {
      console.error('Falha ao salvar link.', error);
      setFeedbackError(toUiError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (link: LinkItem): void => {
    setEditingCode(link.shortCode);
    setFeedbackError('');
    setFeedbackSuccess('');
    setErrors({});
    setForm({
      originalUrl: link.originalUrl,
      customCode: link.shortCode,
    });
  };

  const handleCancelEdit = (): void => {
    setEditingCode(null);
    setForm(INITIAL_FORM);
    setErrors({});
    setFeedbackError('');
  };

  const handleDelete = async (code: string): Promise<void> => {
    const confirmed = globalThis.confirm('Deseja remover este link?');
    if (!confirmed) {
      return;
    }
    setFeedbackSuccess('');
    setFeedbackError('');
    setIsDeletingCode(code);
    try {
      await deleteLink(code);
      setFeedbackSuccess('Link removido com sucesso.');
      if (editingCode === code) {
        handleCancelEdit();
      }
      await loadLinks();
    } catch (error) {
      console.error('Falha ao remover link.', error);
      setFeedbackError(toUiError(error));
    } finally {
      setIsDeletingCode(null);
    }
  };

  let listPanelContent: JSX.Element;
  if (isLoadingList) {
    listPanelContent = (
      <div className="p-4 text-center">
        <output className="spinner-border" aria-live="polite" aria-label="Carregando links">
          <span className="visually-hidden">Carregando links</span>
        </output>
      </div>
    );
  } else if (links.length === 0) {
    listPanelContent = (
      <div className="p-4 text-center">
        <p className="fw-medium mb-2">Nenhum link cadastrado.</p>
        <p className={`mb-0 ${styles.muted}`}>Cadastre um novo link para começar.</p>
      </div>
    );
  } else {
    listPanelContent = (
      <div className="table-responsive">
        <table className="table align-middle mb-0">
          <thead>
            <tr>
              <th scope="col">Código</th>
              <th scope="col">URL original</th>
              <th scope="col">URL curta</th>
              <th scope="col">Cliques</th>
              <th scope="col" className="text-end">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {links.map((link) => (
              <tr key={link.id}>
                <td className={styles.tableCell}>
                  <span className="badge text-bg-light">{link.shortCode}</span>
                </td>
                <td className={`${styles.tableCell} ${styles.truncate}`} title={link.originalUrl}>
                  {link.originalUrl}
                </td>
                <td className={`${styles.tableCell} ${styles.truncate}`} title={link.shortUrl}>
                  {link.shortUrl}
                </td>
                <td className={styles.tableCell}>{link.clicks}</td>
                <td className="text-end">
                  <div className={`justify-content-end ${styles.actions}`}>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => {
                        handleEdit(link);
                      }}
                      disabled={isSubmitting || isDeletingCode === link.shortCode}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => {
                        void handleDelete(link.shortCode);
                      }}
                      disabled={isSubmitting || isDeletingCode === link.shortCode}
                    >
                      {isDeletingCode === link.shortCode ? 'Removendo...' : 'Excluir'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.mainColumn}>
        <AppHeader />
        <main className={styles.main}>
          <div className={styles.pageHeader}>
            <h1 className="h3 fw-medium mb-2">Links</h1>
            <p className={`mb-0 ${styles.muted}`}>Gerencie seus links encurtados no painel.</p>
          </div>

          {feedbackSuccess && (
            <output className="alert alert-success" aria-live="polite">
              {feedbackSuccess}
            </output>
          )}

          {feedbackError && (
            <div className="alert alert-danger" role="alert">
              {feedbackError}
            </div>
          )}

          <div className={`card shadow-sm ${styles.panel} mb-4`}>
            <div className="card-body p-4">
              <h2 className="h5 fw-medium mb-3">{editingItem ? 'Editar link' : 'Cadastrar link'}</h2>
              <form noValidate onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-12 col-lg-7">
                    <label htmlFor="original-url" className="form-label fw-medium">
                      URL original
                    </label>
                    <input
                      id="original-url"
                      name="originalUrl"
                      type="url"
                      className={`form-control ${errors.originalUrl ? 'is-invalid' : ''}`}
                      value={form.originalUrl}
                      onChange={(event) => {
                        setForm((previous) => ({ ...previous, originalUrl: event.target.value }));
                      }}
                      disabled={isSubmitting}
                    />
                    {errors.originalUrl && <div className="invalid-feedback">{errors.originalUrl}</div>}
                  </div>
                  <div className="col-12 col-lg-5">
                    <label htmlFor="custom-code" className="form-label fw-medium">
                      Código curto (opcional no cadastro)
                    </label>
                    <input
                      id="custom-code"
                      name="customCode"
                      type="text"
                      className={`form-control ${errors.customCode ? 'is-invalid' : ''}`}
                      value={form.customCode}
                      onChange={(event) => {
                        setForm((previous) => ({ ...previous, customCode: event.target.value }));
                      }}
                      disabled={isSubmitting || Boolean(editingItem)}
                      maxLength={10}
                    />
                    {errors.customCode && <div className="invalid-feedback">{errors.customCode}</div>}
                  </div>
                </div>
                <div className="d-flex flex-wrap gap-2 mt-4">
                  <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting && (
                      <output
                        className="spinner-border spinner-border-sm me-2 d-inline-block"
                        aria-live="polite"
                        aria-label="Salvando"
                      >
                        <span className="visually-hidden">Salvando</span>
                      </output>
                    )}
                    {editingItem ? 'Salvar edição' : 'Cadastrar link'}
                  </button>
                  {editingItem && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={handleCancelEdit}
                      disabled={isSubmitting}
                    >
                      Cancelar edição
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          <div className={`card shadow-sm ${styles.panel}`}>
            <div className="card-body p-0">{listPanelContent}</div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Links;
