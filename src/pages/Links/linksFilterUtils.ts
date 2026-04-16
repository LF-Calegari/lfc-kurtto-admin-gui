import type { ListLinksParams } from '../../types/link';

/** Estado de formulário (rascunho) dos filtros avançados — valores como string para inputs controlados. */
export interface AdvancedFilterDraft {
  idEq: string;
  shortCode: string;
  shortCodeOp: 'none' | 'eq' | 'like';
  originalUrl: string;
  originalUrlOp: 'none' | 'eq' | 'like';
  clicksOp: 'none' | 'eq' | 'lt' | 'gt' | 'between';
  clicksValue: string;
  clicksValueEnd: string;
  createdFrom: string;
  createdTo: string;
  deletedFrom: string;
  deletedTo: string;
  /** '' = todos, 'true' = ativos, 'false' = inativos */
  active: '' | 'true' | 'false';
  includeDeleted: boolean;
}

export const INITIAL_ADVANCED_FILTER: AdvancedFilterDraft = {
  idEq: '',
  shortCode: '',
  shortCodeOp: 'none',
  originalUrl: '',
  originalUrlOp: 'none',
  clicksOp: 'none',
  clicksValue: '',
  clicksValueEnd: '',
  createdFrom: '',
  createdTo: '',
  deletedFrom: '',
  deletedTo: '',
  active: '',
  includeDeleted: false,
};

function trimOrEmpty(value: string): string {
  return value.trim();
}

function parseOptionalInt(raw: string): number | null {
  const t = raw.trim();
  if (t.length === 0) {
    return null;
  }
  const n = Number.parseInt(t, 10);
  if (!Number.isFinite(n)) {
    return null;
  }
  return n;
}

function toIsoFromDatetimeLocal(value: string): string | null {
  const t = value.trim();
  if (t.length === 0) {
    return null;
  }
  const ms = Date.parse(t);
  if (Number.isNaN(ms)) {
    return null;
  }
  return new Date(ms).toISOString();
}

/**
 * Monta o subconjunto de {@link ListLinksParams} correspondente ao texto rápido `q` e aos filtros avançados.
 * Não inclui `page` nem `limit`.
 */
export function buildAppliedListParams(
  quickSearchTrimmed: string,
  advanced: Readonly<AdvancedFilterDraft>,
): ListLinksParams {
  const params: ListLinksParams = {};

  if (quickSearchTrimmed.length > 0) {
    params.q = quickSearchTrimmed;
  }

  const idEq = trimOrEmpty(advanced.idEq);
  if (idEq.length > 0) {
    params.id__eq = idEq;
  }

  const sc = trimOrEmpty(advanced.shortCode);
  if (sc.length > 0) {
    if (advanced.shortCodeOp === 'eq') {
      params.short_code__eq = sc;
    } else if (advanced.shortCodeOp === 'like') {
      params.short_code__like = sc;
    }
  }

  const ou = trimOrEmpty(advanced.originalUrl);
  if (ou.length > 0) {
    if (advanced.originalUrlOp === 'eq') {
      params.original_url__eq = ou;
    } else if (advanced.originalUrlOp === 'like') {
      params.original_url__like = ou;
    }
  }

  if (advanced.clicksOp !== 'none') {
    if (advanced.clicksOp === 'between') {
      const a = parseOptionalInt(advanced.clicksValue);
      const b = parseOptionalInt(advanced.clicksValueEnd);
      if (a !== null && b !== null) {
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        params.clicks__between = `${lo},${hi}`;
      }
    } else {
      const v = parseOptionalInt(advanced.clicksValue);
      if (v !== null) {
        if (advanced.clicksOp === 'eq') {
          params.clicks__eq = v;
        } else if (advanced.clicksOp === 'lt') {
          params.clicks__lt = v;
        } else if (advanced.clicksOp === 'gt') {
          params.clicks__gt = v;
        }
      }
    }
  }

  const createdFromIso = advanced.createdFrom.trim().length > 0 ? toIsoFromDatetimeLocal(advanced.createdFrom) : null;
  const createdToIso = advanced.createdTo.trim().length > 0 ? toIsoFromDatetimeLocal(advanced.createdTo) : null;
  if (createdFromIso && createdToIso) {
    params.created_at__between = `${createdFromIso},${createdToIso}`;
  } else if (createdFromIso) {
    params.created_at__gt = createdFromIso;
  } else if (createdToIso) {
    params.created_at__lt = createdToIso;
  }

  if (advanced.includeDeleted) {
    const df = advanced.deletedFrom.trim().length > 0 ? toIsoFromDatetimeLocal(advanced.deletedFrom) : null;
    const dt = advanced.deletedTo.trim().length > 0 ? toIsoFromDatetimeLocal(advanced.deletedTo) : null;
    if (df && dt) {
      params.deleted_at__between = `${df},${dt}`;
    } else if (df) {
      params.deleted_at__gt = df;
    } else if (dt) {
      params.deleted_at__lt = dt;
    }
  }

  if (advanced.active === 'true') {
    params.active = true;
  } else if (advanced.active === 'false') {
    params.active = false;
  }

  if (advanced.includeDeleted) {
    params.include_deleted = true;
  }

  return params;
}

