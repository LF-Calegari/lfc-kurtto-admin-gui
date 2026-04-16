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

/** Parâmetros opcionais de `GET /api/v1/urls` (kurtto-api). */
export interface ListLinksParams {
  page?: number;
  limit?: number;
  q?: string;
  active?: boolean;
  include_deleted?: boolean;
}

export interface CreateLinkPayload {
  originalUrl: string;
  customCode?: string;
}

export interface UpdateLinkPayload {
  originalUrl: string;
}
