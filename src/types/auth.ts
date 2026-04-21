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
