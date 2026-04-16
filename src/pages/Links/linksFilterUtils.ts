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

function applyQuickSearch(params: ListLinksParams, quickSearchTrimmed: string): void {
  if (quickSearchTrimmed.length > 0) {
    params.q = quickSearchTrimmed;
  }
}

function applyIdEqParam(params: ListLinksParams, advanced: Readonly<AdvancedFilterDraft>): void {
  const idEq = trimOrEmpty(advanced.idEq);
  if (idEq.length > 0) {
    params.id__eq = idEq;
  }
}

function applyShortCodeParams(params: ListLinksParams, advanced: Readonly<AdvancedFilterDraft>): void {
  const sc = trimOrEmpty(advanced.shortCode);
  if (sc.length === 0) {
    return;
  }
  if (advanced.shortCodeOp === 'eq') {
    params.short_code__eq = sc;
    return;
  }
  if (advanced.shortCodeOp === 'like') {
    params.short_code__like = sc;
  }
}

function applyOriginalUrlParams(params: ListLinksParams, advanced: Readonly<AdvancedFilterDraft>): void {
  const ou = trimOrEmpty(advanced.originalUrl);
  if (ou.length === 0) {
    return;
  }
  if (advanced.originalUrlOp === 'eq') {
    params.original_url__eq = ou;
    return;
  }
  if (advanced.originalUrlOp === 'like') {
    params.original_url__like = ou;
  }
}

function applyClicksBetween(params: ListLinksParams, advanced: Readonly<AdvancedFilterDraft>): void {
  const a = parseOptionalInt(advanced.clicksValue);
  const b = parseOptionalInt(advanced.clicksValueEnd);
  if (a === null || b === null) {
    return;
  }
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  params.clicks__between = `${lo},${hi}`;
}

function applyClicksSingleOp(params: ListLinksParams, advanced: Readonly<AdvancedFilterDraft>): void {
  const v = parseOptionalInt(advanced.clicksValue);
  if (v === null) {
    return;
  }
  if (advanced.clicksOp === 'eq') {
    params.clicks__eq = v;
    return;
  }
  if (advanced.clicksOp === 'lt') {
    params.clicks__lt = v;
    return;
  }
  if (advanced.clicksOp === 'gt') {
    params.clicks__gt = v;
  }
}

function applyClicksParams(params: ListLinksParams, advanced: Readonly<AdvancedFilterDraft>): void {
  if (advanced.clicksOp === 'none') {
    return;
  }
  if (advanced.clicksOp === 'between') {
    applyClicksBetween(params, advanced);
    return;
  }
  applyClicksSingleOp(params, advanced);
}

function applyCreatedAtParams(params: ListLinksParams, advanced: Readonly<AdvancedFilterDraft>): void {
  const createdFromIso = toIsoFromDatetimeLocal(advanced.createdFrom);
  const createdToIso = toIsoFromDatetimeLocal(advanced.createdTo);
  if (createdFromIso && createdToIso) {
    params.created_at__between = `${createdFromIso},${createdToIso}`;
    return;
  }
  if (createdFromIso) {
    params.created_at__gt = createdFromIso;
    return;
  }
  if (createdToIso) {
    params.created_at__lt = createdToIso;
  }
}

function applyDeletedAtParams(params: ListLinksParams, advanced: Readonly<AdvancedFilterDraft>): void {
  if (!advanced.includeDeleted) {
    return;
  }
  const df = toIsoFromDatetimeLocal(advanced.deletedFrom);
  const dt = toIsoFromDatetimeLocal(advanced.deletedTo);
  if (df && dt) {
    params.deleted_at__between = `${df},${dt}`;
    return;
  }
  if (df) {
    params.deleted_at__gt = df;
    return;
  }
  if (dt) {
    params.deleted_at__lt = dt;
  }
}

function applyActiveParam(params: ListLinksParams, advanced: Readonly<AdvancedFilterDraft>): void {
  if (advanced.active === 'true') {
    params.active = true;
    return;
  }
  if (advanced.active === 'false') {
    params.active = false;
  }
}

function applyIncludeDeletedParam(params: ListLinksParams, advanced: Readonly<AdvancedFilterDraft>): void {
  if (advanced.includeDeleted) {
    params.include_deleted = true;
  }
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
  applyQuickSearch(params, quickSearchTrimmed);
  applyIdEqParam(params, advanced);
  applyShortCodeParams(params, advanced);
  applyOriginalUrlParams(params, advanced);
  applyClicksParams(params, advanced);
  applyCreatedAtParams(params, advanced);
  applyDeletedAtParams(params, advanced);
  applyActiveParam(params, advanced);
  applyIncludeDeletedParam(params, advanced);
  return params;
}

export interface FilterChip {
  id: string;
  label: string;
}

