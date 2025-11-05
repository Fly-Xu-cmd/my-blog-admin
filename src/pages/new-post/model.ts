export interface TagResponse {
  ok: boolean;
  data: { id: number; name: string }[];
  total: number;
}

export interface CategoryResponse {
  ok: boolean;
  data: { id: number; name: string }[];
  total: number;
}
