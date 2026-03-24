// -----------------------------------------------------------------------------
// 🧩 Hooks Déclic — Liste, Détail, Objectifs, Stats, Export
// -----------------------------------------------------------------------------
import { useEffect, useState } from "react";
import api from "src/api/axios";
import axios, { AxiosError } from "axios";
import type { Choice, Declic, DeclicStats } from "src/types/declic";
import { toast } from "react-toastify";
import { useQuery } from "@tanstack/react-query";

// ────────────────────────────────────────────────────────────────
// ⚙️ Debug utils
// ────────────────────────────────────────────────────────────────
const dbg = (..._args: unknown[]) => {};

// ────────────────────────────────────────────────────────────────
// 🔍 Helpers
// ────────────────────────────────────────────────────────────────
const isAbort = (e: unknown) =>
  (e instanceof DOMException && e.name === "AbortError") ||
  (axios.isAxiosError(e) && e.code === "ERR_CANCELED");
const isAxiosErr = (e: unknown): e is AxiosError<unknown> =>
  typeof axios.isAxiosError === "function" && axios.isAxiosError(e);

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const hasArrayProp = (o: Record<string, unknown>, k: string) => Array.isArray(o[k]);

function unwrapApiData<T>(payload: unknown): T | null {
  if (isObject(payload) && "data" in payload) {
    return (payload.data as T) ?? null;
  }
  return (payload as T) ?? null;
}

function extractApiErrorMessage(error: unknown): string | null {
  if (!isAxiosErr(error)) return null;

  const data = error.response?.data;
  if (!isObject(data)) return error.message ?? null;

  const message = data.message;
  if (typeof message === "string" && message.trim()) {
    return message;
  }

  const errors = isObject(data.errors) ? data.errors : data;
  const parts: string[] = [];
  for (const [field, value] of Object.entries(errors)) {
    if (typeof value === "string" && value.trim()) {
      parts.push(`${field}: ${value}`);
      continue;
    }
    if (Array.isArray(value)) {
      const strings = value.filter((item): item is string => typeof item === "string");
      if (strings.length) {
        parts.push(`${field}: ${strings.join(" · ")}`);
      }
    }
  }

  return parts.length ? parts.join(" | ") : (error.message ?? null);
}

// ────────────────────────────────────────────────────────────────
// 🧩 Normalisation API (pagination, results, etc.)
// ────────────────────────────────────────────────────────────────
function normalizeListResponse<T>(payload: unknown): {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
} {
  if (Array.isArray(payload)) {
    return { count: payload.length, next: null, previous: null, results: payload as T[] };
  }

  if (isObject(payload)) {
    if (hasArrayProp(payload, "results")) {
      const results = payload["results"] as T[];
      return {
        count: (payload["count"] as number) ?? results.length,
        next: (payload["next"] as string) ?? null,
        previous: (payload["previous"] as string) ?? null,
        results,
      };
    }
    if (hasArrayProp(payload, "data")) {
      const arr = payload["data"] as T[];
      return { count: arr.length, next: null, previous: null, results: arr };
    }
    if (isObject(payload["data"]) && hasArrayProp(payload["data"], "results")) {
      const inner = payload["data"] as Record<string, unknown>;
      const results = inner["results"] as T[];
      return {
        count: (inner["count"] as number) ?? results.length,
        next: (inner["next"] as string) ?? null,
        previous: (inner["previous"] as string) ?? null,
        results,
      };
    }
  }

  return { count: 0, next: null, previous: null, results: [] };
}

