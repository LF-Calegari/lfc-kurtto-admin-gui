import { AUTH_SESSION_STORAGE_KEY } from '../constants/storageKeys';

import type {
  CreateLinkPayload,
  LinkItem,
  ListLinksMeta,
  ListLinksParams,
  ListLinksResponse,
  UpdateLinkPayload,
} from '../types/link';

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

/** Deve coincidir com o prefixo versionado da kurtto-api (ex.: GET/POST /api/v1/urls). */
const KURTTO_API_V1_BASE = '/api/v1';

function urlsCollectionPath(): string {
  return `${KURTTO_API_V1_BASE}/urls`;
}

function urlItemPath(shortCode: string): string {
  return `${KURTTO_API_V1_BASE}/urls/${encodeURIComponent(shortCode)}`;
}

function urlRestorePath(shortCode: string): string {
  return `${urlItemPath(shortCode)}/restore`;
}

export class LinkApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'LinkApiError';
  }
}

function getApiBaseUrl(): string {
  const url = process.env.REACT_APP_KURTTO_API_URL?.trim();
  if (!url) {
    throw new LinkApiError(
      'Configure REACT_APP_KURTTO_API_URL apontando para a kurtto-api (ex.: http://localhost:3000).',
      0,
    );
  }
  return url.replace(/\/$/, '');
}

function buildUrl(path: string): string {
  return `${getApiBaseUrl()}${path}`;
}

function readSessionToken(): string {
  const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
  if (!raw) {
    throw new LinkApiError('Sessão inválida ou expirada.', 401);
  }
  try {
    const parsed = JSON.parse(raw) as { token?: unknown };
    if (typeof parsed.token !== 'string' || parsed.token.trim().length === 0) {
      throw new Error('invalid');
    }
    return parsed.token;
  } catch {
    throw new LinkApiError('Sessão inválida ou expirada.', 401);
  }
}

async function parseJsonBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

function firstNonEmptyTrimmedString(values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value !== 'string') {
      continue;
    }
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return null;
}

function collectDetailMessages(details: unknown[]): string[] {
  const detailMessages: string[] = [];
  for (const item of details) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const d = item as Record<string, unknown>;
    if (typeof d.message === 'string' && d.message.trim().length > 0) {
      detailMessages.push(d.message.trim());
    }
  }
  return detailMessages;
}

function messageFromErrorAndDetails(record: Record<string, unknown>): string | null {
  if (typeof record.error !== 'string') {
    return null;
  }
  const err = record.error.trim();
  if (err.length === 0) {
    return null;
  }
  if (!Array.isArray(record.details)) {
    return err;
  }
  const detailMessages = collectDetailMessages(record.details);
  if (detailMessages.length === 0) {
    return err;
  }
  return `${err}: ${detailMessages.join(' ')}`.slice(0, 600);
}

function extractUserFacingErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    return null;
  }
  const record = body as Record<string, unknown>;

  const fromMessageOrTitle = firstNonEmptyTrimmedString([record.message, record.title]);
  if (fromMessageOrTitle) {
    return fromMessageOrTitle;
  }

  return messageFromErrorAndDetails(record);
}

function mapApiError(responseStatus: number, body: unknown): LinkApiError {
  if (responseStatus === 409) {
    return new LinkApiError('Já existe um link com estes dados.', responseStatus);
  }
  if (responseStatus === 404) {
    return new LinkApiError('Link não encontrado para esta operação.', responseStatus);
  }
  if (responseStatus >= 500) {
    return new LinkApiError('Ocorreu um erro inesperado. Tente novamente em instantes.', responseStatus);
  }
  if (responseStatus === 401) {
    const messageFromApi = extractUserFacingErrorMessage(body);
    return new LinkApiError(
      messageFromApi ?? 'Sessão expirada ou credenciais inválidas. Faça login novamente.',
      responseStatus,
    );
  }
  if (responseStatus === 403) {
    const messageFromApi = extractUserFacingErrorMessage(body);
    return new LinkApiError(
      messageFromApi ?? 'Você não tem permissão para esta operação.',
      responseStatus,
    );
  }
  const messageFromApi = extractUserFacingErrorMessage(body);
  if (messageFromApi) {
    return new LinkApiError(messageFromApi, responseStatus);
  }
  return new LinkApiError('Não foi possível concluir a operação. Tente novamente.', responseStatus);
}

