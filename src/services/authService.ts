import {
  AUTH_LOGIN_PATH,
  AUTH_LOGOUT_PATH,
  AUTH_VERIFY_TOKEN_PATH,
} from '../constants/authEndpoints';

import type { AuthUser } from '../types/auth';

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

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

function buildUrl(path: string): string {
  return `${getAuthBaseUrl()}${path}`;
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

export async function loginWithPassword(email: string, password: string): Promise<string> {
  const response = await fetch(buildUrl(AUTH_LOGIN_PATH), {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ email, password }),
  });
  const body = await parseJsonBody(response);
  if (!response.ok) {
    const message = readMessageFromBody(
      body,
      response.status === 401
        ? 'Credenciais inválidas.'
        : 'Não foi possível autenticar no momento. Tente novamente.',
    );
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
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const body = await parseJsonBody(response);
  if (!response.ok) {
    const message = readMessageFromBody(body, 'Sessão inválida ou expirada.');
    throw new AuthApiError(message, response.status);
  }
  return mapVerifyResponse(body);
}

export async function logoutSession(token: string): Promise<void> {
  const response = await fetch(buildUrl(AUTH_LOGOUT_PATH), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok && response.status !== 401) {
    const body = await parseJsonBody(response);
    const message = readMessageFromBody(body, 'Não foi possível encerrar a sessão no servidor.');
    throw new AuthApiError(message, response.status);
  }
}
