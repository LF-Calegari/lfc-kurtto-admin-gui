import {
  AUTH_LOGIN_PATH,
  AUTH_LOGOUT_PATH,
  AUTH_USERS_PATH,
  AUTH_VERIFY_TOKEN_PATH,
} from '../constants/authEndpoints';

import { listUsersByIds, loginWithPassword, logoutSession, verifySessionToken } from './authService';

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
  const originalAuthUrl = process.env.REACT_APP_AUTH_API_URL;

  beforeEach(() => {
    process.env.REACT_APP_AUTH_API_URL = 'http://auth.test';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.REACT_APP_AUTH_API_URL = originalAuthUrl;
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

  it('verifySessionToken envia Authorization Bearer e mapeia o usuário com identity, permissions e routeCodes', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse({
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Admin',
        email: 'admin@test.com',
        identity: 2,
        permissions: ['aaaa-bbbb', 'cccc-dddd'],
        routeCodes: ['links.read', 'links.create'],
      }),
    );
    global.fetch = fetchMock;

    const user = await verifySessionToken('jwt-abc');

    expect(user).toEqual({
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Admin',
      email: 'admin@test.com',
      identity: 2,
      permissions: ['aaaa-bbbb', 'cccc-dddd'],
      routeCodes: ['links.read', 'links.create'],
    });
    expect(fetchMock).toHaveBeenCalledWith(`http://auth.test${AUTH_VERIFY_TOKEN_PATH}`, {
      method: 'GET',
      headers: { Authorization: 'Bearer jwt-abc' },
    });
  });

  it('verifySessionToken usa defaults seguros quando identity/permissions/routeCodes estão ausentes', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Admin',
        email: 'admin@test.com',
      }),
    );

    const user = await verifySessionToken('jwt-abc');

    expect(user.identity).toBe(0);
    expect(user.permissions).toEqual([]);
    expect(user.routeCodes).toEqual([]);
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

  it('loginWithPassword falha quando REACT_APP_AUTH_API_URL não está definida', async () => {
    delete process.env.REACT_APP_AUTH_API_URL;

    await expect(loginWithPassword('a@b.com', 'x')).rejects.toMatchObject({
      message: expect.stringMatching(/configure react_app_auth_api_url/i),
      status: 0,
    });
  });

  it('loginWithPassword lança erro quando resposta OK não contém token', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({}));

    await expect(loginWithPassword('a@b.com', 'x')).rejects.toMatchObject({
      message: expect.stringMatching(/resposta inválida/i),
    });
  });

  it('loginWithPassword usa fallback quando erro não é 401', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({ title: 'Erro de validação' }, 400),
    );

    await expect(loginWithPassword('a@b.com', 'x')).rejects.toMatchObject({
      message: 'Erro de validação',
      status: 400,
    });
  });

  it('verifySessionToken falha com corpo inválido', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ id: 1, name: 'x', email: 'a@b.com' }));

    await expect(verifySessionToken('jwt')).rejects.toMatchObject({
      message: expect.stringMatching(/resposta inválida/i),
    });
  });

  it('verifySessionToken propaga falha 401', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ message: 'Expirado.' }, 401));

    await expect(verifySessionToken('jwt')).rejects.toMatchObject({
      message: 'Expirado.',
      status: 401,
    });
  });

  it('logoutSession ignora 401', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ message: 'Token inválido.' }, 401));

    await expect(logoutSession('jwt')).resolves.toBeUndefined();
  });

  it('logoutSession lança AuthApiError em erro não esperado', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ message: 'Erro no servidor.' }, 500));

    await expect(logoutSession('jwt')).rejects.toMatchObject({
      message: 'Erro no servidor.',
      status: 500,
    });
  });

  it('listUsersByIds consulta endpoint de batch e devolve usuários mínimos', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse([
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Primeiro',
        email: 'primeiro@test.com',
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Segundo',
        email: 'segundo@test.com',
      },
    ]));
    global.fetch = fetchMock;

    const result = await listUsersByIds('jwt-abc', [
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
    ]);

    expect(result).toEqual([
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Primeiro',
        email: 'primeiro@test.com',
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Segundo',
        email: 'segundo@test.com',
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      `http://auth.test${AUTH_USERS_PATH}?ids=11111111-1111-1111-1111-111111111111&ids=22222222-2222-2222-2222-222222222222`,
      {
        method: 'GET',
        headers: { Authorization: 'Bearer jwt-abc' },
      },
    );
  });

  it('listUsersByIds retorna vazio sem chamar API quando não há ids', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock;

    await expect(listUsersByIds('jwt-abc', [])).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
