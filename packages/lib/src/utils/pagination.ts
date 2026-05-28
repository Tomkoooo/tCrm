export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function parsePagination(
  searchParams: URLSearchParams | Record<string, string | undefined>,
  defaults: { page?: number; pageSize?: number } = {}
): PaginationParams {
  const get = (key: string): string | undefined => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key) ?? undefined;
    }
    return searchParams[key];
  };

  const page = Math.max(1, parseInt(get('page') ?? String(defaults.page ?? 1), 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(get('pageSize') ?? String(defaults.pageSize ?? 10), 10) || 10)
  );

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
  };
}

export function buildPaginationMeta(page: number, pageSize: number, total: number): PaginationMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}