// ────────────────────────────────────────────────────────────────
// 🎯 useDeclicList — liste filtrée/paginée des séances Déclic
// ────────────────────────────────────────────────────────────────
export interface DeclicFilters {
  annee?: number;
  centre?: number;
  type_declic?: string;
  departement?: string;
  date_min?: string;
  date_max?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

export function useDeclicList(filters: Partial<DeclicFilters> = {}) {
  const [data, setData] = useState<{ count: number; results: Declic[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    (async () => {
      try {
        dbg("Fetching Déclic list", filters);
        const res = await api.get<unknown>("/declic/", {
          params: filters,
          signal: ctrl.signal,
        });
        const normalized = normalizeListResponse<Declic>(res.data);
        setData({ count: normalized.count, results: normalized.results });
        dbg("Déclic list loaded", normalized.count);
      } catch (e) {
        if (isAbort(e)) return dbg("Déclic fetch aborted");
        if (isAxiosErr(e)) dbg("Déclic list error", e.message, e.response?.status);
        setError(new Error(extractApiErrorMessage(e) ?? "Erreur lors du chargement des séances Déclic."));
      } finally {
        setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [filters]);

  return { data, loading, error };
}

// ────────────────────────────────────────────────────────────────
// 📘 useDeclicDetail — détail d’une séance
// ────────────────────────────────────────────────────────────────
export function useDeclicDetail(id: number | null) {
  const [data, setData] = useState<Declic | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) return setLoading(false);
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await api.get<Declic>(`/declic/${id}/`, { signal: ctrl.signal });
        setData(res.data);
      } catch (e) {
        if (!isAbort(e)) setError(e as Error);
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [id]);

  return { data, loading, error };
}

// ────────────────────────────────────────────────────────────────
// 🧱 CRUD hooks (Déclic)
// ────────────────────────────────────────────────────────────────
export function useCreateDeclic() {
  const create = async (data: Partial<Declic>) => {
    dbg("createDeclic", data);
    const r = await api.post<Declic>("/declic/", data);
    return r.data;
  };
  return { create };
}

export function useUpdateDeclic() {
  const update = async (id: number, data: Partial<Declic>) => {
    dbg("updateDeclic", { id, data });
    const r = await api.patch<Declic>(`/declic/${id}/`, data);
    return r.data;
  };
  return { update };
}

export function useDeleteDeclic() {
  const remove = async (id: number) => {
    dbg("deleteDeclic", { id });
    await api.delete(`/declic/${id}/`);
  };
  return { remove };
}

// ────────────────────────────────────────────────────────────────
// 📊 useDeclicStats — statistiques globales
// ────────────────────────────────────────────────────────────────

export function useDeclicStats(annee?: number) {
  const [data, setData] = useState<DeclicStats>({
    centres: {},
    departements: {},
    resteAFaire: null,
    loading: true,
  });

  useEffect(() => {
    const ctrl = new AbortController();

    (async () => {
      try {
        const [centresRes, depsRes, resteRes] = await Promise.all([
          api.get("/declic/stats-centres/", { params: { annee }, signal: ctrl.signal }),
          api.get("/declic/stats-departements/", { params: { annee }, signal: ctrl.signal }),
          api.get("/declic/reste-a-faire-total/", { params: { annee }, signal: ctrl.signal }),
        ]);

        setData({
          centres: centresRes.data ?? {},
          departements: depsRes.data ?? {},
          resteAFaire: resteRes.data ?? null,
          loading: false,
        });
      } catch (e) {
        if (!isAbort(e)) {
          toast.error("Erreur lors du chargement des statistiques Déclic.");
        }
        setData((d) => ({ ...d, loading: false }));
      }
    })();

    return () => ctrl.abort();
  }, [annee]);

  return data;
}

// ────────────────────────────────────────────────────────────────
// 📤 Export Excel (.xlsx)
// ────────────────────────────────────────────────────────────────
export function useExportDeclic() {
  const exportXlsx = async (params?: Partial<DeclicFilters>) => {
    const res = await api.get<Blob>("/declic/export-xlsx/", {
      params,
      responseType: "blob",
    });

    const disposition = res.headers["content-disposition"];
    let filename = "declic_export.xlsx";
    if (disposition) {
      const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
      if (match && match[1]) {
        filename = decodeURIComponent(match[1].replace(/['"]/g, ""));
      }
    }

    const blob = new Blob([res.data], {
      type:
        res.headers["content-type"] ||
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const link = document.createElement("a");
    const url = window.URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  return { exportXlsx };
}

// ────────────────────────────────────────────────────────────────
// 🧩 useDeclicMeta — métadonnées (choices, centres, etc.)
// ────────────────────────────────────────────────────────────────
export function useDeclicMeta() {
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await api.get("/declic/filters/", { signal: ctrl.signal });
        const payload = unwrapApiData<Record<string, unknown>>(res.data) ?? {};
        const normalized = {
          type_declic_choices: Array.isArray(payload.type_declic) ? payload.type_declic : [],
          centre_choices: Array.isArray(payload.centres) ? payload.centres : [],
          annees: Array.isArray(payload.annees) ? payload.annees : [],
          departements: Array.isArray(payload.departements) ? payload.departements : [],
        };
        setMeta(normalized);
        dbg("useDeclicMeta.success", Object.keys(normalized));
      } catch (e) {
        if (!isAbort(e)) {
          dbg("useDeclicMeta.error", e);
          setError(e as Error);
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, []);

  return { meta, loading, error };
}

export interface DeclicFiltersOptions {
  annees: number[];
  departements: { value: string; label: string }[];
  centres: {
    value: number;
    label: string;
    departement?: string | null;
    code_postal?: string | null;
  }[];
  type_declic: Choice[];
}

/**
 * Récupère les options disponibles pour les filtres du module Déclic.
 */
export function useDeclicFiltersOptions() {
  return useQuery<DeclicFiltersOptions>({
    queryKey: ["declic-filters-options"],
    queryFn: async () => {
      const res = await api.get("/declic/filters/");
      return unwrapApiData<DeclicFiltersOptions>(res.data) ?? {
        annees: [],
        departements: [],
        centres: [],
        type_declic: [],
      };
    },
    staleTime: 1000 * 60 * 10, // 10 min
  });
}