export interface FilterChip {
  id: string;
  label: string;
}

/** Rótulos curtos para chips de filtros ativos (português). */
export function buildFilterChips(params: Readonly<ListLinksParams>): FilterChip[] {
  const chips: FilterChip[] = [];
  if (params.q !== undefined && params.q.trim().length > 0) {
    chips.push({ id: 'q', label: `Busca: ${params.q.trim()}` });
  }
  if (params.id__eq !== undefined && params.id__eq.trim().length > 0) {
    chips.push({ id: 'id__eq', label: `ID: ${params.id__eq.trim()}` });
  }
  if (params.short_code__eq !== undefined && params.short_code__eq.trim().length > 0) {
    chips.push({ id: 'short_code__eq', label: `Código (igual): ${params.short_code__eq.trim()}` });
  }
  if (params.short_code__like !== undefined && params.short_code__like.trim().length > 0) {
    chips.push({ id: 'short_code__like', label: `Código (contém): ${params.short_code__like.trim()}` });
  }
  if (params.original_url__eq !== undefined && params.original_url__eq.trim().length > 0) {
    chips.push({ id: 'original_url__eq', label: `URL (igual): ${params.original_url__eq.trim()}` });
  }
  if (params.original_url__like !== undefined && params.original_url__like.trim().length > 0) {
    chips.push({ id: 'original_url__like', label: `URL (contém): ${params.original_url__like.trim()}` });
  }
  if (params.clicks__eq !== undefined) {
    chips.push({ id: 'clicks__eq', label: `Cliques = ${params.clicks__eq}` });
  }
  if (params.clicks__lt !== undefined) {
    chips.push({ id: 'clicks__lt', label: `Cliques < ${params.clicks__lt}` });
  }
  if (params.clicks__gt !== undefined) {
    chips.push({ id: 'clicks__gt', label: `Cliques > ${params.clicks__gt}` });
  }
  if (params.clicks__between !== undefined && params.clicks__between.trim().length > 0) {
    chips.push({ id: 'clicks__between', label: `Cliques entre: ${params.clicks__between.trim()}` });
  }
  if (params.created_at__gt !== undefined) {
    chips.push({ id: 'created_at__gt', label: `Criado após: ${params.created_at__gt}` });
  }
  if (params.created_at__lt !== undefined) {
    chips.push({ id: 'created_at__lt', label: `Criado antes: ${params.created_at__lt}` });
  }
  if (params.created_at__between !== undefined && params.created_at__between.trim().length > 0) {
    chips.push({ id: 'created_at__between', label: `Criado entre: ${params.created_at__between.trim()}` });
  }
  if (params.deleted_at__gt !== undefined) {
    chips.push({ id: 'deleted_at__gt', label: `Excluído após: ${params.deleted_at__gt}` });
  }
  if (params.deleted_at__lt !== undefined) {
    chips.push({ id: 'deleted_at__lt', label: `Excluído antes: ${params.deleted_at__lt}` });
  }
  if (params.deleted_at__between !== undefined && params.deleted_at__between.trim().length > 0) {
    chips.push({ id: 'deleted_at__between', label: `Excluído entre: ${params.deleted_at__between.trim()}` });
  }
  if (params.active === true) {
    chips.push({ id: 'active', label: 'Somente ativos' });
  }
  if (params.active === false) {
    chips.push({ id: 'active', label: 'Somente inativos' });
  }
  if (params.include_deleted === true) {
    chips.push({ id: 'include_deleted', label: 'Incluir excluídos' });
  }
  return chips;
}

export function countActiveFilters(params: Readonly<ListLinksParams>): number {
  return buildFilterChips(params).length;
}
