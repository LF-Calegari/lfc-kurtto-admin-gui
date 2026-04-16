import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AppHeader } from '../../components/layout/AppHeader/AppHeader';
import { Sidebar } from '../../components/layout/Sidebar/Sidebar';
import { useToast } from '../../contexts/ToastContext';
import { createLink, deleteLink, LinkApiError, listLinks } from '../../services/linkService';

import styles from './Links.module.css';

import type { CreateLinkPayload, LinkItem } from '../../types/link';

interface LinkFormState {
  originalUrl: string;
}

interface LinkValidationErrors {
  originalUrl?: string;
}

const INITIAL_FORM: LinkFormState = { originalUrl: '' };
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

  if (!urlValue) {
    errors.originalUrl = LOCAL_VALIDATION_MESSAGE;
  } else if (!isValidHttpUrl(urlValue)) {
    errors.originalUrl = 'Informe uma URL válida.';
  } else if (urlValue.length > 2048) {
    errors.originalUrl = LOCAL_VALIDATION_MESSAGE;
  }

  return errors;
}

function buildCreatePayload(form: LinkFormState): CreateLinkPayload {
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

function linkMatchesSearch(link: LinkItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return (
    link.shortCode.toLowerCase().includes(q) ||
    link.originalUrl.toLowerCase().includes(q) ||
    link.shortUrl.toLowerCase().includes(q)
  );
}

function Links(): JSX.Element {
  const { showToast } = useToast();
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingCode, setIsDeletingCode] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [form, setForm] = useState<LinkFormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<LinkValidationErrors>({});
  const createUrlInputRef = useRef<HTMLInputElement | null>(null);

  const loadLinks = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const result = await listLinks();
      setLinks(result.data);
    } catch (error) {
      showToast({ variant: 'error', message: toUiError(error) });
    } finally {
      setIsLoadingList(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadLinks();
  }, [loadLinks]);

  const handleOpenCreateModal = useCallback((): void => {
    setForm(INITIAL_FORM);
    setErrors({});
    setIsCreateModalOpen(true);
  }, []);

  const handleCloseCreateModal = useCallback((): void => {
    if (isSubmitting) {
      return;
    }
    setIsCreateModalOpen(false);
    setForm(INITIAL_FORM);
    setErrors({});
  }, [isSubmitting]);

  useEffect(() => {
    if (!isCreateModalOpen) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isCreateModalOpen]);

  useEffect(() => {
    if (!isCreateModalOpen) {
      return;
    }
    const id = globalThis.requestAnimationFrame(() => {
      createUrlInputRef.current?.focus();
    });
    return () => {
      globalThis.cancelAnimationFrame(id);
    };
  }, [isCreateModalOpen]);

  useEffect(() => {
    if (!isCreateModalOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        handleCloseCreateModal();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isCreateModalOpen, handleCloseCreateModal]);

  const filteredLinks = useMemo(
    () => links.filter((link) => linkMatchesSearch(link, searchQuery)),
    [links, searchQuery],
  );

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const validationErrors = validateForm(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      showToast({ variant: 'warning', message: LOCAL_VALIDATION_MESSAGE });
      return;
    }

    setIsSubmitting(true);
    try {
      await createLink(buildCreatePayload(form));
      showToast({ variant: 'success', message: 'Link cadastrado com sucesso.' });
      setIsCreateModalOpen(false);
      setForm(INITIAL_FORM);
      setErrors({});
      await loadLinks();
    } catch (error) {
      showToast({ variant: 'error', message: toUiError(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (code: string): Promise<void> => {
    const confirmed = globalThis.confirm('Deseja remover este link?');
    if (!confirmed) {
      return;
    }
    setIsDeletingCode(code);
    try {
      await deleteLink(code);
      showToast({ variant: 'success', message: 'Link removido com sucesso.' });
      await loadLinks();
    } catch (error) {
      showToast({ variant: 'error', message: toUiError(error) });
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
  } else if (filteredLinks.length === 0) {
    listPanelContent = (
      <div className="p-4 text-center">
        <p className="fw-medium mb-2">Nenhum link corresponde à busca.</p>
        <p className={`mb-2 ${styles.muted}`}>Ajuste o termo ou limpe o campo de busca.</p>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => {
            setSearchQuery('');
          }}
        >
          Limpar busca
        </button>
      </div>
    );
  } else {
    listPanelContent = (
      <div className={`table-responsive ${styles.tableCard}`}>
        <table className="table table-striped align-middle mb-0">
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
            {filteredLinks.map((link) => (
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
          <div className={`${styles.pageHeader} d-flex flex-wrap justify-content-between align-items-start gap-3`}>
            <div className="flex-grow-1 min-w-0">
              <h1 className="h3 fw-medium mb-2">Links</h1>
              <p className={`mb-0 ${styles.muted}`}>Gerencie seus links encurtados no painel.</p>
            </div>
            <button type="button" className="btn btn-primary flex-shrink-0" onClick={handleOpenCreateModal}>
              Adicionar link
            </button>
          </div>

          <div className={`card shadow-sm ${styles.panel} mb-4`}>
            <div className={`card-header py-3 px-4 ${styles.filterCardHeader}`}>
              <h2 className="h6 fw-medium mb-0">Buscar links</h2>
            </div>
            <div className="card-body p-4">
              <div className="row g-3 align-items-end">
                <div className="col-12">
                  <label htmlFor="links-search-query" className="form-label fw-medium">
                    Buscar na listagem
                  </label>
                  <p className={`form-text mb-2 ${styles.muted}`}>
                    Filtra por código curto, URL de destino ou link encurtado.
                  </p>
                  <input
                    id="links-search-query"
                    name="searchQuery"
                    type="search"
                    className="form-control"
                    placeholder="Digite para filtrar a listagem…"
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                    }}
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={`card shadow-sm ${styles.panel} mb-4 ${styles.tableCard}`}>
            <div className={`card-header py-3 px-4 ${styles.filterCardHeader}`}>
              <h2 className="h6 fw-medium mb-0">Listagem</h2>
            </div>
            <div className="card-body p-0">{listPanelContent}</div>
          </div>

          {isCreateModalOpen && (
            <>
              <div
                className={`modal-backdrop fade show ${styles.modalBackdrop}`}
                role="presentation"
                onClick={() => {
                  if (!isSubmitting) {
                    handleCloseCreateModal();
                  }
                }}
              />
              <div
                className={`modal fade show d-block ${styles.modalRoot}`}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-link-modal-title"
              >
                <div className="modal-dialog modal-dialog-centered modal-lg">
                  <div className="modal-content">
                    <div className="modal-header">
                      <h2 id="create-link-modal-title" className="modal-title h5 fw-medium mb-0">
                        Cadastrar link
                      </h2>
                      <button
                        type="button"
                        className="btn-close"
                        aria-label="Fechar"
                        onClick={handleCloseCreateModal}
                        disabled={isSubmitting}
                      />
                    </div>
                    <form noValidate onSubmit={handleCreateSubmit}>
                      <div className="modal-body">
                        <div className="row g-3">
                          <div className="col-12">
                            <label htmlFor="create-link-original-url" className="form-label fw-medium">
                              URL original
                            </label>
                            <input
                              ref={createUrlInputRef}
                              id="create-link-original-url"
                              name="originalUrl"
                              type="url"
                              className={`form-control ${errors.originalUrl ? 'is-invalid' : ''}`}
                              value={form.originalUrl}
                              onChange={(event) => {
                                setForm((previous) => ({ ...previous, originalUrl: event.target.value }));
                              }}
                              disabled={isSubmitting}
                              placeholder="https://"
                              autoComplete="off"
                            />
                            {errors.originalUrl && (
                              <div className="invalid-feedback">{errors.originalUrl}</div>
                            )}
                            <p className={`form-text mb-0 mt-2 ${styles.muted}`}>
                              O código curto é gerado automaticamente após o cadastro.
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="modal-footer flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={handleCloseCreateModal}
                          disabled={isSubmitting}
                        >
                          Cancelar
                        </button>
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
                          Cadastrar link
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default Links;
