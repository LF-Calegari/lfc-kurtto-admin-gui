import {
  AUTH_LOGIN_PATH,
  AUTH_LOGOUT_PATH,
  AUTH_PERMISSIONS_PATH,
  AUTH_USERS_PATH,
  AUTH_VERIFY_TOKEN_PATH,
} from '../constants/authEndpoints';

import type {
  AuthUser,
  AuthUserSummary,
  PermissionsResponse,
  VerifyTokenResponse,
} from '../types/auth';

const SYSTEM_ID_HEADER = 'X-System-Id';
const ROUTE_CODE_HEADER = 'X-Route-Code';

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

function buildVerifyTokenHeaders(token: string, routeCode: string): Record<string, string> {
  return {
    ...buildAuthHeaders(token),
    [ROUTE_CODE_HEADER]: routeCode,
  };
}

function buildUrl(path: string): string {
  return `${getAuthBaseUrl()}${path}`;
}

/**
 * Identifica mensagens 400 do backend que vazam detalhes de configuração
 * (SystemId/X-System-Id, sistema inválido/inativo, X-Route-Code/rota
 * inválida). Quando o predicado bate, o caller substitui a mensagem por
 * um fallback genérico — protege o usuário final de detalhes de
 * implementação que ele não pode resolver e que tipicamente indicam
 * misconfiguration de ambiente.
 */
function isAuthConfigError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('systemid') ||
    normalized.includes('system id') ||
    normalized.includes('sistema invalido') ||
    normalized.includes('sistema inválido') ||
    normalized.includes('sistema inativo') ||
    normalized.includes('rota')
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

function mapVerifyTokenResponse(body: unknown): VerifyTokenResponse {
  if (!body || typeof body !== 'object') {
    throw new AuthApiError('Resposta inválida do servidor de autenticação.', 500);
  }
  const record = body as Record<string, unknown>;
  if (
    typeof record.valid !== 'boolean' ||
    typeof record.issuedAt !== 'string' ||
    typeof record.expiresAt !== 'string'
  ) {
    throw new AuthApiError('Resposta inválida do servidor de autenticação.', 500);
  }
  return {
    valid: record.valid,
    issuedAt: record.issuedAt,
    expiresAt: record.expiresAt,
  };
}

function mapPermissionsResponse(body: unknown): PermissionsResponse {
  if (!body || typeof body !== 'object') {
    throw new AuthApiError('Resposta inválida do servidor de autenticação.', 500);
  }
  const record = body as Record<string, unknown>;
  const userRaw = record.user;
  if (!userRaw || typeof userRaw !== 'object') {
    throw new AuthApiError('Resposta inválida do servidor de autenticação.', 500);
  }
  const userRecord = userRaw as Record<string, unknown>;
  const id = userRecord.id;
  const name = userRecord.name;
  const email = userRecord.email;
  if (typeof id !== 'string' || typeof name !== 'string' || typeof email !== 'string') {
    throw new AuthApiError('Resposta inválida do servidor de autenticação.', 500);
  }
  const identity = typeof userRecord.identity === 'number' ? userRecord.identity : 0;
  return {
    user: { id, name, email, identity },
    permissions: readStringArray(record.permissions),
    permissionCodes: readStringArray(record.permissionCodes),
    routeCodes: readStringArray(record.routeCodes),
  };
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

/**
 * Projeta o `PermissionsResponse` para o `AuthUser` consumido pela UI.
 *
 * Centralizar a projeção evita divergência entre call sites (login e
 * bootstrap): qualquer mudança em `AuthUser` fica em um único lugar.
 */
export function toAuthUser(payload: PermissionsResponse): AuthUser {
  return {
    id: payload.user.id,
    name: payload.user.name,
    email: payload.user.email,
    identity: payload.user.identity,
    permissions: payload.permissions,
    routeCodes: payload.routeCodes,
  };
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
      response.status === 400 && isAuthConfigError(rawMessage) ? fallback : rawMessage;
    throw new AuthApiError(message, response.status);
  }
  if (!body || typeof body !== 'object' || typeof (body as { token?: unknown }).token !== 'string') {
    throw new AuthApiError('Resposta inválida do servidor de autenticação.', 500);
  }
  return (body as { token: string }).token;
}

/**
 * Carrega o catálogo do usuário autenticado (perfil + permissões + códigos
 * de rota autorizados). Endpoint introduzido pelo `lfc-authenticator#148`
 * para substituir a parte de catálogo do antigo `verify-token`.
 *
 * Headers: `Authorization: Bearer <token>` + `X-System-Id: <uuid>`.
 */
export async function getPermissions(token: string): Promise<PermissionsResponse> {
  const response = await fetch(buildUrl(AUTH_PERMISSIONS_PATH), {
    method: 'GET',
    headers: buildAuthHeaders(token),
  });
  const body = await parseJsonBody(response);
  if (!response.ok) {
    const fallback = 'Não foi possível carregar as permissões. Tente novamente.';
    const rawMessage = readMessageFromBody(body, fallback);
    const message =
      response.status === 400 && isAuthConfigError(rawMessage) ? fallback : rawMessage;
    throw new AuthApiError(message, response.status);
  }
  return mapPermissionsResponse(body);
}

/**
 * Verifica validade do token + autorização do usuário para o `routeCode`
 * informado. Contrato novo (`lfc-authenticator#148`):
 *
 * - **200**: payload reduzido `{valid, issuedAt, expiresAt}`.
 * - **401**: token inválido/expirado/revogado → caller limpa sessão.
 * - **403**: usuário sem direito à rota → caller redireciona para 403.
 * - **400**: header ausente ou rota inexistente → caller usa fallback
 *   genérico (configuração do backend, fora do controle do usuário).
 */
export async function verifySessionToken(
  token: string,
  routeCode: string,
  options?: { signal?: AbortSignal },
): Promise<VerifyTokenResponse> {
  const response = await fetch(buildUrl(AUTH_VERIFY_TOKEN_PATH), {
    method: 'GET',
    headers: buildVerifyTokenHeaders(token, routeCode),
    signal: options?.signal,
  });
  const body = await parseJsonBody(response);
  if (!response.ok) {
    const fallback = 'Sessão inválida ou expirada.';
    const rawMessage = readMessageFromBody(body, fallback);
    const message =
      response.status === 400 && isAuthConfigError(rawMessage) ? fallback : rawMessage;
    throw new AuthApiError(message, response.status);
  }
  return mapVerifyTokenResponse(body);
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
