export interface AuthUser {
  id: string;
  name: string;
  email: string;
  /** Nível de identidade do usuário (campo `identity` do auth-service). */
  identity: number;
  /** IDs de permissões efetivas (campo `permissions` do auth-service). */
  permissions: string[];
  /** Códigos de rota liberados para este usuário no sistema kurtto (campo `routeCodes` do auth-service). */
  routeCodes: string[];
}

export interface AuthUserSummary {
  id: string;
  name: string;
  email: string;
}

export interface AuthSessionPayload {
  token: string;
  user: AuthUser;
}

/**
 * Payload do `GET /auth/permissions` (introduzido pelo `lfc-authenticator#148`).
 *
 * Substitui a parte de catálogo do antigo `verify-token`. Frontend chama uma
 * vez após login feliz e no boot quando a sessão é restaurada do localStorage.
 */
export interface PermissionsResponse {
  user: {
    id: string;
    name: string;
    email: string;
    identity: number;
  };
  permissions: string[];
  permissionCodes: string[];
  routeCodes: string[];
}

/**
 * Payload reduzido do `GET /auth/verify-token` no contrato novo
 * (`lfc-authenticator#148`).
 *
 * Não traz mais `id`/`name`/`email`/`identity`/`permissions`/`routeCodes` —
 * agora é apenas sinal de validade do token + autorização da rota corrente.
 */
export interface VerifyTokenResponse {
  valid: boolean;
  issuedAt: string;
  expiresAt: string;
}
