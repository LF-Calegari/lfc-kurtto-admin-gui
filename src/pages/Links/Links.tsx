import Tooltip from 'bootstrap/js/dist/tooltip';
import {
  FormEvent,
  RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { AlertTriangleIcon } from '../../assets/icons/AlertTriangleIcon';
import { CheckIcon } from '../../assets/icons/CheckIcon';
import { ChevronDownIcon } from '../../assets/icons/ChevronDownIcon';
import { CopyIcon } from '../../assets/icons/CopyIcon';
import { FilterIcon } from '../../assets/icons/FilterIcon';
import { LinkIcon } from '../../assets/icons/LinkIcon';
import { PlusIcon } from '../../assets/icons/PlusIcon';
import { RotateIcon } from '../../assets/icons/RotateIcon';
import { SearchOffIcon } from '../../assets/icons/SearchOffIcon';
import { TrashIcon } from '../../assets/icons/TrashIcon';
import { XIcon } from '../../assets/icons/XIcon';
import { AppHeader } from '../../components/layout/AppHeader/AppHeader';
import { Sidebar } from '../../components/layout/Sidebar/Sidebar';
import { AUTH_SESSION_STORAGE_KEY } from '../../constants/storageKeys';
import { useToast } from '../../contexts/ToastContext';
import { listUsersByIds } from '../../services/authService';
import { createLink, deleteLink, listLinks, restoreLink } from '../../services/linkService';

import styles from './Links.module.css';
import {
  buildAppliedListParams,
  buildFilterChips,
  clearFilterByChipId,
  countActiveFilters,
  INITIAL_ADVANCED_FILTER,
} from './linksFilterUtils';
import {
  buildCreatePayload,
  INITIAL_FORM,
  LOCAL_VALIDATION_MESSAGE,
  toUiError,
  validateForm,
} from './linksFormUtils';

import type { AdvancedFilterDraft, FilterChip } from './linksFilterUtils';
import type { LinkFormState, LinkValidationErrors } from './linksFormUtils';
import type { LinkItem, ListLinksMeta } from '../../types/link';

const PAGE_SIZE = 10;
const LEGACY_UNASSIGNED_OWNER_ID = '00000000-0000-0000-0000-000000000001';

function readAuthTokenFromStorage(): string | null {
  const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as { token?: unknown };
    if (typeof parsed.token !== 'string') {
      return null;
    }
    const token = parsed.token.trim();
    return token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

type LinksListPanelKind =
  | 'loading'
  | 'error'
  | 'empty-no-query'
  | 'empty-search'
  | 'table';

function deduceListPanelKind(
  isLoadingList: boolean,
  listMeta: ListLinksMeta | null,
  hasActiveFilters: boolean,
): LinksListPanelKind {
  if (isLoadingList) {
    return 'loading';
  }
  if (listMeta === null) {
    return 'error';
  }
  if (listMeta.total === 0 && !hasActiveFilters) {
    return 'empty-no-query';
  }
  if (listMeta.total === 0) {
    return 'empty-search';
  }
  return 'table';
}

interface LinksListPanelProps {
  kind: LinksListPanelKind;
  links: LinkItem[];
  tableBodyRef: RefObject<HTMLTableSectionElement>;
  isSubmitting: boolean;
  isDeletingCode: string | null;
  isRestoringCode: string | null;
  copiedCode: string | null;
  ownerNamesById: Record<string, string>;
  ownerErrorById: Record<string, true>;
  onRetryList: () => void;
  onClearSearch: () => void;
  onOpenCreate: () => void;
  onRequestDelete: (shortCode: string) => void;
  onRestoreLink: (shortCode: string) => void;
  onCopyShortUrl: (shortUrl: string, shortCode: string) => void;
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return '—';
  }
}

function renderOwnerCell(
  ownerId: string | null | undefined,
  ownerNamesById: Record<string, string>,
  ownerErrorById: Record<string, true>,
): JSX.Element {
  if (ownerId == null || ownerId === LEGACY_UNASSIGNED_OWNER_ID) {
    return <span className={styles.ownerLegacy}>Sem dono</span>;
  }
  const ownerName = ownerNamesById[ownerId];
  if (ownerName) {
    return (
      <span className={styles.ownerName} title={ownerName}>
        {ownerName}
      </span>
    );
  }
  if (ownerErrorById[ownerId]) {
    return <span className={styles.ownerError}>Não resolvido</span>;
  }
  return (
    <span className={styles.ownerLoading}>
      <span className={`spinner-border spinner-border-sm ${styles.ownerSpinner}`} aria-hidden />
      Carregando…
    </span>
  );
}

function StatusBadge({ isActive, isDeleted }: Readonly<{ isActive: boolean; isDeleted: boolean }>): JSX.Element {
  if (isDeleted) {
    return <span className={styles.statusBadgeDeleted}>Excluído</span>;
  }
  if (isActive) {
    return <span className={styles.statusBadgeActive}><span className={styles.statusDot} aria-hidden />Ativo</span>;
  }
  return <span className={styles.statusBadgeInactive}><span className={styles.statusDot} aria-hidden />Inativo</span>;
}

function LinksListPanel({
  kind,
  links,
  tableBodyRef,
  isSubmitting,
  isDeletingCode,
  isRestoringCode,
  copiedCode,
  ownerNamesById,
  ownerErrorById,
  onRetryList,
  onClearSearch,
  onOpenCreate,
  onRequestDelete,
  onRestoreLink,
  onCopyShortUrl,
}: Readonly<LinksListPanelProps>): JSX.Element {
  switch (kind) {
    case 'loading':
      return (
        <div className={styles.stateContainer}>
          <output className={`spinner-border ${styles.loadingSpinner}`} aria-live="polite" aria-label="Carregando links">
            <span className="visually-hidden">Carregando links</span>
          </output>
          <p className={`mb-0 mt-3 ${styles.stateText}`}>Carregando links…</p>
        </div>
      );
    case 'error':
      return (
        <div className={styles.stateContainer}>
          <div className={`${styles.stateIconWrap} ${styles.stateIconWrapError}`}>
            <AlertTriangleIcon width={28} height={28} className={styles.stateIconError} />
          </div>
          <p className={`fw-medium mb-1 mt-3 ${styles.stateHeading}`}>Não foi possível carregar a listagem.</p>
          <p className={`mb-3 ${styles.stateText}`}>Verifique sua conexão e tente novamente.</p>
          <button type="button" className="btn btn-outline-primary btn-sm" onClick={onRetryList}>
            Tentar novamente
          </button>
        </div>
      );
    case 'empty-no-query':
      return (
        <div className={styles.stateContainer}>
          <div className={`${styles.stateIconWrap} ${styles.stateIconWrapEmber}`}>
            <LinkIcon width={28} height={28} className={styles.stateIconEmber} />
          </div>
          <p className={`fw-medium mb-1 mt-3 ${styles.stateHeading}`}>Nenhum link cadastrado.</p>
          <p className={`mb-3 ${styles.stateText}`}>Cadastre seu primeiro link para começar a encurtar URLs.</p>
          <button type="button" className="btn btn-primary btn-sm d-inline-flex align-items-center gap-2" onClick={onOpenCreate}>
            <PlusIcon width={14} height={14} />
            Cadastrar primeiro link
          </button>
        </div>
      );
    case 'empty-search':
      return (
        <div className={styles.stateContainer}>
          <div className={styles.stateIconWrap}>
            <SearchOffIcon width={28} height={28} className={styles.stateIconEmpty} />
          </div>
          <p className={`fw-medium mb-1 mt-3 ${styles.stateHeading}`}>Nenhum link corresponde aos filtros.</p>
          <p className={`mb-3 ${styles.stateText}`}>Ajuste os filtros ou limpe para ver todos os links.</p>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClearSearch}>
            Limpar filtros
          </button>
        </div>
      );
    case 'table':
      return (
        <div className={`table-responsive ${styles.tableCard}`}>
          <table className={`table align-middle mb-0 ${styles.dataTable}`}>
            <thead>
              <tr>
                <th scope="col" className={styles.thCol}>Código</th>
                <th scope="col" className={styles.thCol}>URL original</th>
                <th scope="col" className={styles.thCol}>URL curta</th>
                <th scope="col" className={styles.thCol}>Status</th>
                <th scope="col" className={styles.thCol}>Dono</th>
                <th scope="col" className={styles.thCol}>Criado em</th>
                <th scope="col" className={`${styles.thCol} text-end`}>Cliques</th>
                <th scope="col" className={`${styles.thCol} text-end`}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody ref={tableBodyRef}>
              {links.map((link) => (
                <tr key={link.id} className={styles.tableRow}>
                  <td className={styles.tableCell}>
                    <span className={styles.shortCodeBadge}>{link.shortCode}</span>
                  </td>
                  <td className={`${styles.tableCell} ${styles.truncate}`} title={link.originalUrl}>
                    <a
                      href={link.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.urlLink}
                    >
                      {link.originalUrl}
                    </a>
                  </td>
                  <td className={`${styles.tableCell} ${styles.truncate}`} title={link.shortUrl}>
                    <div className={styles.shortUrlCell}>
                      <a
                        href={link.shortUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${styles.urlLink} ${styles.shortUrlLink}`}
                      >
                        {link.shortUrl}
                      </a>
                      <button
                        type="button"
                        className={`${styles.copyIconButton} ${copiedCode === link.shortCode ? styles.copyIconButtonCopied : ''}`}
                        data-bs-toggle="tooltip"
                        data-bs-placement="top"
                        data-bs-title={copiedCode === link.shortCode ? 'Copiado!' : 'Copiar URL curta'}
                        onClick={() => {
                          onCopyShortUrl(link.shortUrl, link.shortCode);
                        }}
                        aria-label={`Copiar URL curta ${link.shortUrl}`}
                      >
                        {copiedCode === link.shortCode ? (
                          <CheckIcon width={14} height={14} />
                        ) : (
                          <CopyIcon width={14} height={14} />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className={styles.tableCell}>
                    <StatusBadge isActive={link.isActive} isDeleted={link.deletedAt !== null} />
                  </td>
                  <td className={`${styles.tableCell} ${styles.ownerCell}`}>
                    {renderOwnerCell(link.ownerId, ownerNamesById, ownerErrorById)}
                  </td>
                  <td className={`${styles.tableCell} ${styles.dateCell}`}>
                    {formatDate(link.createdAt)}
                  </td>
                  <td className={`${styles.tableCell} text-end ${styles.clicksCell}`}>
                    {link.clicks.toLocaleString('pt-BR')}
                  </td>
                  <td className="text-end">
                    <div className={`justify-content-end ${styles.actions}`}>
                      {link.deletedAt !== null ? (
                        <button
                          type="button"
                          className={`btn btn-outline-primary btn-sm ${styles.actionIconButton}`}
                          data-bs-toggle="tooltip"
                          data-bs-placement="top"
                          data-bs-title="Restaurar link"
                          onClick={() => {
                            onRestoreLink(link.shortCode);
                          }}
                          disabled={isSubmitting || isRestoringCode === link.shortCode}
                          aria-label="Restaurar link"
                        >
                          {isRestoringCode === link.shortCode ? (
                            <output
                              className="spinner-border spinner-border-sm"
                              aria-live="polite"
                              aria-label="Restaurando"
                            >
                              <span className="visually-hidden">Restaurando</span>
                            </output>
                          ) : (
                            <RotateIcon className={styles.actionIconSvg} />
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={`btn btn-outline-danger btn-sm ${styles.actionIconButton}`}
                          data-bs-toggle="tooltip"
                          data-bs-placement="top"
                          data-bs-title="Excluir link"
                          onClick={() => {
                            onRequestDelete(link.shortCode);
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
                            <TrashIcon className={styles.actionIconSvg} />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

interface FilterChipsBarProps {
  chips: FilterChip[];
  onRemove: (chipId: string) => void;
  onClearAll: () => void;
}

function FilterChipsBar({ chips, onRemove, onClearAll }: Readonly<FilterChipsBarProps>): JSX.Element | null {
  if (chips.length === 0) {
    return null;
  }
  return (
    <div className={styles.filterChipsRow} aria-label="Filtros ativos na listagem">
      <div className="d-flex align-items-center gap-2 flex-wrap">
        <span className={styles.filterChipsIntro}>
          Filtros ativos <span className={styles.filterChipsCount}>{chips.length}</span>
        </span>
        <div className="d-flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span key={chip.id} className={styles.filterChip}>
              <span className={styles.filterChipLabel}>{chip.label}</span>
              <button
                type="button"
                className={styles.filterChipRemove}
                onClick={() => {
                  onRemove(chip.id);
                }}
                aria-label={`Remover filtro ${chip.label}`}
              >
                <XIcon width={10} height={10} />
              </button>
            </span>
          ))}
        </div>
        <button type="button" className={styles.filterChipsClearAll} onClick={onClearAll}>
          Limpar todos
        </button>
      </div>
    </div>
  );
}

function Links(): JSX.Element {
  const { showToast } = useToast();
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [listMeta, setListMeta] = useState<ListLinksMeta | null>(null);
  const [draftQuery, setDraftQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [draftAdvanced, setDraftAdvanced] = useState<AdvancedFilterDraft>(INITIAL_ADVANCED_FILTER);
  const [appliedAdvanced, setAppliedAdvanced] = useState<AdvancedFilterDraft>(INITIAL_ADVANCED_FILTER);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingCode, setIsDeletingCode] = useState<string | null>(null);
  const [isRestoringCode, setIsRestoringCode] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [form, setForm] = useState<LinkFormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<LinkValidationErrors>({});
  const [deleteConfirmCode, setDeleteConfirmCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [ownerNamesById, setOwnerNamesById] = useState<Record<string, string>>({});
  const [ownerErrorById, setOwnerErrorById] = useState<Record<string, true>>({});
  const createUrlInputRef = useRef<HTMLInputElement | null>(null);
  const tableBodyRef = useRef<HTMLTableSectionElement | null>(null);
  const listFetchInFlight = useRef(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ownerNameCacheRef = useRef<Map<string, string>>(new Map());
  const ownerErrorCacheRef = useRef<Set<string>>(new Set());

  const fetchList = useCallback(
    async (
      targetPage: number,
      quickSearch: string,
      advanced: AdvancedFilterDraft,
    ): Promise<void> => {
      if (listFetchInFlight.current) {
        return;
      }
      listFetchInFlight.current = true;
      setIsLoadingList(true);
      try {
        const appliedParams = buildAppliedListParams(quickSearch.trim(), advanced);
        const result = await listLinks({
          page: targetPage,
          limit: PAGE_SIZE,
          ...appliedParams,
        });
        setLinks(result.data);
        setListMeta(result.meta);
        setAppliedQuery(quickSearch);
        setAppliedAdvanced(advanced);
        setDraftQuery(quickSearch);
        setDraftAdvanced(advanced);
      } catch (error) {
        showToast({ variant: 'error', message: toUiError(error) });
      } finally {
        setIsLoadingList(false);
        listFetchInFlight.current = false;
      }
    },
    [showToast],
  );

  useEffect(() => {
    void fetchList(1, '', INITIAL_ADVANCED_FILTER);
  }, [fetchList]);

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
      instances.push(new Tooltip(trigger, { animation: false }));
    });
    return () => {
      instances.forEach((instance) => {
        try {
          instance.hide();
        } catch {
          /* estado interno já inválido — ignorar */
        }
        instance.dispose();
      });
    };
  }, [links, isDeletingCode, isRestoringCode, isLoadingList, copiedCode]);

  useEffect(
    () => () => {
      if (copyTimeoutRef.current !== null) {
        clearTimeout(copyTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const ownerIds = Array.from(
      new Set(
        links
          .map((link) => link.ownerId)
          .filter((ownerId): ownerId is string => (
            typeof ownerId === 'string' &&
            ownerId !== LEGACY_UNASSIGNED_OWNER_ID
          )),
      ),
    );

    if (ownerIds.length === 0) {
      return;
    }

    const missingOwnerIds = ownerIds.filter((ownerId) => {
      if (ownerNameCacheRef.current.has(ownerId)) {
        return false;
      }
      if (ownerErrorCacheRef.current.has(ownerId)) {
        return false;
      }
      return true;
    });

    if (missingOwnerIds.length === 0) {
      return;
    }

    const token = readAuthTokenFromStorage();
    if (!token) {
      setOwnerErrorById((previous) => {
        const next = { ...previous };
        for (const ownerId of missingOwnerIds) {
          ownerErrorCacheRef.current.add(ownerId);
          next[ownerId] = true;
        }
        return next;
      });
      return;
    }

    let cancelled = false;
    void listUsersByIds(token, missingOwnerIds)
      .then((users) => {
        if (cancelled) {
          return;
        }

        const returnedOwnerIds = new Set<string>();
        setOwnerNamesById((previous) => {
          const next = { ...previous };
          for (const user of users) {
            returnedOwnerIds.add(user.id);
            ownerNameCacheRef.current.set(user.id, user.name);
            next[user.id] = user.name;
          }
          return next;
        });

        setOwnerErrorById((previous) => {
          const next = { ...previous };
          for (const ownerId of missingOwnerIds) {
            if (!returnedOwnerIds.has(ownerId)) {
              ownerErrorCacheRef.current.add(ownerId);
              next[ownerId] = true;
            }
          }
          return next;
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setOwnerErrorById((previous) => {
          const next = { ...previous };
          for (const ownerId of missingOwnerIds) {
            ownerErrorCacheRef.current.add(ownerId);
            next[ownerId] = true;
          }
          return next;
        });
        showToast({
          variant: 'warning',
          message: 'Não foi possível resolver todos os donos dos links.',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [links, showToast]);

  const handleCopyShortUrl = useCallback(
    (shortUrl: string, shortCode: string): void => {
      const onOk = (): void => {
        setCopiedCode(shortCode);
        showToast({ variant: 'success', message: 'URL curta copiada.' });
        if (copyTimeoutRef.current !== null) {
          clearTimeout(copyTimeoutRef.current);
        }
        copyTimeoutRef.current = setTimeout(() => {
          setCopiedCode(null);
        }, 1800);
      };
      const onFail = (): void => {
        showToast({ variant: 'error', message: 'Não foi possível copiar a URL.' });
      };
      try {
        const clipboard = navigator.clipboard;
        if (clipboard?.writeText) {
          clipboard.writeText(shortUrl).then(onOk).catch(onFail);
          return;
        }
      } catch {
        /* fallthrough */
      }
      onFail();
    },
    [showToast],
  );

  const showPagination =
    listMeta !== null && !isLoadingList && listMeta.total_pages > 1 && listMeta.total > 0;

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
      await fetchList(listMeta?.page ?? 1, appliedQuery, appliedAdvanced);
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
      await fetchList(listMeta?.page ?? 1, appliedQuery, appliedAdvanced);
    } catch (error) {
      showToast({ variant: 'error', message: toUiError(error) });
    } finally {
      setIsDeletingCode(null);
    }
  };

  const handleRestore = useCallback(
    async (code: string): Promise<void> => {
      setIsRestoringCode(code);
      try {
        await restoreLink(code);
        showToast({ variant: 'success', message: 'Link restaurado com sucesso.' });
        await fetchList(listMeta?.page ?? 1, appliedQuery, appliedAdvanced);
      } catch (error) {
        showToast({ variant: 'error', message: toUiError(error) });
      } finally {
        setIsRestoringCode(null);
      }
    },
    [appliedAdvanced, appliedQuery, fetchList, listMeta?.page, showToast],
  );

  const handleRequestRestore = useCallback(
    (code: string): void => {
      void handleRestore(code);
    },
    [handleRestore],
  );

  const appliedFilterParams = buildAppliedListParams(appliedQuery.trim(), appliedAdvanced);
  const appliedFilterChips = buildFilterChips(appliedFilterParams);
  const appliedFiltersCount = countActiveFilters(appliedFilterParams);
  const draftFilterParams = buildAppliedListParams(draftQuery.trim(), draftAdvanced);
  const draftFiltersCount = countActiveFilters(draftFilterParams);
  const hasAnyFilterToClear = appliedFiltersCount > 0 || draftFiltersCount > 0;
  const listPanelKind = deduceListPanelKind(
    isLoadingList,
    listMeta,
    appliedFiltersCount > 0,
  );

  const handleRemoveChip = useCallback(
    (chipId: string): void => {
      if (chipId === 'q') {
        setDraftQuery('');
        void fetchList(1, '', appliedAdvanced);
        return;
      }
      const nextAdvanced = clearFilterByChipId(appliedAdvanced, chipId);
      setDraftAdvanced(nextAdvanced);
      void fetchList(1, appliedQuery, nextAdvanced);
    },
    [appliedAdvanced, appliedQuery, fetchList],
  );

  const handleClearAllFilters = useCallback((): void => {
    setDraftQuery('');
    setDraftAdvanced(INITIAL_ADVANCED_FILTER);
    void fetchList(1, '', INITIAL_ADVANCED_FILTER);
  }, [fetchList]);

  const listPanelContent = (
    <LinksListPanel
      kind={listPanelKind}
      links={links}
      tableBodyRef={tableBodyRef}
      isSubmitting={isSubmitting}
      isDeletingCode={isDeletingCode}
      isRestoringCode={isRestoringCode}
      copiedCode={copiedCode}
      ownerNamesById={ownerNamesById}
      ownerErrorById={ownerErrorById}
      onRetryList={() => {
        void fetchList(1, appliedQuery, appliedAdvanced);
      }}
      onClearSearch={handleClearAllFilters}
      onOpenCreate={handleOpenCreateModal}
      onRequestDelete={setDeleteConfirmCode}
      onRestoreLink={handleRequestRestore}
      onCopyShortUrl={handleCopyShortUrl}
    />
  );

  const rangeStart = listMeta && listMeta.total > 0 ? (listMeta.page - 1) * listMeta.limit + 1 : 0;
  const rangeEnd = listMeta && listMeta.total > 0
    ? Math.min(listMeta.page * listMeta.limit, listMeta.total)
    : 0;

  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.mainColumn}>
        <AppHeader />
        <main className={styles.main}>
          <div className={styles.pageHeader}>
            <div className={styles.pageHeaderText}>
              <h1 className={`h3 fw-medium mb-2 ${styles.pageTitle}`}>Links</h1>
              <p className={`mb-0 ${styles.muted}`}>
                Gerencie, filtre e inspecione todos os links encurtados da sua conta.
              </p>
            </div>
            <div className={styles.pageHeaderActions}>
              <button
                type="button"
                className={`btn btn-primary d-inline-flex align-items-center gap-2 ${styles.primaryCta}`}
                onClick={handleOpenCreateModal}
              >
                <PlusIcon width={16} height={16} />
                <span>Adicionar link</span>
              </button>
            </div>
          </div>

          <form
            className={`card shadow-sm ${styles.panel} ${styles.filterPanel} mb-4`}
            id="links-filter-form"
            onSubmit={(event) => {
              event.preventDefault();
              void fetchList(1, draftQuery, draftAdvanced);
            }}
          >
            <div className={`card-header py-3 px-4 ${styles.filterCardHeader}`}>
              <div className="d-flex flex-column flex-sm-row gap-3 align-items-sm-center justify-content-between">
                <div className={styles.filterHeaderTitle}>
                  <span className={styles.filterHeaderIcon} aria-hidden>
                    <FilterIcon width={16} height={16} />
                  </span>
                  <h2 className="h6 fw-medium mb-0">Buscar links</h2>
                </div>
                <button
                  type="button"
                  className={`${styles.filterToggleButton} ${filtersExpanded ? styles.filterToggleButtonOpen : ''}`}
                  id="links-advanced-filters-toggle"
                  aria-expanded={filtersExpanded}
                  aria-controls="links-advanced-filters"
                  onClick={() => {
                    setFiltersExpanded((previous) => !previous);
                  }}
                >
                  <FilterIcon width={14} height={14} className={styles.filterToggleIcon} aria-hidden />
                  <span>Filtros avançados</span>
                  {appliedFiltersCount > 0 ? (
                    <span className={styles.filterToggleBadge}>{appliedFiltersCount}</span>
                  ) : null}
                  <ChevronDownIcon width={14} height={14} className={styles.filterToggleChevron} aria-hidden />
                </button>
              </div>
            </div>
            <div className="card-body p-4">
              <FilterChipsBar
                chips={appliedFilterChips}
                onRemove={handleRemoveChip}
                onClearAll={handleClearAllFilters}
              />
              <div className="row g-3 align-items-end">
                <div className="col-12 col-lg min-w-0">
                  <label htmlFor="links-search-query" className="form-label fw-medium">
                    Buscar na listagem
                  </label>
                  <p className={`form-text mb-2 ${styles.muted}`}>
                    Busca no servidor por código curto, URL de destino ou link encurtado. Nenhuma requisição é enviada
                    enquanto você digita — use Buscar ou Enter.
                  </p>
                  <input
                    id="links-search-query"
                    name="searchQuery"
                    type="search"
                    className={`form-control ${styles.searchInput}`}
                    placeholder="Digite o termo e pressione Buscar ou Enter…"
                    value={draftQuery}
                    onChange={(event) => {
                      setDraftQuery(event.target.value);
                    }}
                    autoComplete="off"
                  />
                </div>
              </div>

              <section
                id="links-advanced-filters"
                className={filtersExpanded ? `mt-4 pt-4 ${styles.advancedFiltersSection}` : 'd-none'}
                aria-hidden={!filtersExpanded}
                aria-labelledby="links-advanced-filters-toggle"
              >
                <div className={styles.filterGroup}>
                  <h3 className={styles.filterGroupTitle}>Identificação</h3>
                  <div className="row g-3">
                    <div className="col-12 col-md-6 col-xl-4">
                      <label htmlFor="links-filter-id" className="form-label fw-medium">
                        ID
                      </label>
                      <input
                        id="links-filter-id"
                        name="filterId"
                        type="text"
                        className="form-control font-monospace"
                        value={draftAdvanced.idEq}
                        onChange={(event) => {
                          setDraftAdvanced((previous) => ({ ...previous, idEq: event.target.value }));
                        }}
                        autoComplete="off"
                        placeholder="UUID"
                      />
                    </div>
                    <div className="col-12 col-md-6 col-xl-4">
                      <label htmlFor="links-filter-short-op" className="form-label fw-medium">
                        Código curto
                      </label>
                      <div className="row g-2">
                        <div className="col-12 col-sm-5">
                          <select
                            id="links-filter-short-op"
                            className="form-select"
                            value={draftAdvanced.shortCodeOp}
                            onChange={(event) => {
                              const value = event.target.value as AdvancedFilterDraft['shortCodeOp'];
                              setDraftAdvanced((previous) => ({ ...previous, shortCodeOp: value }));
                            }}
                            aria-label="Modo de filtro do código curto"
                          >
                            <option value="none">Sem filtro</option>
                            <option value="eq">Igual a</option>
                            <option value="like">Contém</option>
                          </select>
                        </div>
                        <div className="col-12 col-sm-7">
                          <input
                            id="links-filter-short-value"
                            type="text"
                            className="form-control"
                            value={draftAdvanced.shortCode}
                            onChange={(event) => {
                              setDraftAdvanced((previous) => ({ ...previous, shortCode: event.target.value }));
                            }}
                            disabled={draftAdvanced.shortCodeOp === 'none'}
                            autoComplete="off"
                            placeholder="Valor"
                            aria-label="Valor do código curto"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col-12 col-md-6 col-xl-4">
                      <label htmlFor="links-filter-url-op" className="form-label fw-medium">
                        Filtrar URL original
                      </label>
                      <div className="row g-2">
                        <div className="col-12 col-sm-5">
                          <select
                            id="links-filter-url-op"
                            className="form-select"
                            value={draftAdvanced.originalUrlOp}
                            onChange={(event) => {
                              const value = event.target.value as AdvancedFilterDraft['originalUrlOp'];
                              setDraftAdvanced((previous) => ({ ...previous, originalUrlOp: value }));
                            }}
                            aria-label="Modo de filtro da URL original"
                          >
                            <option value="none">Sem filtro</option>
                            <option value="eq">Igual a</option>
                            <option value="like">Contém</option>
                          </select>
                        </div>
                        <div className="col-12 col-sm-7">
                          <input
                            id="links-filter-url-value"
                            type="text"
                            className="form-control"
                            value={draftAdvanced.originalUrl}
                            onChange={(event) => {
                              setDraftAdvanced((previous) => ({ ...previous, originalUrl: event.target.value }));
                            }}
                            disabled={draftAdvanced.originalUrlOp === 'none'}
                            autoComplete="off"
                            placeholder="https://"
                            aria-label="Valor da URL original"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.filterGroup}>
                  <h3 className={styles.filterGroupTitle}>Status e métricas</h3>
                  <div className="row g-3">
                    <div className="col-12 col-md-6 col-xl-4">
                      <label htmlFor="links-filter-active" className="form-label fw-medium">
                        Status
                      </label>
                      <select
                        id="links-filter-active"
                        className="form-select"
                        value={draftAdvanced.active}
                        onChange={(event) => {
                          const value = event.target.value as AdvancedFilterDraft['active'];
                          setDraftAdvanced((previous) => ({ ...previous, active: value }));
                        }}
                      >
                        <option value="">Todos</option>
                        <option value="true">Somente ativos</option>
                        <option value="false">Somente inativos</option>
                      </select>
                    </div>
                    <div className="col-12 col-md-6 col-xl-4">
                      <label htmlFor="links-filter-clicks-op" className="form-label fw-medium">
                        Cliques
                      </label>
                      <div className="row g-2 align-items-end">
                        <div className="col-12 col-sm-4">
                          <select
                            id="links-filter-clicks-op"
                            className="form-select"
                            value={draftAdvanced.clicksOp}
                            onChange={(event) => {
                              const value = event.target.value as AdvancedFilterDraft['clicksOp'];
                              setDraftAdvanced((previous) => ({ ...previous, clicksOp: value }));
                            }}
                            aria-label="Operador de cliques"
                          >
                            <option value="none">Sem filtro</option>
                            <option value="eq">Igual a</option>
                            <option value="lt">Menor que</option>
                            <option value="gt">Maior que</option>
                            <option value="between">Entre</option>
                          </select>
                        </div>
                        <div className="col-12 col-sm-4">
                          <input
                            id="links-filter-clicks-a"
                            type="text"
                            inputMode="numeric"
                            className="form-control"
                            value={draftAdvanced.clicksValue}
                            onChange={(event) => {
                              setDraftAdvanced((previous) => ({ ...previous, clicksValue: event.target.value }));
                            }}
                            disabled={draftAdvanced.clicksOp === 'none'}
                            autoComplete="off"
                            placeholder={draftAdvanced.clicksOp === 'between' ? 'Mín.' : 'Valor'}
                            aria-label={draftAdvanced.clicksOp === 'between' ? 'Cliques mínimos' : 'Valor de cliques'}
                          />
                        </div>
                        {draftAdvanced.clicksOp === 'between' ? (
                          <div className="col-12 col-sm-4">
                            <input
                              id="links-filter-clicks-b"
                              type="text"
                              inputMode="numeric"
                              className="form-control"
                              value={draftAdvanced.clicksValueEnd}
                              onChange={(event) => {
                                setDraftAdvanced((previous) => ({ ...previous, clicksValueEnd: event.target.value }));
                              }}
                              autoComplete="off"
                              placeholder="Máx."
                              aria-label="Cliques máximos"
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="col-12 col-md-6 col-xl-4 d-flex align-items-end">
                      <div className={`form-check mb-0 ${styles.formCheckEmphasis}`}>
                        <input
                          id="links-filter-include-deleted"
                          type="checkbox"
                          className="form-check-input"
                          checked={draftAdvanced.includeDeleted}
                          onChange={(event) => {
                            setDraftAdvanced((previous) => ({
                              ...previous,
                              includeDeleted: event.target.checked,
                            }));
                          }}
                        />
                        <label className="form-check-label fw-medium" htmlFor="links-filter-include-deleted">
                          Incluir excluídos (soft delete)
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.filterGroup}>
                  <h3 className={styles.filterGroupTitle}>Período</h3>
                  <div className="row g-3">
                    <div className="col-12 col-md-6 col-xl-4">
                      <span className="form-label fw-medium d-block">Criado em</span>
                      <div className="row g-2">
                        <div className="col-12 col-sm-6">
                          <label htmlFor="links-filter-created-from" className="form-label small mb-1">
                            De
                          </label>
                          <input
                            id="links-filter-created-from"
                            type="datetime-local"
                            className="form-control"
                            value={draftAdvanced.createdFrom}
                            onChange={(event) => {
                              setDraftAdvanced((previous) => ({ ...previous, createdFrom: event.target.value }));
                            }}
                          />
                        </div>
                        <div className="col-12 col-sm-6">
                          <label htmlFor="links-filter-created-to" className="form-label small mb-1">
                            Até
                          </label>
                          <input
                            id="links-filter-created-to"
                            type="datetime-local"
                            className="form-control"
                            value={draftAdvanced.createdTo}
                            onChange={(event) => {
                              setDraftAdvanced((previous) => ({ ...previous, createdTo: event.target.value }));
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    {draftAdvanced.includeDeleted ? (
                      <div className="col-12 col-md-6 col-xl-8">
                        <span className="form-label fw-medium d-block">Excluído em</span>
                        <div className="row g-2">
                          <div className="col-12 col-sm-6">
                            <label htmlFor="links-filter-deleted-from" className="form-label small mb-1">
                              De
                            </label>
                            <input
                              id="links-filter-deleted-from"
                              type="datetime-local"
                              className="form-control"
                              value={draftAdvanced.deletedFrom}
                              onChange={(event) => {
                                setDraftAdvanced((previous) => ({ ...previous, deletedFrom: event.target.value }));
                              }}
                            />
                          </div>
                          <div className="col-12 col-sm-6">
                            <label htmlFor="links-filter-deleted-to" className="form-label small mb-1">
                              Até
                            </label>
                            <input
                              id="links-filter-deleted-to"
                              type="datetime-local"
                              className="form-control"
                              value={draftAdvanced.deletedTo}
                              onChange={(event) => {
                                setDraftAdvanced((previous) => ({ ...previous, deletedTo: event.target.value }));
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            </div>
            <div className={`card-footer p-4 ${styles.filterCardFooter}`}>
              <div className="d-flex flex-wrap gap-2 justify-content-end">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={isLoadingList || !hasAnyFilterToClear}
                  onClick={handleClearAllFilters}
                >
                  Limpar filtros
                </button>
                <button type="submit" className="btn btn-primary flex-shrink-0" disabled={isLoadingList}>
                  Buscar
                </button>
              </div>
            </div>
          </form>

          <div className={`card shadow-sm ${styles.panel} mb-4 ${styles.tableCard}`}>
            <div className={`card-header py-3 px-4 ${styles.filterCardHeader}`}>
              <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                <div className="d-flex align-items-center gap-3 flex-wrap">
                  <h2 className="h6 fw-medium mb-0">Listagem</h2>
                  {listMeta !== null && !isLoadingList && listMeta.total > 0 && (
                    <span className={styles.listMetaBadge}>
                      {listMeta.total.toLocaleString('pt-BR')} {listMeta.total === 1 ? 'link' : 'links'}
                    </span>
                  )}
                </div>
                {listMeta !== null && !isLoadingList && listMeta.total > 0 && (
                  <span className={styles.listRangeHint}>
                    Exibindo <strong>{rangeStart.toLocaleString('pt-BR')}</strong>–
                    <strong>{rangeEnd.toLocaleString('pt-BR')}</strong> de{' '}
                    <strong>{listMeta.total.toLocaleString('pt-BR')}</strong>
                  </span>
                )}
              </div>
            </div>
            <div className="card-body p-0">
              {listPanelContent}
              {showPagination && listMeta ? (
                <nav
                  className={`border-top ${styles.paginationBar}`}
                  aria-label="Paginação da listagem de links"
                >
                  <ul className="pagination pagination-sm justify-content-center flex-wrap mb-0">
                    <li className={`page-item ${listMeta.page <= 1 ? 'disabled' : ''}`}>
                      <button
                        type="button"
                        className="page-link"
                        disabled={listMeta.page <= 1 || isLoadingList}
                        onClick={() => {
                          void fetchList(listMeta.page - 1, appliedQuery, appliedAdvanced);
                        }}
                      >
                        Anterior
                      </button>
                    </li>
                    <li className="page-item disabled" aria-current="page">
                      <span className="page-link">
                        Página {listMeta.page} de {listMeta.total_pages}
                      </span>
                    </li>
                    <li className={`page-item ${listMeta.page >= listMeta.total_pages ? 'disabled' : ''}`}>
                      <button
                        type="button"
                        className="page-link"
                        disabled={listMeta.page >= listMeta.total_pages || isLoadingList}
                        onClick={() => {
                          void fetchList(listMeta.page + 1, appliedQuery, appliedAdvanced);
                        }}
                      >
                        Próxima
                      </button>
                    </li>
                  </ul>
                </nav>
              ) : null}
            </div>
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
