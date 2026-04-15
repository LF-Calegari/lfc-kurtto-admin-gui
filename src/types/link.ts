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

export interface ListLinksResponse {
  data: LinkItem[];
}

export interface CreateLinkPayload {
  originalUrl: string;
  customCode?: string;
}

export interface UpdateLinkPayload {
  originalUrl: string;
}
