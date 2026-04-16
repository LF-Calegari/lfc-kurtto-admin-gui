import Tooltip from 'bootstrap/js/dist/tooltip';
import { FormEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { TrashIcon } from '../../assets/icons/TrashIcon';
import { AppHeader } from '../../components/layout/AppHeader/AppHeader';
import { Sidebar } from '../../components/layout/Sidebar/Sidebar';
import { useToast } from '../../contexts/ToastContext';
import { createLink, deleteLink, listLinks } from '../../services/linkService';

import styles from './Links.module.css';
import {
  buildCreatePayload,
  INITIAL_FORM,
  linkMatchesSearch,
  LOCAL_VALIDATION_MESSAGE,
  toUiError,
  validateForm,
} from './linksFormUtils';

import type { LinkFormState, LinkValidationErrors } from './linksFormUtils';
import type { LinkItem } from '../../types/link';

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
  const [deleteConfirmCode, setDeleteConfirmCode] = useState<string | null>(null);
  const createUrlInputRef = useRef<HTMLInputElement | null>(null);
  const tableBodyRef = useRef<HTMLTableSectionElement | null>(null);

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
    if (!isCreateModalOpen && deleteConfirmCode === null) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isCreateModalOpen, deleteConfirmCode]);

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

  const handleCloseDeleteModal = useCallback((): void => {
    if (isDeletingCode !== null) {
      return;
    }
    setDeleteConfirmCode(null);
  }, [isDeletingCode]);

  useEffect(() => {
    if (deleteConfirmCode === null) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        handleCloseDeleteModal();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [deleteConfirmCode, handleCloseDeleteModal]);

  useLayoutEffect(() => {
    const root = tableBodyRef.current;
    if (!root) {
      return;
    }
    const triggers = root.querySelectorAll<HTMLElement>('[data-bs-toggle="tooltip"]');
    const instances: InstanceType<typeof Tooltip>[] = [];
    triggers.forEach((trigger) => {
      instances.push(new Tooltip(trigger));
    });
    return () => {
      instances.forEach((instance) => {
        instance.dispose();
      });
    };
  }, [links, searchQuery, isDeletingCode, isLoadingList]);

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

  const handleConfirmDelete = async (): Promise<void> => {
    if (deleteConfirmCode === null) {
      return;
    }
    const code = deleteConfirmCode;
    setIsDeletingCode(code);
    try {
      await deleteLink(code);
      showToast({ variant: 'success', message: 'Link removido com sucesso.' });
      setDeleteConfirmCode(null);
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
          <tbody ref={tableBodyRef}>
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
                      className={`btn btn-outline-danger btn-sm ${styles.deleteIconButton}`}
                      data-bs-toggle="tooltip"
                      data-bs-placement="top"
                      data-bs-title="Excluir link"
                      onClick={() => {
                        setDeleteConfirmCode(link.shortCode);
                      }}
                      disabled={isSubmitting || isDeletingCode === link.shortCode}
                      aria-label="Excluir link"
                    >
                      {isDeletingCode === link.shortCode ? (
                        <output
                          className="spinner-border spinner-border-sm"
                          aria-live="polite"
                          aria-label="Removendo"
                        >
                          <span className="visually-hidden">Removendo</span>
                        </output>
                      ) : (
                        <TrashIcon className={styles.deleteIconSvg} />
                      )}
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
                aria-hidden="true"
                onClick={() => {
                  if (!isSubmitting) {
                    handleCloseCreateModal();
                  }
                }}
              />
              <dialog
                className={`modal fade show d-block border-0 bg-transparent p-0 ${styles.modalRoot}`}
                tabIndex={-1}
                aria-labelledby="create-link-modal-title"
                aria-modal="true"
                open
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
              </dialog>
            </>
          )}

          {deleteConfirmCode !== null && (
            <>
              <div
                className={`modal-backdrop fade show ${styles.modalBackdrop}`}
                aria-hidden="true"
                onClick={() => {
                  if (isDeletingCode === null) {
                    handleCloseDeleteModal();
                  }
                }}
              />
              <dialog
                className={`modal fade show d-block border-0 bg-transparent p-0 ${styles.modalRoot}`}
                tabIndex={-1}
                aria-labelledby="delete-link-modal-title"
                aria-modal="true"
                open
              >
                <div className="modal-dialog modal-dialog-centered">
                  <div className="modal-content">
                    <div className="modal-header">
                      <h2 id="delete-link-modal-title" className="modal-title h5 fw-medium mb-0">
                        Excluir link
                      </h2>
                      <button
                        type="button"
                        className="btn-close"
                        aria-label="Fechar"
                        onClick={handleCloseDeleteModal}
                        disabled={isDeletingCode !== null}
                      />
                    </div>
                    <div className="modal-body">
                      <p className="mb-0">
                        Tem certeza de que deseja excluir o link com código{' '}
                        <span className="font-monospace fw-medium">{deleteConfirmCode}</span>? Esta ação não pode ser
                        desfeita.
                      </p>
                    </div>
                    <div className="modal-footer flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={handleCloseDeleteModal}
                        disabled={isDeletingCode !== null}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => {
                          void handleConfirmDelete();
                        }}
                        disabled={isDeletingCode !== null}
                      >
                        {isDeletingCode !== null && (
                          <output
                            className="spinner-border spinner-border-sm me-2 d-inline-block"
                            aria-live="polite"
                            aria-label="Removendo"
                          >
                            <span className="visually-hidden">Removendo</span>
                          </output>
                        )}
                        Confirmar exclusão
                      </button>
                    </div>
                  </div>
                </div>
              </dialog>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default Links;
