import { ROUTES } from '../constants/routes';

import { ROUTE_CODE_ENTRIES, resolveRouteCode } from './routeCodes';

describe('routeCodes', () => {
  it('resolve /home para KURTTO_V1_HOME', () => {
    expect(resolveRouteCode(ROUTES.HOME)).toBe('KURTTO_V1_HOME');
  });

  it('resolve /links para KURTTO_V1_URLS_HOME', () => {
    expect(resolveRouteCode(ROUTES.LINKS)).toBe('KURTTO_V1_URLS_HOME');
  });

  it('resolve subpaths de /links para o code de listagem', () => {
    expect(resolveRouteCode('/links/abc-123')).toBe('KURTTO_V1_URLS_HOME');
  });

  it('retorna null para rota pública /login', () => {
    expect(resolveRouteCode(ROUTES.LOGIN)).toBeNull();
  });

  it('retorna null para a rota pública de 403', () => {
    expect(resolveRouteCode(ROUTES.FORBIDDEN)).toBeNull();
  });

  it('retorna null para path raiz', () => {
    expect(resolveRouteCode('/')).toBeNull();
  });

  it('retorna null para path inexistente', () => {
    expect(resolveRouteCode('/qualquer-coisa')).toBeNull();
  });

  it('todas as entries têm routeCode com prefixo KURTTO_V1_', () => {
    for (const entry of ROUTE_CODE_ENTRIES) {
      expect(entry.routeCode).toMatch(/^KURTTO_V1_/);
    }
  });
});
