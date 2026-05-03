import {
  AUTH_LOGIN_PATH,
  AUTH_LOGOUT_PATH,
  AUTH_USERS_PATH,
  AUTH_VERIFY_TOKEN_PATH,
} from '../constants/authEndpoints';

import type { AuthUser, AuthUserSummary } from '../types/auth';

const SYSTEM_ID_HEADER = 'X-System-Id';

export class AuthApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

function getAuthBaseUrl(): string {
  const url = process.env.REACT_APP_AUTH_API_URL?.trim();
  if (!url) {
    throw new AuthApiError(
      'Configure REACT_APP_AUTH_API_URL apontando para o auth-service (ex.: http://localhost:5052).',
      0,
    );
  }
  return url.replace(/\/$/, '');
}

function getSystemId(): string {
  const systemId = process.env.REACT_APP_SYSTEM_ID?.trim();
  if (!systemId) {
    throw new AuthApiError(
      'Configure REACT_APP_SYSTEM_ID com o UUID deste sistema cadastrado no auth-service.',
      0,
    );
  }
  return systemId;
}

function buildAuthHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    [SYSTEM_ID_HEADER]: getSystemId(),
  };
}

function buildUrl(path: string): string {
  return `${getAuthBaseUrl()}${path}`;
}

function isSystemIdConfigError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('systemid') ||
    normalized.includes('system id') ||
    normalized.includes('sistema invalido') ||
    normalized.includes('sistema inválido') ||
    normalized.includes('sistema inativo')
  );
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

function readMessageFromBody(body: unknown, fallback: string): string {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    if (typeof record.message === 'string' && record.message.trim().length > 0) {
      return record.message;
    }
    if (typeof record.title === 'string' && record.title.trim().length > 0) {
      return record.title;
    }
  }
  return fallback;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
}

function mapVerifyResponse(body: unknown): AuthUser {
  if (!body || typeof body !== 'object') {
    throw new AuthApiError('Resposta inválida do servidor de autenticação.', 500);
  }
  const record = body as Record<string, unknown>;
  const id = record.id;
  const name = record.name;
  const email = record.email;
  if (typeof id !== 'string' || typeof name !== 'string' || typeof email !== 'string') {
    throw new AuthApiError('Resposta inválida do servidor de autenticação.', 500);
  }
  const identity = typeof record.identity === 'number' ? record.identity : 0;
  const permissions = readStringArray(record.permissions);
  const routeCodes = readStringArray(record.routeCodes);
  return { id, name, email, identity, permissions, routeCodes };
}

function mapUserSummary(item: unknown): AuthUserSummary {
  if (!item || typeof item !== 'object') {
    throw new AuthApiError('Resposta inválida do servidor de autenticação.', 500);
  }
  const record = item as Record<string, unknown>;
  const id = record.id;
  const name = record.name;
  const email = record.email;
  if (typeof id !== 'string' || typeof name !== 'string' || typeof email !== 'string') {
    throw new AuthApiError('Resposta inválida do servidor de autenticação.', 500);
  }
  return { id, name, email };
}

export async function loginWithPassword(email: string, password: string): Promise<string> {
  const systemId = getSystemId();
  const response = await fetch(buildUrl(AUTH_LOGIN_PATH), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', [SYSTEM_ID_HEADER]: systemId },
    body: JSON.stringify({ email, password, systemId }),
  });
  const body = await parseJsonBody(response);
  if (!response.ok) {
    const fallback =
      response.status === 401
        ? 'Credenciais inválidas.'
        : 'Não foi possível autenticar no momento. Tente novamente.';
    const rawMessage = readMessageFromBody(body, fallback);
    const message =
      response.status === 400 && isSystemIdConfigError(rawMessage) ? fallback : rawMessage;
    throw new AuthApiError(message, response.status);
  }
  if (!body || typeof body !== 'object' || typeof (body as { token?: unknown }).token !== 'string') {
    throw new AuthApiError('Resposta inválida do servidor de autenticação.', 500);
  }
  return (body as { token: string }).token;
}

export async function verifySessionToken(token: string): Promise<AuthUser> {
  const response = await fetch(buildUrl(AUTH_VERIFY_TOKEN_PATH), {
    method: 'GET',
    headers: buildAuthHeaders(token),
  });
  const body = await parseJsonBody(response);
  if (!response.ok) {
    const fallback = 'Sessão inválida ou expirada.';
    const rawMessage = readMessageFromBody(body, fallback);
    const message =
      response.status === 400 && isSystemIdConfigError(rawMessage) ? fallback : rawMessage;
    throw new AuthApiError(message, response.status);
  }
  return mapVerifyResponse(body);
}

export async function logoutSession(token: string): Promise<void> {
  const response = await fetch(buildUrl(AUTH_LOGOUT_PATH), {
    method: 'GET',
    headers: buildAuthHeaders(token),
  });
  if (!response.ok && response.status !== 401) {
    const body = await parseJsonBody(response);
    const message = readMessageFromBody(body, 'Não foi possível encerrar a sessão no servidor.');
    throw new AuthApiError(message, response.status);
  }
}

export async function listUsersByIds(token: string, ids: readonly string[]): Promise<AuthUserSummary[]> {
  if (ids.length === 0) {
    return [];
  }
  const search = new URLSearchParams();
  for (const id of ids) {
    const trimmed = id.trim();
    if (trimmed.length > 0) {
      search.append('ids', trimmed);
    }
  }
  const response = await fetch(`${buildUrl(AUTH_USERS_PATH)}?${search.toString()}`, {
    method: 'GET',
    headers: buildAuthHeaders(token),
  });
  const body = await parseJsonBody(response);
  if (!response.ok) {
    const message = readMessageFromBody(body, 'Não foi possível carregar os dados dos usuários.');
    throw new AuthApiError(message, response.status);
  }
  if (!Array.isArray(body)) {
    throw new AuthApiError('Resposta inválida do servidor de autenticação.', 500);
  }
  return body.map((item) => mapUserSummary(item));
}
