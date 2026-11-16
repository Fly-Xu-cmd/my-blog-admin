export type Taxonomy = { id: number; name: string };
export type ContentSummary = {
  id: number;
  title: string | null;
  slug?: string;
  excerpt: string | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  category?: Taxonomy | null;
  tags?: string[];
  cover?: string | null;
  kind?: 'TECH' | 'ESSAY';
  seriesId?: number | null;
  seriesOrder?: number | null;
};
export type ContentDetail = ContentSummary & { content: string; syncId?: string };
export type Envelope<T> = { ok: boolean; data: T; error?: string; code?: string };
export type ContentList = Envelope<ContentSummary[]> & {
  total: number;
  current: number;
  pageSize: number;
  pages: number;
};