function mapLinkItem(item: unknown): LinkItem {
  if (!item || typeof item !== 'object') {
    throw new LinkApiError('Ocorreu um erro inesperado. Tente novamente em instantes.', 500);
  }
  const record = item as Record<string, unknown>;
  const requiredFields = ['id', 'originalUrl', 'shortCode', 'shortUrl', 'createdAt', 'updatedAt'] as const;
  for (const field of requiredFields) {
    if (typeof record[field] !== 'string') {
      throw new LinkApiError('Ocorreu um erro inesperado. Tente novamente em instantes.', 500);
    }
  }
  if (typeof record.clicks !== 'number' || typeof record.isActive !== 'boolean') {
    throw new LinkApiError('Ocorreu um erro inesperado. Tente novamente em instantes.', 500);
  }

  let ownerId: string | null = null;
  if (typeof record.ownerId === 'string') {
    ownerId = record.ownerId;
  } else if (typeof record.owner_id === 'string') {
    ownerId = record.owner_id;
  }

  return {
    id: record.id as string,
    ownerId,
    originalUrl: record.originalUrl as string,
    shortCode: record.shortCode as string,
    shortUrl: record.shortUrl as string,
    clicks: record.clicks,
    isActive: record.isActive,
    createdAt: record.createdAt as string,
    updatedAt: record.updatedAt as string,
    expiresAt: typeof record.expiresAt === 'string' ? record.expiresAt : null,
    deletedAt: typeof record.deletedAt === 'string' ? record.deletedAt : null,
  };
}

function readNonNegativeInt(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    return null;
  }
  return value;
}

function readPositiveInt(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    return null;
  }
  return value;
}

function mapListMeta(body: Record<string, unknown>): ListLinksMeta {
  const metaRaw = body.meta;
  if (!metaRaw || typeof metaRaw !== 'object') {
    throw new LinkApiError('Ocorreu um erro inesperado. Tente novamente em instantes.', 500);
  }
  const meta = metaRaw as Record<string, unknown>;
  const page = readPositiveInt(meta.page);
  const limit = readPositiveInt(meta.limit);
  const total = readNonNegativeInt(meta.total);
  const totalPages = readNonNegativeInt(meta.total_pages);
  if (page === null || limit === null || total === null || totalPages === null) {
    throw new LinkApiError('Ocorreu um erro inesperado. Tente novamente em instantes.', 500);
  }
  return { page, limit, total, total_pages: totalPages };
}

function mapListResponse(body: unknown): ListLinksResponse {
  if (!body || typeof body !== 'object') {
    throw new LinkApiError('Ocorreu um erro inesperado. Tente novamente em instantes.', 500);
  }
  const record = body as Record<string, unknown>;
  if (!Array.isArray(record.data)) {
    throw new LinkApiError('Ocorreu um erro inesperado. Tente novamente em instantes.', 500);
  }

  return {
    data: record.data.map((item) => mapLinkItem(item)),
    meta: mapListMeta(record),
  };
}

function setOptionalTrimmedString(search: URLSearchParams, key: string, value: string | undefined): void {
  if (value === undefined) {
    return;
  }
  const trimmed = value.trim();
  if (trimmed.length > 0) {
    search.set(key, trimmed);
  }
}

function setOptionalFiniteNumber(search: URLSearchParams, key: string, value: number | undefined): void {
  if (value === undefined) {
    return;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return;
  }
  search.set(key, String(value));
}

