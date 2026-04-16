import { AUTH_SESSION_STORAGE_KEY } from '../constants/storageKeys';

import {
  buildListQuery,
  createLink,
  deleteLink,
  LinkApiError,
  listLinks,
  updateLink,
} from './linkService';

function jsonResponse(body: unknown, status = 200): Response {
  const ok = status >= 200 && status < 300;
  const payload = JSON.stringify(body);
  return {
    ok,
    status,
    text: async () => payload,
  } as Response;
}

function textResponse(rawText: string, status: number): Response {
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    text: async () => rawText,
  } as Response;
}

describe('buildListQuery', () => {
  it('serializa filtros campo__operador e paginação', () => {
    const query = buildListQuery({
      page: 2,
      limit: 5,
      q: '  beta  ',
      short_code__eq: 'abc',
      clicks__between: '1,10',
      created_at__lt: '2026-01-01T00:00:00.000Z',
      active: true,
      include_deleted: false,
    });
    const params = new URLSearchParams(query);
    expect(params.get('page')).toBe('2');
    expect(params.get('limit')).toBe('5');
    expect(params.get('q')).toBe('beta');
    expect(params.get('short_code__eq')).toBe('abc');
    expect(params.get('clicks__between')).toBe('1,10');
    expect(params.get('created_at__lt')).toBe('2026-01-01T00:00:00.000Z');
    expect(params.get('active')).toBe('true');
    expect(params.get('include_deleted')).toBe('false');
  });

  it('omite strings vazias', () => {
    const query = buildListQuery({
      page: 1,
      limit: 10,
      q: '   ',
      id__eq: '',
      original_url__like: '  ',
    });
    expect(query).toContain('page=1');
    expect(query).toContain('limit=10');
    expect(query.includes('q=')).toBe(false);
    expect(query.includes('id__eq')).toBe(false);
    expect(query.includes('original_url__like')).toBe(false);
  });
});