function chipFromTrimmedString(
  id: string,
  value: string | undefined,
  labelWithValue: (trimmed: string) => string,
): FilterChip | null {
  if (value === undefined) {
    return null;
  }
  const t = value.trim();
  if (t.length === 0) {
    return null;
  }
  return { id, label: labelWithValue(t) };
}

function chipClicksEq(params: Readonly<ListLinksParams>): FilterChip | null {
  if (params.clicks__eq === undefined) {
    return null;
  }
  return { id: 'clicks__eq', label: `Cliques = ${params.clicks__eq}` };
}

function chipClicksLt(params: Readonly<ListLinksParams>): FilterChip | null {
  if (params.clicks__lt === undefined) {
    return null;
  }
  return { id: 'clicks__lt', label: `Cliques < ${params.clicks__lt}` };
}

function chipClicksGt(params: Readonly<ListLinksParams>): FilterChip | null {
  if (params.clicks__gt === undefined) {
    return null;
  }
  return { id: 'clicks__gt', label: `Cliques > ${params.clicks__gt}` };
}

function chipClicksBetween(params: Readonly<ListLinksParams>): FilterChip | null {
  if (params.clicks__between === undefined || params.clicks__between.trim().length === 0) {
    return null;
  }
  return { id: 'clicks__between', label: `Cliques entre: ${params.clicks__between.trim()}` };
}

function chipCreatedAtGt(params: Readonly<ListLinksParams>): FilterChip | null {
  if (params.created_at__gt === undefined) {
    return null;
  }
  return { id: 'created_at__gt', label: `Criado após: ${params.created_at__gt}` };
}

function chipCreatedAtLt(params: Readonly<ListLinksParams>): FilterChip | null {
  if (params.created_at__lt === undefined) {
    return null;
  }
  return { id: 'created_at__lt', label: `Criado antes: ${params.created_at__lt}` };
}

function chipCreatedAtBetween(params: Readonly<ListLinksParams>): FilterChip | null {
  if (params.created_at__between === undefined || params.created_at__between.trim().length === 0) {
    return null;
  }
  return { id: 'created_at__between', label: `Criado entre: ${params.created_at__between.trim()}` };
}

function chipDeletedAtGt(params: Readonly<ListLinksParams>): FilterChip | null {
  if (params.deleted_at__gt === undefined) {
    return null;
  }
  return { id: 'deleted_at__gt', label: `Excluído após: ${params.deleted_at__gt}` };
}

function chipDeletedAtLt(params: Readonly<ListLinksParams>): FilterChip | null {
  if (params.deleted_at__lt === undefined) {
    return null;
  }
  return { id: 'deleted_at__lt', label: `Excluído antes: ${params.deleted_at__lt}` };
}

function chipDeletedAtBetween(params: Readonly<ListLinksParams>): FilterChip | null {
  if (params.deleted_at__between === undefined || params.deleted_at__between.trim().length === 0) {
    return null;
  }
  return { id: 'deleted_at__between', label: `Excluído entre: ${params.deleted_at__between.trim()}` };
}

function chipActive(params: Readonly<ListLinksParams>): FilterChip | null {
  if (params.active === true) {
    return { id: 'active', label: 'Somente ativos' };
  }
  if (params.active === false) {
    return { id: 'active', label: 'Somente inativos' };
  }
  return null;
}

function chipIncludeDeleted(params: Readonly<ListLinksParams>): FilterChip | null {
  if (params.include_deleted !== true) {
    return null;
  }
  return { id: 'include_deleted', label: 'Incluir excluídos' };
}

/** Rótulos curtos para chips de filtros ativos (português). */
export function buildFilterChips(params: Readonly<ListLinksParams>): FilterChip[] {
  return [
    chipFromTrimmedString('q', params.q, (t) => `Busca: ${t}`),
    chipFromTrimmedString('id__eq', params.id__eq, (t) => `ID: ${t}`),
    chipFromTrimmedString('short_code__eq', params.short_code__eq, (t) => `Código (igual): ${t}`),
    chipFromTrimmedString('short_code__like', params.short_code__like, (t) => `Código (contém): ${t}`),
    chipFromTrimmedString('original_url__eq', params.original_url__eq, (t) => `URL (igual): ${t}`),
    chipFromTrimmedString('original_url__like', params.original_url__like, (t) => `URL (contém): ${t}`),
    chipClicksEq(params),
    chipClicksLt(params),
    chipClicksGt(params),
    chipClicksBetween(params),
    chipCreatedAtGt(params),
    chipCreatedAtLt(params),
    chipCreatedAtBetween(params),
    chipDeletedAtGt(params),
    chipDeletedAtLt(params),
    chipDeletedAtBetween(params),
    chipActive(params),
    chipIncludeDeleted(params),
  ].filter((c): c is FilterChip => c !== null);
}

export function countActiveFilters(params: Readonly<ListLinksParams>): number {
  return buildFilterChips(params).length;
}
