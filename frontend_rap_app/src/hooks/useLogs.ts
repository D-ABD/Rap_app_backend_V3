import { useCallback, useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";
import api from "../api/axios";
import type { WrappedResponse } from "../types/api";
import type { LogChoices, LogEntry, LogFilters, LogListResponse } from "../types/log";

function normalizeLogList(raw: WrappedResponse<LogListResponse> | LogListResponse): LogListResponse {
  const payload = typeof raw === "object" && raw !== null && "data" in raw ? raw.data : raw;
  return {
    count: payload?.count ?? 0,
    next: payload?.next ?? null,
    previous: payload?.previous ?? null,
    results: Array.isArray(payload?.results) ? payload.results : [],
  };
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

export function useLogs(params: LogFilters) {
  const [data, setData] = useState<LogListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const paramsKey = useMemo(() => JSON.stringify(params), [params]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const stableParams = JSON.parse(paramsKey) as LogFilters;
      const response = await api.get("/logs/", { params: stableParams });
      setData(normalizeLogList(response.data));
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message || axiosError.message || "Erreur de chargement des logs.");
    } finally {
      setLoading(false);
    }
  }, [paramsKey]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}

export function useLog(id?: number) {
  const [data, setData] = useState<LogEntry | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<WrappedResponse<LogEntry>>(`/logs/${id}/`);
      setData(response.data.data);
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message || axiosError.message || "Erreur de chargement du log.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}

export function useLogChoices() {
  const [data, setData] = useState<LogChoices | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<LogChoices>("/logs/choices/");
      setData(response.data);
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message || axiosError.message || "Erreur de chargement des choix de logs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}

export function useLogExports() {
  const exportXlsx = useCallback(async (params: LogFilters = {}) => {
    await downloadBlob("/logs/export-xlsx/", "logs_utilisateurs.xlsx", params);
  }, []);

  const exportCsv = useCallback(async (params: LogFilters = {}) => {
    await downloadBlob("/logs/export-csv/", "logs_utilisateurs.csv", params);
  }, []);

  const exportPdf = useCallback(async (params: LogFilters = {}) => {
    await downloadBlob("/logs/export-pdf/", "logs_utilisateurs.pdf", params);
  }, []);

  return { exportXlsx, exportCsv, exportPdf };
}