/** Monta a query string de `GET /api/v1/urls` a partir dos parâmetros tipados (inclui filtros `campo__operador`). */
export function buildListQuery(params?: Readonly<ListLinksParams>): string {
  if (!params) {
    return '';
  }
  const search = new URLSearchParams();
  if (params.page !== undefined) {
    search.set('page', String(params.page));
  }
  if (params.limit !== undefined) {
    search.set('limit', String(params.limit));
  }
  setOptionalTrimmedString(search, 'q', params.q);
  setOptionalTrimmedString(search, 'id__eq', params.id__eq);
  setOptionalTrimmedString(search, 'original_url__eq', params.original_url__eq);
  setOptionalTrimmedString(search, 'original_url__like', params.original_url__like);
  setOptionalTrimmedString(search, 'short_code__eq', params.short_code__eq);
  setOptionalTrimmedString(search, 'short_code__like', params.short_code__like);
  setOptionalFiniteNumber(search, 'clicks__eq', params.clicks__eq);
  setOptionalFiniteNumber(search, 'clicks__lt', params.clicks__lt);
  setOptionalFiniteNumber(search, 'clicks__gt', params.clicks__gt);
  setOptionalFiniteNumber(search, 'clicks__gte', params.clicks__gte);
  setOptionalFiniteNumber(search, 'clicks__lte', params.clicks__lte);
  setOptionalTrimmedString(search, 'clicks__between', params.clicks__between);
  setOptionalTrimmedString(search, 'created_at__eq', params.created_at__eq);
  setOptionalTrimmedString(search, 'created_at__lt', params.created_at__lt);
  setOptionalTrimmedString(search, 'created_at__gt', params.created_at__gt);
  setOptionalTrimmedString(search, 'created_at__between', params.created_at__between);
  setOptionalTrimmedString(search, 'deleted_at__lt', params.deleted_at__lt);
  setOptionalTrimmedString(search, 'deleted_at__gt', params.deleted_at__gt);
  setOptionalTrimmedString(search, 'deleted_at__between', params.deleted_at__between);
  if (params.active === true) {
    search.set('active', 'true');
  }
  if (params.active === false) {
    search.set('active', 'false');
  }
  if (params.include_deleted === true) {
    search.set('include_deleted', 'true');
  }
  if (params.include_deleted === false) {
    search.set('include_deleted', 'false');
  }
  return search.toString();
}

async function request(path: string, init: RequestInit): Promise<Response> {
  const token = readSessionToken();
  try {
    return await fetch(buildUrl(path), {
      ...init,
      headers: {
        ...JSON_HEADERS,
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new LinkApiError(
      'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
      0,
    );
  }
}

export async function listLinks(params?: Readonly<ListLinksParams>): Promise<ListLinksResponse> {
  const query = buildListQuery(params);
  const path = query.length > 0 ? `${urlsCollectionPath()}?${query}` : urlsCollectionPath();
  const response = await request(path, { method: 'GET' });
  const body = await parseJsonBody(response);
  if (!response.ok) {
    throw mapApiError(response.status, body);
  }
  return mapListResponse(body);
}

export async function createLink(payload: CreateLinkPayload): Promise<LinkItem> {
  const response = await request(urlsCollectionPath(), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const body = await parseJsonBody(response);
  if (!response.ok) {
    throw mapApiError(response.status, body);
  }
  return mapLinkItem(body);
}

export async function updateLink(code: string, payload: UpdateLinkPayload): Promise<LinkItem> {
  const response = await request(urlItemPath(code), {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  const body = await parseJsonBody(response);
  if (!response.ok) {
    throw mapApiError(response.status, body);
  }
  return mapLinkItem(body);
}

export async function deleteLink(code: string): Promise<void> {
  const response = await request(urlItemPath(code), {
    method: 'DELETE',
  });
  if (!response.ok) {
    const body = await parseJsonBody(response);
    throw mapApiError(response.status, body);
  }
}

export async function restoreLink(code: string): Promise<LinkItem> {
  const response = await request(urlRestorePath(code), {
    method: 'PATCH',
  });
  const body = await parseJsonBody(response);
  if (!response.ok) {
    if (response.status === 422) {
      throw new LinkApiError('Este link não está excluído.', 422);
    }
    throw mapApiError(response.status, body);
  }
  return mapLinkItem(body);
}
