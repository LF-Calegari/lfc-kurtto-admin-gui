import {
  buildAppliedListParams,
  buildFilterChips,
  countActiveFilters,
  INITIAL_ADVANCED_FILTER,
} from './linksFilterUtils';

describe('linksFilterUtils', () => {
  it('buildAppliedListParams combina q e filtros avançados', () => {
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

  it('buildFilterChips lista rótulos para parâmetros aplicados', () => {
    const chips = buildFilterChips({
      q: 'x',
      short_code__like: 'promo',
    });
    expect(chips.map((c) => c.label)).toEqual(
      expect.arrayContaining([expect.stringContaining('Busca: x'), expect.stringContaining('Código (contém)')]),
    );
    expect(countActiveFilters({ q: 'x', short_code__like: 'promo' })).toBe(2);
  });
});
