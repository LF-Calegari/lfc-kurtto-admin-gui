import {
  AUTH_LOGIN_PATH,
  AUTH_LOGOUT_PATH,
  AUTH_VERIFY_TOKEN_PATH,
} from '../constants/authEndpoints';

import { loginWithPassword, logoutSession, verifySessionToken } from './authService';

function jsonResponse(body: unknown, status = 200): Response {
  const ok = status >= 200 && status < 300;
  const payload = JSON.stringify(body);
  return {
    ok,
    status,
    text: async () => payload,
  } as Response;
}

describe('authService', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.REACT_APP_AUTH_API_URL = 'http://auth.test';
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('loginWithPassword envia credenciais ao endpoint oficial e retorna o token', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse({ token: 'jwt-abc' }));
    global.fetch = fetchMock;

    const token = await loginWithPassword('user@test.com', 'secret');

    expect(token).toBe('jwt-abc');
    expect(fetchMock).toHaveBeenCalledWith(`http://auth.test${AUTH_LOGIN_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@test.com', password: 'secret' }),
    });
  });

  it('loginWithPassword lança AuthApiError com mensagem do servidor em 401', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({ message: 'Credenciais inválidas.' }, 401),
    );

    await expect(loginWithPassword('user@test.com', 'wrong')).rejects.toMatchObject({
      message: expect.stringMatching(/credenciais inválidas/i),
    });
  });

  it('verifySessionToken envia Authorization Bearer e mapeia o usuário', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse({
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Admin',
        email: 'admin@test.com',
        identity: 1,
        permissions: [],
      }),
    );
    global.fetch = fetchMock;

    const user = await verifySessionToken('jwt-abc');

    expect(user).toEqual({
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Admin',
      email: 'admin@test.com',
    });
    expect(fetchMock).toHaveBeenCalledWith(`http://auth.test${AUTH_VERIFY_TOKEN_PATH}`, {
      method: 'GET',
      headers: { Authorization: 'Bearer jwt-abc' },
    });
  });

  it('logoutSession chama endpoint de logout com Bearer', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse({ message: 'Sessão encerrada.' }));
    global.fetch = fetchMock;

    await expect(logoutSession('jwt-abc')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(`http://auth.test${AUTH_LOGOUT_PATH}`, {
      method: 'GET',
      headers: { Authorization: 'Bearer jwt-abc' },
    });
  });
});
