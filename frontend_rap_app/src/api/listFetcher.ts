// src/api/listFetcher.ts
import { http, toApiError } from "./httpClient";
import type { QueryParams } from "./httpClient";

/**
 * Nettoie les filtres : retire les valeurs vides, normalise les chaînes.
 * Garde: string non vide, number fini (y compris 0), boolean, tableaux de scalaires.
 */
function pruneFilters(params?: QueryParams): QueryParams {
  const out: QueryParams = {};
  if (!params) return out;

  const isFiniteNumber = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

  const keepScalar = (x: unknown): boolean => {
    if (x === null || x === undefined) return false;
    if (typeof x === "string") return x.trim().length > 0;
    if (typeof x === "number") return isFiniteNumber(x);
    if (typeof x === "boolean") return true;
    return false;
  };

  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) {
      const cleaned = (v as unknown[])
        .filter(keepScalar)
        .map((x) => (typeof x === "string" ? x.trim() : x));
      if (cleaned.length === 0) continue;
      out[k] = cleaned as (typeof out)[string];
      continue;
    }

    if (!keepScalar(v)) continue;

    out[k] =
      typeof v === "string"
        ? ((v as string).trim() as (typeof out)[string])
        : (v as (typeof out)[string]);
  }

  return out;
}

/**
 * Normalise la page DRF :
 * - {count, results}
 * - {data: {count, results}} (cas axios brut)
 * - tableau simple => {count: len, results: array}
 */
function normalizeDrfPage<T>(raw: unknown): { count: number; results: T[] } {
  const pick = (o: unknown) => {
    if (o && typeof o === "object") {
      const obj = o as Record<string, unknown>;
      if ("count" in obj && "results" in obj) {
        return {
          count: Number((obj.count as unknown) ?? 0) || 0,
          results: Array.isArray(obj.results) ? (obj.results as T[]) : [],
        };
      }
    }
    return null;
  };

  const direct = pick(raw);
  if (direct) return direct;

  if (raw && typeof raw === "object" && "data" in (raw as Record<string, unknown>)) {
    const inner = (raw as Record<string, unknown>).data;
    const nested = pick(inner);
    if (nested) return nested;
  }

  if (Array.isArray(raw)) return { count: raw.length, results: raw as T[] };
  return { count: 0, results: [] };
}

export type ListQuery = {
  page: number;
  pageSize: number;
  /** DRF SearchFilter attend ?search=... */
  search?: string;
  /** Clé d'ordering DRF (ex: "formation__nom") */
  sortKey?: string;
  /** true => asc, false => desc */
  sortAsc?: boolean;
  /** Filtres additionnels (transmis tels quels à l'API après prune) */
  filters?: QueryParams;
  /** AbortController.signal pour annuler la requête en cours */
  signal?: AbortSignal;
};

export type ListResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ListFetcher<T> = (q: ListQuery) => Promise<ListResult<T>>;

/**
 * Normalise l'endpoint pour éviter les doublons de préfixe API.
 * - Si l'endpoint commence par "/api/", on supprime ce préfixe (ex: "/api/candidats/" → "/candidats/").
 * - On force un "/" initial.
 * - On laisse intact les URL absolues ("http://", "https://").
 * Ce nettoyage est *idempotent* et ne casse pas Appairages (qui passe "/appairages/").
 */
function normalizeEndpoint(ep: string): string {
  const trimmed = (ep ?? "").trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed; // URL absolue: ne rien toucher

  let out = trimmed;
  if (!out.startsWith("/")) out = "/" + out;

  // retire un éventuel préfixe /api/ en double si le httpClient a déjà baseURL="/api/"
  if (/^\/api(\/|$)/i.test(out)) {
    // "/api/candidats/" -> "/candidats/"
    out = out.replace(/^\/api(\/|$)/i, "/");
  }

  // compact les "//" accidentels
  out = out.replace(/\/{2,}/g, "/");

  return out;
}

/**
 * Fetcher DRF générique : page/page_size, search, ordering, filters.
 * IMPORTANT: le paramètre de recherche s'appelle "search" (DRF SearchFilter).
 */
export function createDrfListFetcher<T>(endpoint: string): ListFetcher<T> {
  const normalizedEndpoint = normalizeEndpoint(endpoint);
  if (endpoint !== normalizedEndpoint && import.meta.env.MODE !== "production") {
    // Aide au debug en dev si quelqu’un passe "/api/..." par erreur
  }

  return async ({
    page,
    pageSize,
    search,
    sortKey,
    sortAsc = true,
    filters,
    signal,
  }: ListQuery) => {
    const cleaned = pruneFilters(filters);
    const trimmedSearch = typeof search === "string" ? search.trim() : undefined;

    const params: QueryParams = {
      page,
      page_size: pageSize,
      // DRF SearchFilter => "search"
      ...(trimmedSearch ? { search: trimmedSearch } : {}),
      ...cleaned,
    };

    // DRF OrderingFilter => "ordering"
    if (sortKey && sortKey.trim()) {
      params.ordering = sortAsc ? sortKey : `-${sortKey}`;
    }

    try {
      const raw = await http.get<unknown>(normalizedEndpoint, params, signal);
      const pageData = normalizeDrfPage<T>(raw);
      const total = pageData.count ?? 0;

      return {
        items: pageData.results ?? [],
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil((total || 1) / pageSize)),
      };
    } catch (e) {
      // Laisse la couche appelante gérer l'affichage d'erreur
      throw toApiError(e);
    }
  };
}
