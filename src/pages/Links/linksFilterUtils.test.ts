import {
  buildAppliedListParams,
  buildFilterChips,
  countActiveFilters,
  INITIAL_ADVANCED_FILTER,
} from './linksFilterUtils';

describe('linksFilterUtils', () => {
  describe('buildAppliedListParams', () => {
    it('retorna objeto vazio quando não há filtros', () => {
      expect(buildAppliedListParams('', INITIAL_ADVANCED_FILTER)).toEqual({});
    });

    it('inclui apenas q quando há busca rápida', () => {
      expect(buildAppliedListParams('  termo  ', INITIAL_ADVANCED_FILTER)).toEqual({ q: '  termo  ' });
    });

    it('combina q e filtros avançados', () => {
      const params = buildAppliedListParams('termo', {
        ...INITIAL_ADVANCED_FILTER,
        shortCode: 'abc',
        shortCodeOp: 'eq',
        active: 'true',
      });
      expect(params.q).toBe('termo');
      expect(params.short_code__eq).toBe('abc');
      expect(params.active).toBe(true);
    });

    it('aplica id__eq quando ID preenchido', () => {
      const params = buildAppliedListParams('', {
        ...INITIAL_ADVANCED_FILTER,
        idEq: '  uuid-aqui  ',
      });
      expect(params.id__eq).toBe('uuid-aqui');
    });

    it('aplica short_code__like', () => {
      const params = buildAppliedListParams('', {
        ...INITIAL_ADVANCED_FILTER,
        shortCode: 'promo',
        shortCodeOp: 'like',
      });
      expect(params.short_code__like).toBe('promo');
      expect(params.short_code__eq).toBeUndefined();
    });

    it('não envia código curto quando operador é none', () => {
      const params = buildAppliedListParams('', {
        ...INITIAL_ADVANCED_FILTER,
        shortCode: 'x',
        shortCodeOp: 'none',
      });
      expect(params.short_code__eq).toBeUndefined();
      expect(params.short_code__like).toBeUndefined();
    });

    it('aplica original_url__eq e original_url__like', () => {
      const eq = buildAppliedListParams('', {
        ...INITIAL_ADVANCED_FILTER,
        originalUrl: 'https://a.com',
        originalUrlOp: 'eq',
      });
      expect(eq.original_url__eq).toBe('https://a.com');

      const like = buildAppliedListParams('', {
        ...INITIAL_ADVANCED_FILTER,
        originalUrl: 'b',
        originalUrlOp: 'like',
      });
      expect(like.original_url__like).toBe('b');
    });

    it('aplica cliques eq, lt e gt', () => {
      expect(
        buildAppliedListParams('', {
          ...INITIAL_ADVANCED_FILTER,
          clicksOp: 'eq',
          clicksValue: '10',
        }).clicks__eq,
      ).toBe(10);

      expect(
        buildAppliedListParams('', {
          ...INITIAL_ADVANCED_FILTER,
          clicksOp: 'lt',
          clicksValue: '5',
        }).clicks__lt,
      ).toBe(5);

      expect(
        buildAppliedListParams('', {
          ...INITIAL_ADVANCED_FILTER,
          clicksOp: 'gt',
          clicksValue: '3',
        }).clicks__gt,
      ).toBe(3);
    });

    it('aplica cliques entre com limites ordenados', () => {
      const params = buildAppliedListParams('', {
        ...INITIAL_ADVANCED_FILTER,
        clicksOp: 'between',
        clicksValue: '20',
        clicksValueEnd: '10',
      });
      expect(params.clicks__between).toBe('10,20');
    });

    it('não define cliques entre se algum valor não for inteiro válido', () => {
      const params = buildAppliedListParams('', {
        ...INITIAL_ADVANCED_FILTER,
        clicksOp: 'between',
        clicksValue: '',
        clicksValueEnd: '5',
      });
      expect(params.clicks__between).toBeUndefined();
    });

    it('aplica intervalo de criação (gt, lt e between)', () => {
      const from = '2026-01-10T08:00';
      const to = '2026-01-20T18:00';

      const onlyFrom = buildAppliedListParams('', {
        ...INITIAL_ADVANCED_FILTER,
        createdFrom: from,
        createdTo: '',
      });
      expect(onlyFrom.created_at__gt).toMatch(/^2026-01-10/);
      expect(onlyFrom.created_at__lt).toBeUndefined();

      const onlyTo = buildAppliedListParams('', {
        ...INITIAL_ADVANCED_FILTER,
        createdFrom: '',
        createdTo: to,
      });
      expect(onlyTo.created_at__lt).toMatch(/^2026-01-20/);

      const between = buildAppliedListParams('', {
        ...INITIAL_ADVANCED_FILTER,
        createdFrom: from,
        createdTo: to,
      });
      expect(between.created_at__between).toMatch(/^2026-01-10/);
      expect(between.created_at__between).toContain(',');
    });

    it('aplica filtros de deleted_at quando includeDeleted', () => {
      const from = '2026-02-01T10:00';
      const to = '2026-02-02T10:00';
      const params = buildAppliedListParams('', {
        ...INITIAL_ADVANCED_FILTER,
        includeDeleted: true,
        deletedFrom: from,
        deletedTo: to,
      });
      expect(params.include_deleted).toBe(true);
      expect(params.deleted_at__between).toBeDefined();
    });

    it('aplica deleted_at__gt ou __lt isolados com includeDeleted', () => {
      const from = '2026-03-01T12:00';
      const p1 = buildAppliedListParams('', {
        ...INITIAL_ADVANCED_FILTER,
        includeDeleted: true,
        deletedFrom: from,
        deletedTo: '',
      });
      expect(p1.deleted_at__gt).toBeDefined();

      const p2 = buildAppliedListParams('', {
        ...INITIAL_ADVANCED_FILTER,
        includeDeleted: true,
        deletedFrom: '',
        deletedTo: from,
      });
      expect(p2.deleted_at__lt).toBeDefined();
    });

    it('não envia deleted_at sem includeDeleted', () => {
      const params = buildAppliedListParams('', {
        ...INITIAL_ADVANCED_FILTER,
        includeDeleted: false,
        deletedFrom: '2026-01-01T00:00',
        deletedTo: '2026-01-02T00:00',
      });
      expect(params.deleted_at__between).toBeUndefined();
    });

    it('aplica active false', () => {
      const params = buildAppliedListParams('', {
        ...INITIAL_ADVANCED_FILTER,
        active: 'false',
      });
      expect(params.active).toBe(false);
    });

    it('define include_deleted apenas quando marcado', () => {
      expect(
        buildAppliedListParams('', { ...INITIAL_ADVANCED_FILTER, includeDeleted: false }).include_deleted,
      ).toBeUndefined();
      expect(
        buildAppliedListParams('', { ...INITIAL_ADVANCED_FILTER, includeDeleted: true }).include_deleted,
      ).toBe(true);
    });
  });

  describe('buildFilterChips e countActiveFilters', () => {
    it('lista rótulos para parâmetros aplicados', () => {
      const chips = buildFilterChips({
        q: 'x',
        short_code__like: 'promo',
      });
      expect(chips.map((c) => c.label)).toEqual(
        expect.arrayContaining([expect.stringContaining('Busca: x'), expect.stringContaining('Código (contém)')]),
      );
      expect(countActiveFilters({ q: 'x', short_code__like: 'promo' })).toBe(2);
    });

    it('ignora strings vazias ou só espaços', () => {
      expect(buildFilterChips({ q: '   ' })).toHaveLength(0);
    });

    it('gera chips para todos os tipos de parâmetro suportados', () => {
      const chips = buildFilterChips({
        q: 'busca',
        id__eq: 'id-1',
        short_code__eq: 'ab',
        short_code__like: 'cd',
        original_url__eq: 'https://e.com',
        original_url__like: 'f',
        clicks__eq: 1,
        clicks__lt: 2,
        clicks__gt: 3,
        clicks__between: '1,9',
        created_at__gt: 'a',
        created_at__lt: 'b',
        created_at__between: 'c,d',
        deleted_at__gt: 'e',
        deleted_at__lt: 'f',
        deleted_at__between: 'g,h',
        active: true,
        include_deleted: true,
      });
      const labels = chips.map((c) => c.label);
      expect(labels.some((l) => l.includes('Busca:'))).toBe(true);
      expect(labels.some((l) => l.startsWith('ID:'))).toBe(true);
      expect(labels.some((l) => l.includes('Código (igual)'))).toBe(true);
      expect(labels.some((l) => l.includes('Código (contém)'))).toBe(true);
      expect(labels.some((l) => l.includes('URL (igual)'))).toBe(true);
      expect(labels.some((l) => l.includes('URL (contém)'))).toBe(true);
      expect(labels.some((l) => l.includes('Cliques ='))).toBe(true);
      expect(labels.some((l) => l.includes('Cliques <'))).toBe(true);
      expect(labels.some((l) => l.includes('Cliques >'))).toBe(true);
      expect(labels.some((l) => l.includes('Cliques entre:'))).toBe(true);
      expect(labels.some((l) => l.includes('Criado após:'))).toBe(true);
      expect(labels.some((l) => l.includes('Criado antes:'))).toBe(true);
      expect(labels.some((l) => l.includes('Criado entre:'))).toBe(true);
      expect(labels.some((l) => l.includes('Excluído após:'))).toBe(true);
      expect(labels.some((l) => l.includes('Excluído antes:'))).toBe(true);
      expect(labels.some((l) => l.includes('Excluído entre:'))).toBe(true);
      expect(labels).toContain('Somente ativos');
      expect(labels).toContain('Incluir excluídos');
      expect(countActiveFilters({
        q: 'busca',
        id__eq: 'id-1',
        short_code__eq: 'ab',
        short_code__like: 'cd',
        original_url__eq: 'https://e.com',
        original_url__like: 'f',
        clicks__eq: 1,
        clicks__lt: 2,
        clicks__gt: 3,
        clicks__between: '1,9',
        created_at__gt: 'a',
        created_at__lt: 'b',
        created_at__between: 'c,d',
        deleted_at__gt: 'e',
        deleted_at__lt: 'f',
        deleted_at__between: 'g,h',
        active: true,
        include_deleted: true,
      })).toBe(chips.length);
    });

    it('chip de ativos inativos mutuamente exclusivos no objeto', () => {
      const inactive = buildFilterChips({ active: false });
      expect(inactive.map((c) => c.label)).toContain('Somente inativos');
    });

    it('não inclui clicks__between vazio', () => {
      expect(buildFilterChips({ clicks__between: '  ' })).toHaveLength(0);
    });
  });
});
