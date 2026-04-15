import { AUTH_SESSION_STORAGE_KEY } from '../constants/storageKeys';

import type { CreateLinkPayload, LinkItem, ListLinksResponse, UpdateLinkPayload } from '../types/link';

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

/** Deve coincidir com o prefixo versionado da kurtto-api (ex.: GET/POST /api/v1/urls). */
const KURTTO_API_V1_BASE = '/api/v1';

function urlsCollectionPath(): string {
  return `${KURTTO_API_V1_BASE}/urls`;
}

function urlItemPath(shortCode: string): string {
  return `${KURTTO_API_V1_BASE}/urls/${encodeURIComponent(shortCode)}`;
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

function extractUserFacingErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    return null;
  }
  const record = body as Record<string, unknown>;

  if (typeof record.message === 'string') {
    const trimmed = record.message.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  if (typeof record.title === 'string') {
    const trimmed = record.title.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  if (typeof record.error === 'string') {
    const err = record.error.trim();
    if (err.length > 0) {
      if (Array.isArray(record.details)) {
        const detailMessages: string[] = [];
        for (const item of record.details) {
          if (item && typeof item === 'object') {
            const d = item as Record<string, unknown>;
            if (typeof d.message === 'string' && d.message.trim().length > 0) {
              detailMessages.push(d.message.trim());
            }
          }
        }
        if (detailMessages.length > 0) {
          return `${err}: ${detailMessages.join(' ')}`.slice(0, 600);
        }
      }
      return err;
    }
  }

  return null;
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

  return {
    id: record.id as string,
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
  };
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

export async function listLinks(): Promise<ListLinksResponse> {
  const response = await request(urlsCollectionPath(), { method: 'GET' });
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
