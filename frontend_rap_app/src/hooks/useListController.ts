// src/hooks/useListController.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ListFetcher, ListResult } from "../api/listFetcher";
import type { QueryParams } from "../api/httpClient";

export type SortState = { key?: string; asc: boolean };

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as Record<string, unknown>).message;
    if (typeof m === "string") return m;
  }
  return "Erreur inconnue";
}

export function useListController<T>(
  fetcher: ListFetcher<T>,
  opts?: {
    initialPageSize?: number;
    initialSort?: SortState;
    debounceMs?: number;
    initialFilters?: QueryParams; // ⬅️ ici
  }
) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(opts?.initialPageSize ?? 10);
  const [sort, setSort] = useState<SortState>(opts?.initialSort ?? { key: undefined, asc: true });
  const [filters, setFilters] = useState<QueryParams>(opts?.initialFilters ?? {}); // ⬅️ ici
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ListResult<T>>({
    items: [],
    total: 0,
    page: 1,
    pageSize,
    totalPages: 1,
  });

  const debounceMs = opts?.debounceMs ?? 300;
  const searchRef = useRef(search);
  const timerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      searchRef.current = search;
      setPage(1);
    }, debounceMs);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [search, debounceMs]);

  const reload = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const res = await fetcher({
        page,
        pageSize,
        search: searchRef.current || undefined,
        sortKey: sort.key,
        sortAsc: sort.asc,
        filters, // ⬅️ typé QueryParams
        signal: controller.signal,
      });
      setData(res);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [fetcher, page, pageSize, sort.key, sort.asc, filters]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const pagination = useMemo(
    () => ({
      page,
      totalPages: data.totalPages,
      count: data.total,
      hasPrev: page > 1,
      hasNext: page < data.totalPages,
      onPrev: () => setPage((p) => Math.max(1, p - 1)),
      onNext: () => setPage((p) => Math.min(data.totalPages, p + 1)),
    }),
    [page, data.totalPages, data.total]
  );

  return {
    items: data.items,
    loading,
    error,
    empty: !loading && data.items.length === 0,
    search: {
      value: search,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value),
    },
    pageSize: {
      value: pageSize,
      onChange: (s: number) => {
        setPageSize(s);
        setPage(1);
      },
      options: [5, 10, 20, 50],
      label: "Taille de page",
    },
    pagination,
    sort,
    setSort,
    filters, // ⬅️ QueryParams
    setFilters, // ⬅️ React.Dispatch<SetStateAction<QueryParams>>
    refresh: reload,
  };
}
