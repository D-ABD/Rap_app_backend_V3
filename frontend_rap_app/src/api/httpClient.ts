import axios, { type AxiosRequestConfig } from "axios";
import api from "./axios";

export type ApiError = {
  message: string;
  status?: number;
  code?: string;
  errorCode?: string;
  errors?: Record<string, string[]>;
  raw?: unknown;
};

// --- helpers typés ---
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
function firstFieldError(obj: Record<string, unknown>): string | undefined {
  for (const v of Object.values(obj)) {
    if (typeof v === "string") return v;
    if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  }
  return undefined;
}
function extractMessageFromData(data: unknown): string | undefined {
  if (typeof data === "string") return data;
  if (isRecord(data)) {
    const nestedErrors = isRecord(data.errors) ? firstFieldError(data.errors) : undefined;
    return asString(data.detail) ?? asString(data.message) ?? nestedErrors ?? firstFieldError(data);
  }
  return undefined;
}

function extractErrors(data: unknown): Record<string, string[]> | undefined {
  if (!isRecord(data)) return undefined;

  const source = isRecord(data.errors) ? data.errors : data;
  const output: Record<string, string[]> = {};

  for (const [key, value] of Object.entries(source)) {
    if (Array.isArray(value)) {
      output[key] = value.map((item) => String(item));
    } else if (typeof value === "string") {
      output[key] = [value];
    }
  }

  return Object.keys(output).length ? output : undefined;
}

export function toApiError(err: unknown): ApiError {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const data: unknown = err.response?.data;

    const message =
      extractMessageFromData(data) ??
      (typeof err.message === "string" ? err.message : undefined) ??
      "Erreur inconnue";

    const code =
      (isRecord(data) && typeof data.code === "string" ? data.code : undefined) ??
      (typeof err.code === "string" ? err.code : undefined);

    const errorCode = isRecord(data) && typeof data.error_code === "string" ? data.error_code : undefined;

    return {
      message,
      status,
      code,
      errorCode,
      errors: extractErrors(data),
      raw: err,
    };
  }
  return { message: "Erreur inconnue", raw: err };
}

// ✅ Query params fortement typés (+ support des tableaux readonly)
export type QueryPrimitive = string | number | boolean | null | undefined;
export type QueryValue = QueryPrimitive | QueryPrimitive[] | readonly QueryPrimitive[];
export type QueryParams = Record<string, QueryValue>;

export const http = {
  get: async <T>(url: string, params?: QueryParams, signal?: AbortSignal): Promise<T> =>
    (await api.get<T>(url, { params, signal })).data,

  post: async <T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig<B>): Promise<T> =>
    (await api.post<T>(url, body, config)).data,

  put: async <T, B = unknown>(url: string, body?: B): Promise<T> =>
    (await api.put<T>(url, body)).data,

  patch: async <T, B = unknown>(url: string, body?: B): Promise<T> =>
    (await api.patch<T>(url, body)).data,

  delete: async <T = unknown>(url: string): Promise<T> => (await api.delete<T>(url)).data,

  // ⬇️ typage direct de la réponse Axios au lieu de caster
  downloadBlob: async (url: string, params?: QueryParams): Promise<Blob> =>
    (await api.get<Blob>(url, { params, responseType: "blob" })).data,
};