describe('linkService', () => {
  const originalFetch = global.fetch;
  const originalApiUrl = process.env.REACT_APP_KURTTO_API_URL;

  beforeEach(() => {
    process.env.REACT_APP_KURTTO_API_URL = 'http://kurtto-api.test';
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({ token: 'jwt-token' }));
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.REACT_APP_KURTTO_API_URL = originalApiUrl;
    localStorage.clear();
  });

  const defaultListMeta = { page: 1, limit: 10, total: 1, total_pages: 1 } as const;

  it('listLinks envia bearer token e mapeia resposta', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse({
        data: [
          {
            id: '1',
            originalUrl: 'https://example.com',
            shortCode: 'abc123',
            shortUrl: 'https://k.tt/abc123',
            clicks: 7,
            isActive: true,
            createdAt: '2026-01-01T10:00:00.000Z',
            updatedAt: '2026-01-01T10:00:00.000Z',
            expiresAt: null,
            deletedAt: null,
          },
        ],
        meta: defaultListMeta,
      }),
    );
    global.fetch = fetchMock;

    const result = await listLinks();

    expect(result.data).toHaveLength(1);
    expect(result.meta).toEqual(defaultListMeta);
    expect(fetchMock).toHaveBeenCalledWith('http://kurtto-api.test/api/v1/urls', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
  });

  it('listLinks envia query string com page, limit e q', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse({
        data: [],
        meta: { page: 2, limit: 5, total: 0, total_pages: 0 },
      }),
    );
    global.fetch = fetchMock;

    await listLinks({ page: 2, limit: 5, q: '  beta  ' });

    expect(fetchMock).toHaveBeenCalledWith('http://kurtto-api.test/api/v1/urls?page=2&limit=5&q=beta', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
  });

  it('falha quando resposta da lista não contém meta', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        data: [
          {
            id: '1',
            originalUrl: 'https://example.com',
            shortCode: 'abc123',
            shortUrl: 'https://k.tt/abc123',
            clicks: 7,
            isActive: true,
            createdAt: '2026-01-01T10:00:00.000Z',
            updatedAt: '2026-01-01T10:00:00.000Z',
            expiresAt: null,
            deletedAt: null,
          },
        ],
      }),
    );

    await expect(listLinks()).rejects.toMatchObject({
      status: 500,
      message: 'Ocorreu um erro inesperado. Tente novamente em instantes.',
    });
  });

  it('createLink envia payload de contrato', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse({
        id: '1',
        originalUrl: 'https://example.com',
        shortCode: 'abc123',
        shortUrl: 'https://k.tt/abc123',
        clicks: 0,
        isActive: true,
        createdAt: '2026-01-01T10:00:00.000Z',
        updatedAt: '2026-01-01T10:00:00.000Z',
        expiresAt: null,
        deletedAt: null,
      }, 201),
    );
    global.fetch = fetchMock;

    await createLink({ originalUrl: 'https://example.com', customCode: 'abc123' });

    expect(fetchMock).toHaveBeenCalledWith('http://kurtto-api.test/api/v1/urls', {
      method: 'POST',
      body: JSON.stringify({ originalUrl: 'https://example.com', customCode: 'abc123' }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
  });

  it('updateLink envia payload no endpoint do código', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse({
        id: '1',
        originalUrl: 'https://example.com/novo',
        shortCode: 'abc123',
        shortUrl: 'https://k.tt/abc123',
        clicks: 0,
        isActive: true,
        createdAt: '2026-01-01T10:00:00.000Z',
        updatedAt: '2026-01-01T10:00:00.000Z',
        expiresAt: null,
        deletedAt: null,
      }),
    );
    global.fetch = fetchMock;

    await updateLink('abc123', { originalUrl: 'https://example.com/novo' });

    expect(fetchMock).toHaveBeenCalledWith('http://kurtto-api.test/api/v1/urls/abc123', {
      method: 'PATCH',
      body: JSON.stringify({ originalUrl: 'https://example.com/novo' }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
  });

  it('mapeia erro 409 para mensagem de duplicidade', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ message: 'custom_code already exists' }, 409));

    await expect(createLink({ originalUrl: 'https://example.com' })).rejects.toMatchObject({
      status: 409,
      message: 'Já existe um link com estes dados.',
    });
  });

  it('mapeia erro 404 para mensagem de não encontrado', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ message: 'URL not found' }, 404));

    await expect(deleteLink('nao-existe')).rejects.toMatchObject({
      status: 404,
      message: 'Link não encontrado para esta operação.',
    });
  });

  it('mapeia erro de rede para indisponibilidade', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network'));

    await expect(listLinks()).rejects.toMatchObject({
      status: 0,
      message:
        'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
    });
  });

  it('falha quando não há sessão no armazenamento', async () => {
    localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);

    await expect(listLinks()).rejects.toMatchObject({
      status: 401,
      message: 'Sessão inválida ou expirada.',
    });
  });

  it('falha quando o token da sessão é inválido', async () => {
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, '{not-json');

    await expect(listLinks()).rejects.toMatchObject({
      status: 401,
      message: 'Sessão inválida ou expirada.',
    });
  });

  it('falha quando o token da sessão está vazio', async () => {
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({ token: '   ' }));

    await expect(listLinks()).rejects.toMatchObject({
      status: 401,
      message: 'Sessão inválida ou expirada.',
    });
  });

  it('parseia corpo vazio como objeto vazio em resposta ok', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      textResponse('', 200) as Response,
    );

    await expect(listLinks()).rejects.toBeInstanceOf(LinkApiError);
  });

  it('ignora JSON inválido no corpo e trata como objeto vazio', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      textResponse('not-json{', 500) as Response,
    );

    await expect(listLinks()).rejects.toMatchObject({
      status: 500,
      message: 'Ocorreu um erro inesperado. Tente novamente em instantes.',
    });
  });

  it('usa title do corpo quando message não está presente', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ title: 'Erro de validação' }, 422));

    await expect(createLink({ originalUrl: 'https://example.com' })).rejects.toMatchObject({
      status: 422,
      message: 'Erro de validação',
    });
  });

  it('mapeia 422 com error e details (contrato kurtto-api)', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse(
        {
          error: 'Validation failed',
          details: [{ field: 'originalUrl', message: 'must be a valid URL' }],
        },
        422,
      ),
    );

    await expect(createLink({ originalUrl: 'not-a-url' })).rejects.toMatchObject({
      status: 422,
      message: 'Validation failed: must be a valid URL',
    });
  });

  it('mapeia 401 sem corpo para mensagem segura em português', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({}, 401));

    await expect(listLinks()).rejects.toMatchObject({
      status: 401,
      message: 'Sessão expirada ou credenciais inválidas. Faça login novamente.',
    });
  });

  it('mapeia 403 sem corpo para mensagem segura em português', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({}, 403));

    await expect(listLinks()).rejects.toMatchObject({
      status: 403,
      message: 'Você não tem permissão para esta operação.',
    });
  });

  it('mapeia erro 500 genérico', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({}, 503));

    await expect(listLinks()).rejects.toMatchObject({
      status: 503,
      message: 'Ocorreu um erro inesperado. Tente novamente em instantes.',
    });
  });

  it('usa mensagem genérica quando não há message/title no corpo', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({}, 418));

    await expect(listLinks()).rejects.toMatchObject({
      status: 418,
      message: 'Não foi possível concluir a operação. Tente novamente.',
    });
  });

  it('falha quando item da lista não é um objeto', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        data: [null],
      }),
    );

    await expect(listLinks()).rejects.toMatchObject({
      status: 500,
      message: 'Ocorreu um erro inesperado. Tente novamente em instantes.',
    });
  });

  it('falha quando resposta da lista não contém array data', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ data: 'não-array' }));

    await expect(listLinks()).rejects.toMatchObject({
      status: 500,
      message: 'Ocorreu um erro inesperado. Tente novamente em instantes.',
    });
  });

  it('falha quando corpo da lista não é um objeto', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse('oops'));

    await expect(listLinks()).rejects.toMatchObject({
      status: 500,
      message: 'Ocorreu um erro inesperado. Tente novamente em instantes.',
    });
  });

  it('falha quando createLink retorna payload incompleto', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ id: '1' }, 200));

    await expect(createLink({ originalUrl: 'https://example.com' })).rejects.toMatchObject({
      status: 500,
      message: 'Ocorreu um erro inesperado. Tente novamente em instantes.',
    });
  });

  it('falha quando clicks não é número na listagem', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        data: [
          {
            id: '1',
            originalUrl: 'https://example.com',
            shortCode: 'abc123',
            shortUrl: 'https://k.tt/abc123',
            clicks: '7',
            isActive: true,
            createdAt: '2026-01-01T10:00:00.000Z',
            updatedAt: '2026-01-01T10:00:00.000Z',
            expiresAt: null,
            deletedAt: null,
          },
        ],
      }),
    );

    await expect(listLinks()).rejects.toMatchObject({
      status: 500,
      message: 'Ocorreu um erro inesperado. Tente novamente em instantes.',
    });
  });

  it('falha quando updateLink retorna erro HTTP', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ message: 'Falhou' }, 400));

    await expect(updateLink('abc', { originalUrl: 'https://example.com' })).rejects.toMatchObject({
      status: 400,
      message: 'Falhou',
    });
  });
});
