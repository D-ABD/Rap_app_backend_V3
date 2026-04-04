import { useEffect, useState } from "react";
import api from "src/api/axios";
import axios from "axios";
import type { ParticipantDeclic } from "src/types/declic";

const isAbort = (e: unknown) =>
  (e instanceof DOMException && e.name === "AbortError") ||
  (axios.isAxiosError(e) && e.code === "ERR_CANCELED");

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const hasArrayProp = (o: Record<string, unknown>, k: string) => Array.isArray(o[k]);

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
    if (isObject(payload["data"]) && hasArrayProp(payload["data"] as Record<string, unknown>, "results")) {
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

export interface ParticipantDeclicFilters {
  search?: string;
  centre?: number;
  declic_origine?: number;
  type_declic?: string;
  annee?: number;
  present?: "true" | "false";
  page?: number;
  page_size?: number;
  ordering?: string;
  avec_archivees?: boolean;
  archives_seules?: boolean;
}

export function useParticipantsDeclicList(filters: Partial<ParticipantDeclicFilters> = {}) {
  const [data, setData] = useState<{ count: number; results: ParticipantDeclic[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await api.get("/participants-declic/", { params: filters, signal: ctrl.signal });
        const normalized = normalizeListResponse<ParticipantDeclic>(res.data);
        setData({ count: normalized.count, results: normalized.results });
      } catch (e) {
        if (!isAbort(e)) setError(e as Error);
      } finally {
        setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [filters]);

  return { data, loading, error };
}

export function useParticipantDeclicDetail(id: number | null) {
  const [data, setData] = useState<ParticipantDeclic | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) return setLoading(false);
    const ctrl = new AbortController();

    (async () => {
      try {
        const res = await api.get(`/participants-declic/${id}/`, { signal: ctrl.signal });
        setData(res.data?.data ?? res.data);
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

export function useParticipantsDeclicMeta() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await api.get("/participants-declic/meta/", { signal: ctrl.signal });
        setData(res.data?.data ?? res.data);
      } catch (e) {
        if (!isAbort(e)) setError(e as Error);
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, []);

  return { data, loading, error };
}

export function useCreateParticipantDeclic() {
  return {
    create: async (data: Partial<ParticipantDeclic>) => {
      const res = await api.post("/participants-declic/", data);
      return res.data;
    },
  };
}

export function useUpdateParticipantDeclic() {
  return {
    update: async (id: number, data: Partial<ParticipantDeclic>) => {
      const res = await api.patch(`/participants-declic/${id}/`, data);
      return res.data;
    },
  };
}

export function useDeleteParticipantDeclic() {
  return {
    remove: async (id: number) => {
      await api.delete(`/participants-declic/${id}/`);
    },
  };
}

export function useDesarchiverParticipantDeclic() {
  return {
    restore: async (id: number) => {
      const res = await api.post(`/participants-declic/${id}/desarchiver/`);
      return res.data;
    },
  };
}

export function useHardDeleteParticipantDeclic() {
  return {
    hardDelete: async (id: number) => {
      const res = await api.post(`/participants-declic/${id}/hard-delete/`);
      return res.data;
    },
  };
}

async function exportBlob(url: string, ids?: number[]) {
  const res =
    ids && ids.length > 0
      ? await api.post(url, { ids }, { responseType: "blob" })
      : await api.get(url, { responseType: "blob" });

  const disposition = res.headers["content-disposition"];
  const match = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i.exec(disposition || "");
  const raw = match?.[1] ?? match?.[2] ?? "export.xlsx";
  const filename = decodeURIComponent(raw);
  const blob = new Blob([res.data], {
    type:
      res.headers["content-type"] ||
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const link = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export function useExportParticipantsDeclic() {
  const buildSearch = (searchOverride?: string) => {
    if (typeof searchOverride === "string") return searchOverride;
    return typeof window !== "undefined" ? window.location.search || "" : "";
  };

  return {
    exportList: async (ids?: number[], searchOverride?: string) => {
      const qs = buildSearch(searchOverride);
      await exportBlob(`/participants-declic/export-xlsx/${qs.startsWith("?") ? qs : ""}`, ids);
    },
    exportPresence: async (ids?: number[], searchOverride?: string) => {
      const qs = buildSearch(searchOverride);
      await exportBlob(`/participants-declic/export-presence-xlsx/${qs.startsWith("?") ? qs : ""}`, ids);
    },
    exportEmargement: async (ids?: number[], searchOverride?: string) => {
      const qs = buildSearch(searchOverride);
      await exportBlob(`/participants-declic/export-emargement-xlsx/${qs.startsWith("?") ? qs : ""}`, ids);
    },
  };
}
