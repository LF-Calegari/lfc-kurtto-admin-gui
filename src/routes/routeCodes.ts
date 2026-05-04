import { matchPath } from 'react-router-dom';

/**
 * Mapeamento `path → routeCode` mantido no frontend (Issue #58 / contrato
 * `lfc-authenticator#148`).
 *
 * Cada entrada pareia o `path` declarado em `src/App.tsx` com o
 * `routeCode` correspondente esperado pelo `lfc-authenticator` no header
 * `X-Route-Code` do `verify-token`.
 *
 * Decisão: preferimos uma tabela local em vez de um endpoint extra
 * (`GET /auth/route-codes`) por dois motivos:
 *
 * 1. O backend já entrega os `routeCodes` autorizados em
 *    `GET /auth/permissions` no boot/login — gating client-side já tem
 *    o catálogo. A tabela aqui apenas resolve `pathname → routeCode`
 *    para popular o header em cada navegação privada.
 * 2. Latência: cada navegação privada já dispara um `verify-token`;
 *    consultar antes um `/auth/route-codes` dobraria as requisições.
 *
 * Limitação: a tabela duplica conhecimento que vive no backend
 * (`auth-service` registra os codes via seeder/admin). Mudança de
 * `routeCode` no backend exige PR aqui também. O teste
 * `routeCodes.test.ts` cobre apenas resolução de pathnames conhecidos,
 * fallback `null` para públicas/desconhecidas e o prefixo `KURTTO_V1_`
 * nas entries existentes — ele **não** faz cross-check contra
 * `App.tsx`/`AppRoutes`, então uma rota privada nova sem mapeamento
 * aqui só cai em runtime (header `X-Route-Code` ausente → `verify-token`
 * 400 → fallback de tolerância). Adicionar paridade automatizada é
 * trabalho futuro.
 *
 * Páginas públicas (`/login`, `/error/403`, fallback `*` 404) **não**
 * entram aqui — `ProtectedRoute` é o único call site, e o guard só
 * roda em subárvores privadas.
 */
interface RouteCodeEntry {
  /** `path` exatamente como declarado no `<Route>` (suporta params). */
  pattern: string;
  /** Code esperado pelo backend no header `X-Route-Code`. */
  routeCode: string;
}

/**
 * Tabela de rotas privadas conhecidas. Ordem importa: padrões mais
 * específicos primeiro para que `matchPath({ end: false })` resolva
 * sub-rotas antes de cair em rotas genéricas (futuras adições).
 *
 * Convenção de naming: prefixo `KURTTO_V1_*` para alinhar com os codes
 * já cadastrados no `lfc-authenticator` para o sistema kurtto
 * (`KURTTO_V1_URLS_PATCH_RESTORE`, `KURTTO_V1_URLS_LIST_INCLUDE_DELETED`,
 * `KURTTO_V1_URLS_GET_BY_CODE_INCLUDE_DELETED`).
 *
 * Os codes `KURTTO_V1_HOME` e `KURTTO_V1_URLS_HOME` precisam estar
 * registrados no sistema kurtto no `lfc-authenticator` e o usuário
 * precisa ter permissão neles — caso contrário `verify-token` retorna
 * 403 e o `ProtectedRoute` redireciona para `/error/403`.
 */
const ROUTE_CODES: ReadonlyArray<RouteCodeEntry> = [
  { pattern: '/home', routeCode: 'KURTTO_V1_HOME' },
  { pattern: '/links', routeCode: 'KURTTO_V1_URLS_HOME' },
];

/**
 * Resolve o `routeCode` para um pathname concreto.
 *
 * - Retorna o code mapeado quando o pathname casa com algum `pattern`.
 * - Retorna `null` quando o pathname não corresponde a nenhuma rota
 *   privada conhecida (ex.: `/`, `/login`, `/error/403`, rota
 *   inexistente). O caller (`ProtectedRoute`) trata `null` como "não
 *   chamar `verify-token`" — o backend rejeitaria com 400
 *   `"Header X-Route-Code é obrigatório."`, e nada se ganharia em
 *   chamar.
 *
 * Uso de `matchPath` garante consistência com o roteador. `end: false`
 * aceita subpaths — útil para que sub-rotas futuras (ex.: `/links/:id`)
 * caiam no code de "list" enquanto não houver entry mais específica.
 */
export function resolveRouteCode(pathname: string): string | null {
  for (const entry of ROUTE_CODES) {
    if (matchPath({ path: entry.pattern, end: false }, pathname)) {
      return entry.routeCode;
    }
  }
  return null;
}

/**
 * Exposto para testes que precisam iterar sobre todas as entradas
 * mapeadas (ex.: garantir que toda rota privada do `AppRoutes` está
 * coberta). Não tem outro call site além do teste de sanidade.
 */
export const ROUTE_CODE_ENTRIES = ROUTE_CODES;
