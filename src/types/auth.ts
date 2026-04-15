export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthSessionPayload {
  token: string;
  user: AuthUser;
}
