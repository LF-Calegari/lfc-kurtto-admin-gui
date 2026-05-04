import {
  AUTH_LOGIN_PATH,
  AUTH_LOGOUT_PATH,
  AUTH_PERMISSIONS_PATH,
  AUTH_USERS_PATH,
  AUTH_VERIFY_TOKEN_PATH,
} from '../constants/authEndpoints';

import {
  getPermissions,
  listUsersByIds,
  loginWithPassword,
  logoutSession,
  toAuthUser,
  verifySessionToken,
} from './authService';

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
  const originalSystemId = process.env.REACT_APP_SYSTEM_ID;
  const SYSTEM_ID = '11111111-1111-1111-1111-111111111111';

  beforeEach(() => {
    process.env.REACT_APP_AUTH_API_URL = 'http://auth.test';
    process.env.REACT_APP_SYSTEM_ID = SYSTEM_ID;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.REACT_APP_AUTH_API_URL = originalAuthUrl;
    process.env.REACT_APP_SYSTEM_ID = originalSystemId;
  });

  it('loginWithPassword envia credenciais ao endpoint oficial e retorna o token', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse({ token: 'jwt-abc' }));
    global.fetch = fetchMock;

    const token = await loginWithPassword('user@test.com', 'secret');

    expect(token).toBe('jwt-abc');
    expect(fetchMock).toHaveBeenCalledWith(`http://auth.test${AUTH_LOGIN_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-System-Id': SYSTEM_ID },
      body: JSON.stringify({ email: 'user@test.com', password: 'secret', systemId: SYSTEM_ID }),
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

  it('verifySessionToken envia Authorization Bearer + X-System-Id + X-Route-Code e mapeia payload minimal', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse({
        valid: true,
        issuedAt: '2026-04-26T18:00:00Z',
        expiresAt: '2026-04-26T19:00:00Z',
      }),
    );
    global.fetch = fetchMock;

    const result = await verifySessionToken('jwt-abc', 'KURTTO_V1_HOME');

    expect(result).toEqual({
      valid: true,
      issuedAt: '2026-04-26T18:00:00Z',
      expiresAt: '2026-04-26T19:00:00Z',
    });
    expect(fetchMock).toHaveBeenCalledWith(`http://auth.test${AUTH_VERIFY_TOKEN_PATH}`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer jwt-abc',
        'X-System-Id': SYSTEM_ID,
        'X-Route-Code': 'KURTTO_V1_HOME',
      },
      signal: undefined,
    });
  });

  it('verifySessionToken propaga AbortSignal ao fetch', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse({
        valid: true,
        issuedAt: '2026-04-26T18:00:00Z',
        expiresAt: '2026-04-26T19:00:00Z',
      }),
    );
    global.fetch = fetchMock;
    const controller = new AbortController();

    await verifySessionToken('jwt-abc', 'KURTTO_V1_HOME', { signal: controller.signal });

    expect(fetchMock).toHaveBeenCalledWith(
      `http://auth.test${AUTH_VERIFY_TOKEN_PATH}`,
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it('verifySessionToken propaga 401 com mensagem do servidor', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ message: 'Token expirado.' }, 401));

    await expect(verifySessionToken('jwt', 'KURTTO_V1_HOME')).rejects.toMatchObject({
      message: 'Token expirado.',
      status: 401,
    });
  });

  it('verifySessionToken propaga 403 distinto de 401 para o caller decidir redirect', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({ message: 'Sem direito a esta rota.' }, 403),
    );

    await expect(verifySessionToken('jwt', 'KURTTO_V1_HOME')).rejects.toMatchObject({
      message: 'Sem direito a esta rota.',
      status: 403,
    });
  });

  it('verifySessionToken oculta detalhes de 400 que mencionam Rota', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({ message: 'Rota inválida ou inexistente.' }, 400),
    );

    await expect(verifySessionToken('jwt-abc', 'INVALID_CODE')).rejects.toMatchObject({
      message: 'Sessão inválida ou expirada.',
      status: 400,
    });
  });

  it('verifySessionToken oculta detalhes de 400 que mencionam SystemId', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({ message: 'SystemId inválido.' }, 400),
    );

    await expect(verifySessionToken('jwt-abc', 'KURTTO_V1_HOME')).rejects.toMatchObject({
      message: 'Sessão inválida ou expirada.',
      status: 400,
    });
  });

  it('verifySessionToken falha quando o payload não contém valid/issuedAt/expiresAt', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ valid: true }));

    await expect(verifySessionToken('jwt-abc', 'KURTTO_V1_HOME')).rejects.toMatchObject({
      message: expect.stringMatching(/resposta inválida/i),
    });
  });

  it('getPermissions chama o endpoint /auth/permissions com Bearer + X-System-Id', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse({
        user: {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'Admin',
          email: 'admin@test.com',
          identity: 2,
        },
        permissions: ['perm-1', 'perm-2'],
        permissionCodes: ['perm:Urls.Read', 'perm:Urls.Write'],
        routeCodes: ['KURTTO_V1_HOME', 'KURTTO_V1_URLS_HOME'],
      }),
    );
    global.fetch = fetchMock;

    const result = await getPermissions('jwt-abc');

    expect(result).toEqual({
      user: {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Admin',
        email: 'admin@test.com',
        identity: 2,
      },
      permissions: ['perm-1', 'perm-2'],
      permissionCodes: ['perm:Urls.Read', 'perm:Urls.Write'],
      routeCodes: ['KURTTO_V1_HOME', 'KURTTO_V1_URLS_HOME'],
    });
    expect(fetchMock).toHaveBeenCalledWith(`http://auth.test${AUTH_PERMISSIONS_PATH}`, {
      method: 'GET',
      headers: { Authorization: 'Bearer jwt-abc', 'X-System-Id': SYSTEM_ID },
    });
  });

  it('getPermissions usa defaults seguros quando arrays estão ausentes', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        user: {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'Admin',
          email: 'admin@test.com',
        },
      }),
    );

    const result = await getPermissions('jwt-abc');

    expect(result.user.identity).toBe(0);
    expect(result.permissions).toEqual([]);
    expect(result.permissionCodes).toEqual([]);
    expect(result.routeCodes).toEqual([]);
  });

  it('getPermissions propaga 401', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ message: 'Token expirado.' }, 401));

    await expect(getPermissions('jwt')).rejects.toMatchObject({
      message: 'Token expirado.',
      status: 401,
    });
  });

  it('getPermissions oculta detalhes de 400 que mencionam SystemId', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({ message: 'SystemId inválido.' }, 400),
    );

    await expect(getPermissions('jwt-abc')).rejects.toMatchObject({
      message: 'Não foi possível carregar as permissões. Tente novamente.',
      status: 400,
    });
  });

  it('getPermissions falha em fail-fast quando REACT_APP_SYSTEM_ID está vazio', async () => {
    process.env.REACT_APP_SYSTEM_ID = '   ';
    const fetchMock = jest.fn();
    global.fetch = fetchMock;

    await expect(getPermissions('jwt-abc')).rejects.toMatchObject({
      message: expect.stringMatching(/configure react_app_system_id/i),
      status: 0,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('getPermissions falha quando body não traz user', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ permissions: [] }));

    await expect(getPermissions('jwt-abc')).rejects.toMatchObject({
      message: expect.stringMatching(/resposta inválida/i),
    });
  });

  it('toAuthUser projeta PermissionsResponse para AuthUser preservando arrays', () => {
    const user = toAuthUser({
      user: {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        name: 'Pedro',
        email: 'pedro@test.com',
        identity: 1,
      },
      permissions: ['p-1'],
      permissionCodes: ['perm:Urls.Read'],
      routeCodes: ['KURTTO_V1_HOME'],
    });

    expect(user).toEqual({
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      name: 'Pedro',
      email: 'pedro@test.com',
      identity: 1,
      permissions: ['p-1'],
      routeCodes: ['KURTTO_V1_HOME'],
    });
  });

  it('logoutSession chama endpoint de logout com Bearer', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse({ message: 'Sessão encerrada.' }));
    global.fetch = fetchMock;

    await expect(logoutSession('jwt-abc')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(`http://auth.test${AUTH_LOGOUT_PATH}`, {
      method: 'GET',
      headers: { Authorization: 'Bearer jwt-abc', 'X-System-Id': SYSTEM_ID },
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
        headers: { Authorization: 'Bearer jwt-abc', 'X-System-Id': SYSTEM_ID },
      },
    );
  });

  it('listUsersByIds retorna vazio sem chamar API quando não há ids', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock;

    await expect(listUsersByIds('jwt-abc', [])).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('loginWithPassword falha em fail-fast quando REACT_APP_SYSTEM_ID não está definido', async () => {
    delete process.env.REACT_APP_SYSTEM_ID;
    const fetchMock = jest.fn();
    global.fetch = fetchMock;

    await expect(loginWithPassword('a@b.com', 'x')).rejects.toMatchObject({
      message: expect.stringMatching(/configure react_app_system_id/i),
      status: 0,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('verifySessionToken falha em fail-fast quando REACT_APP_SYSTEM_ID está vazio', async () => {
    process.env.REACT_APP_SYSTEM_ID = '   ';
    const fetchMock = jest.fn();
    global.fetch = fetchMock;

    await expect(verifySessionToken('jwt-abc', 'KURTTO_V1_HOME')).rejects.toMatchObject({
      message: expect.stringMatching(/configure react_app_system_id/i),
      status: 0,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('loginWithPassword oculta detalhes de erro 400 que mencionam SystemId', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({ message: 'SystemId é obrigatório.' }, 400),
    );

    await expect(loginWithPassword('a@b.com', 'x')).rejects.toMatchObject({
      message: 'Não foi possível autenticar no momento. Tente novamente.',
      status: 400,
    });
  });

  it('loginWithPassword oculta detalhes de erro 400 que indicam sistema inativo', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({ message: 'Sistema inativo para autenticação.' }, 400),
    );

    await expect(loginWithPassword('a@b.com', 'x')).rejects.toMatchObject({
      message: 'Não foi possível autenticar no momento. Tente novamente.',
      status: 400,
    });
  });
});
