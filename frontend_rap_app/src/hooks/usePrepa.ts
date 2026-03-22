// -----------------------------------------------------------------------------
// 🧩 Hooks Prepa — Liste, Détail, Objectifs, Stats, Export
// -----------------------------------------------------------------------------
import { useEffect, useState } from "react";
import api from "src/api/axios";
import axios from "axios";
import type { Choice, Prepa, PrepaStats } from "src/types/prepa";
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

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const hasArrayProp = (o: Record<string, unknown>, k: string) => Array.isArray(o[k]);

// ────────────────────────────────────────────────────────────────
// 🧩 Normalisation API (pagination, results, etc.)
// ────────────────────────────────────────────────────────────────
function normalizeListResponse<T>(payload: unknown) {
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
// 🎯 usePrepaList — liste filtrée/paginée des séances Prépa
// ────────────────────────────────────────────────────────────────
export interface PrepaFilters {
  annee?: number;
  centre?: number;
  type_prepa?: string | string[];
  page?: number;
  page_size?: number;
  ordering?: string;
}

export function usePrepaList(filters: Partial<PrepaFilters> = {}) {
  const [data, setData] = useState<{ count: number; results: Prepa[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    (async () => {
      try {
        dbg("Fetching Prepa list", filters);
        const res = await api.get("/prepa/", {
          params: filters,
          signal: ctrl.signal,
        });

        const normalized = normalizeListResponse<Prepa>(res.data);
        setData({ count: normalized.count, results: normalized.results });
      } catch (e) {
        if (isAbort(e)) return;
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [filters]);

  return { data, loading, error };
}

// ────────────────────────────────────────────────────────────────
// 📘 usePrepaDetail — détail d’une séance Prépa
// ────────────────────────────────────────────────────────────────
export function usePrepaDetail(id: number | null) {
  const [data, setData] = useState<Prepa | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) return setLoading(false);
    const ctrl = new AbortController();

    (async () => {
      try {
        const res = await api.get(`/prepa/${id}/`, { signal: ctrl.signal });
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
// 🆕 CRUD
// ────────────────────────────────────────────────────────────────
export function useCreatePrepa() {
  const create = async (data: Partial<Prepa>) => {
    const r = await api.post("/prepa/", data);
    return r.data;
  };
  return { create };
}

export function useUpdatePrepa() {
  const update = async (id: number, data: Partial<Prepa>) => {
    const r = await api.patch(`/prepa/${id}/`, data);
    return r.data;
  };
  return { update };
}

export function useDeletePrepa() {
  const remove = async (id: number) => {
    await api.delete(`/prepa/${id}/`);
  };
  return { remove };
}

// ────────────────────────────────────────────────────────────────
export function usePrepaStats(annee?: number) {
  const [data, setData] = useState<PrepaStats>({
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
          api.get("/prepa/stats-centres/", { params: { annee }, signal: ctrl.signal }),
          api.get("/prepa/stats-departements/", { params: { annee }, signal: ctrl.signal }),
          api.get("/prepa/reste-a-faire-total/", { params: { annee }, signal: ctrl.signal }),
        ]);

        setData({
          centres: centresRes.data ?? {},
          departements: depsRes.data ?? {},
          resteAFaire: resteRes.data ?? null,
          loading: false,
        });
      } catch (e) {
        if (!isAbort(e)) toast.error("Erreur lors des statistiques Prépa.");
        setData((d) => ({ ...d, loading: false }));
      }
    })();

    return () => ctrl.abort();
  }, [annee]);

  return data;
}

// ────────────────────────────────────────────────────────────────
// 📤 Export
// ────────────────────────────────────────────────────────────────
export function useExportPrepa() {
  const exportXlsx = async (params?: Partial<PrepaFilters>) => {
    const res = await api.get("/prepa/export-xlsx/", {
      params,
      responseType: "blob",
    });

    const disposition = res.headers["content-disposition"];
    let filename = "prepa_export.xlsx";

    if (disposition) {
      const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
      if (match && match[1]) filename = decodeURIComponent(match[1].replace(/['"]/g, ""));
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
// 🎛 Méta / Filtres
// ────────────────────────────────────────────────────────────────
export function usePrepaMeta() {
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();

    (async () => {
      try {
        const res = await api.get("/prepa/meta/", { signal: ctrl.signal });
        setMeta(res.data);
      } catch (e) {
        if (!isAbort(e)) setError(e as Error);
      } finally {
        setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, []);

  return { meta, loading, error };
}

export interface PrepaFiltersOptions {
  type_prepa: Choice[];
  centre: Choice[];
}

export function usePrepaFiltersOptions() {
  return useQuery<PrepaFiltersOptions>({
    queryKey: ["prepa-filters-options"],
    queryFn: async () => {
      const res = await api.get("/prepa/filters/");
      return res.data;
    },
    staleTime: 1000 * 60 * 10,
  });
}

// -----------------------------------------------------------------------------
// 🆕 Hooks spécialisés — IC & Ateliers
// -----------------------------------------------------------------------------

/**
 * 🔵 IC uniquement : filtre automatique type_prepa=info_collective
 */
export function usePrepaListIC(filters: Partial<PrepaFilters> = {}) {
  return usePrepaList({
    ...filters,
    type_prepa: "info_collective",
  });
}

export function usePrepaListAteliers(filters: Partial<PrepaFilters> = {}) {
  return usePrepaList({
    ...filters,
    type_prepa: "atelier_1,atelier_2,atelier_3,atelier_4,atelier_5,atelier_6,autre",
  });
}
