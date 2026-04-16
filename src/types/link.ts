export interface LinkItem {
  id: string;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  clicks: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  deletedAt: string | null;
}

export interface ListLinksMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface ListLinksResponse {
  data: LinkItem[];
  meta: ListLinksMeta;
}

/**
 * Parâmetros opcionais de `GET /api/v1/urls` (kurtto-api).
 * Filtros avançados seguem a convenção `campo__operador` em snake_case na query string.
 */
export interface ListLinksParams {
  page?: number;
  limit?: number;
  /** Busca textual (código, URL original e URL curta) — mantido para compatibilidade com a API atual. */
  q?: string;
  active?: boolean;
  include_deleted?: boolean;
  id__eq?: string;
  original_url__eq?: string;
  original_url__like?: string;
  short_code__eq?: string;
  short_code__like?: string;
  clicks__eq?: number;
  clicks__lt?: number;
  clicks__gt?: number;
  clicks__gte?: number;
  clicks__lte?: number;
  /** Par `min,max` conforme contrato da API. */
  clicks__between?: string;
  created_at__eq?: string;
  created_at__lt?: string;
  created_at__gt?: string;
  created_at__between?: string;
  deleted_at__lt?: string;
  deleted_at__gt?: string;
  deleted_at__between?: string;
}

export interface CreateLinkPayload {
  originalUrl: string;
  customCode?: string;
}

export interface UpdateLinkPayload {
  originalUrl: string;
}
