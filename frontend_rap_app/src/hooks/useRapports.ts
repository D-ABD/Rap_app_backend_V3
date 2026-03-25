import { useCallback, useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";
import api from "../api/axios";
import type { WrappedResponse } from "../types/api";
import type { Rapport, RapportChoices, RapportFormData, RapportListResponse, RapportFormat } from "../types/rapport";

function extractRapportApiError(err: unknown, fallback: string): Error {
  const axiosError = err as AxiosError<{ message?: string; errors?: Record<string, unknown> }>;
  const responseData = axiosError.response?.data;
  if (responseData?.message) {
    return new Error(responseData.message);
  }
  const errors = responseData?.errors;
  if (errors && typeof errors === "object") {
    const lines = Object.entries(errors).flatMap(([field, value]) => {
      if (Array.isArray(value)) {
        return value.map((item) => `${field}: ${String(item)}`);
      }
      return `${field}: ${String(value)}`;
    });
    if (lines.length > 0) {
      return new Error(lines.join(" | "));
    }
  }
  if (axiosError.response?.data && typeof axiosError.response.data === "object") {
    const lines = Object.entries(axiosError.response.data)
      .filter(([key]) => key !== "success" && key !== "data")
      .flatMap(([field, value]) => {
        if (Array.isArray(value)) {
          return value.map((item) => `${field}: ${String(item)}`);
        }
        return `${field}: ${String(value)}`;
      });
    if (lines.length > 0) {
      return new Error(lines.join(" | "));
    }
  }
  return new Error(axiosError.message || fallback);
}

function normalizeRapportItem(raw: unknown): Rapport {
  const candidate = typeof raw === "object" && raw !== null && "data" in raw ? (raw as { data: Rapport }).data : raw;
  return candidate as Rapport;
}

function normalizeRapportList(raw: WrappedResponse<{ results?: unknown[]; count?: number; next?: string | null; previous?: string | null }> | { results?: unknown[]; count?: number; next?: string | null; previous?: string | null }): RapportListResponse {
  const payload = typeof raw === "object" && raw !== null && "data" in raw ? raw.data : raw;
  const results = Array.isArray(payload?.results) ? payload.results.map(normalizeRapportItem) : [];
  return {
    count: payload?.count ?? 0,
    next: payload?.next ?? null,
    previous: payload?.previous ?? null,
    results,
  };
}

function cleanRapportPayload(input: RapportFormData) {
  return {
    ...input,
    centre: input.centre || null,
    type_offre: input.type_offre || null,
    statut: input.statut || null,
    formation: input.formation || null,
  };
}

export function useRapports(params: Record<string, unknown>) {
  const [data, setData] = useState<RapportListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const paramsKey = useMemo(() => JSON.stringify(params), [params]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const stableParams = JSON.parse(paramsKey) as Record<string, unknown>;
      const response = await api.get("/rapports/", { params: stableParams });
      setData(normalizeRapportList(response.data));
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message || axiosError.message || "Erreur de chargement des rapports.");
    } finally {
      setLoading(false);
    }
  }, [paramsKey]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}

export function useRapport(id?: number) {
  const [data, setData] = useState<Rapport | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<WrappedResponse<Rapport>>(`/rapports/${id}/`);
      setData(normalizeRapportItem(response.data.data));
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message || axiosError.message || "Erreur de chargement du rapport.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}

export function useRapportChoices() {
  const [data, setData] = useState<RapportChoices | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<RapportChoices>("/rapports/choices/");
      setData(response.data);
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message || axiosError.message || "Erreur de chargement des choix.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}

export function useCreateRapport() {
  const [loading, setLoading] = useState(false);

  const createRapport = useCallback(async (payload: RapportFormData) => {
    setLoading(true);
    try {
      const response = await api.post<WrappedResponse<Rapport>>("/rapports/", cleanRapportPayload(payload));
      return normalizeRapportItem(response.data.data);
    } catch (err) {
      throw extractRapportApiError(err, "Erreur lors de la création du rapport.");
    } finally {
      setLoading(false);
    }
  }, []);

  return { createRapport, loading };
}

export function useUpdateRapport(id: number) {
  const [loading, setLoading] = useState(false);

  const updateRapport = useCallback(
    async (payload: RapportFormData) => {
      setLoading(true);
      try {
        const response = await api.put<WrappedResponse<Rapport>>(`/rapports/${id}/`, cleanRapportPayload(payload));
        return normalizeRapportItem(response.data.data);
      } catch (err) {
        throw extractRapportApiError(err, "Erreur lors de la mise à jour du rapport.");
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  return { updateRapport, loading };
}

export function useDeleteRapport() {
  const [loading, setLoading] = useState(false);

  const deleteRapport = useCallback(async (id: number) => {
    setLoading(true);
    try {
      await api.delete(`/rapports/${id}/`);
    } finally {
      setLoading(false);
    }
  }, []);

  return { deleteRapport, loading };
}

async function downloadBlob(url: string, filename: string, params?: Record<string, unknown>) {
  const response = await api.get(url, { params, responseType: "blob" });
  const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export function useRapportExports() {
  const exportListXlsx = useCallback(async (params: Record<string, unknown> = {}) => {
    await downloadBlob("/rapports/export-xlsx/", "rapports.xlsx", params);
  }, []);

  const exportRapport = useCallback(async (id: number, format?: RapportFormat) => {
    const fmt = format ?? "pdf";
    const extension = fmt === "excel" ? "xlsx" : fmt;
    await downloadBlob(`/rapports/${id}/export/`, `rapport_${id}.${extension}`, { format: fmt });
  }, []);

  return { exportListXlsx, exportRapport };
}
