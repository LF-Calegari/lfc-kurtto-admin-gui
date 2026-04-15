import { AUTH_SESSION_STORAGE_KEY } from '../constants/storageKeys';

import { createLink, deleteLink, listLinks, updateLink } from './linkService';

function jsonResponse(body: unknown, status = 200): Response {
  const ok = status >= 200 && status < 300;
  const payload = JSON.stringify(body);
  return {
    ok,
    status,
    text: async () => payload,
  } as Response;
}

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
      }),
    );
    global.fetch = fetchMock;

    const result = await listLinks();

    expect(result.data).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith('http://kurtto-api.test/urls', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
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

    expect(fetchMock).toHaveBeenCalledWith('http://kurtto-api.test/urls', {
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

    expect(fetchMock).toHaveBeenCalledWith('http://kurtto-api.test/urls/abc123', {
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
      message: 'Não foi possível concluir a operação. Tente novamente.',
    });
  });
});
