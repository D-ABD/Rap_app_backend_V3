// hooks/useAteliersTRE.ts
import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import type {
  AtelierTRE,
  AtelierTREFormData,
  AtelierTREListResponse,
  AtelierTREMeta,
  Choice,
  AtelierTREFiltresValues,
} from "../types/ateliersTre";
import type { AxiosError } from "axios";
import axios from "axios";

// ──────────────────────────────────────────────────────────────────────────────
// Debug utils (désactivez en mettant à false)
const DEBUG_ATELIERS = true;

const dbg = (..._args: ReadonlyArray<unknown>): void => {
  if (!DEBUG_ATELIERS) return;
};

// ──────────────────────────────────────────────────────────────────────────────

// Util: clé stable pour les deps (stringify simple)
const stableKey = (obj: unknown) => JSON.stringify(obj ?? {});

// Détecte une requête annulée (AbortController / Axios)
const isAbort = (e: unknown) => {
  if (e instanceof DOMException && e.name === "AbortError") return true;
  const ax = e as Partial<AxiosError>;
  return ax?.code === "ERR_CANCELED";
};

const isAxiosErr = (e: unknown): e is AxiosError<unknown> =>
  typeof axios.isAxiosError === "function" && axios.isAxiosError(e);

// Type guards utilitaires
const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

const hasArrayProp = <K extends string>(
  obj: Record<string, unknown>,
  key: K
): obj is Record<K, unknown[]> => Array.isArray(obj[key]);

const hasStringOrNullProp = <K extends string>(
  obj: Record<string, unknown>,
  key: K
): obj is Record<K, string | null> => typeof obj[key] === "string" || obj[key] === null;

const hasNumberProp = <K extends string>(
  obj: Record<string, unknown>,
  key: K
): obj is Record<K, number> => typeof obj[key] === "number";

// Normalise toutes les formes possibles vers AtelierTREListResponse
function normalizeListResponse(payload: unknown): AtelierTREListResponse {
  dbg("normalize.input", {
    isArray: Array.isArray(payload),
    isObject: isObject(payload),
    keys: isObject(payload) ? Object.keys(payload) : null,
  });

  // 1) Tableau brut: [ {...}, {...} ]
  if (Array.isArray(payload)) {
    const results = payload as unknown[];
    return {
      count: results.length,
      next: null,
      previous: null,
      results: results as AtelierTRE[],
    };
  }

  // 2) Objet avec { results, count?, next?, previous? }
  if (isObject(payload)) {
    if (hasArrayProp(payload, "results")) {
      const results = payload["results"] as unknown[];
      const count = hasNumberProp(payload, "count") ? payload["count"] : results.length;
      const next = hasStringOrNullProp(payload, "next") ? payload["next"] : null;
      const previous = hasStringOrNullProp(payload, "previous") ? payload["previous"] : null;
      return {
        count,
        next,
        previous,
        results: results as AtelierTRE[],
      };
    }

    // 3) Objet avec { data: [...] } (certains backends)
    if (hasArrayProp(payload, "data")) {
      const arr = payload["data"] as unknown[];
      return {
        count: arr.length,
        next: null,
        previous: null,
        results: arr as AtelierTRE[],
      };
    }

    // 4) Objet avec { data: { results, ... } }
    if (isObject(payload["data"])) {
      const inner = payload["data"] as Record<string, unknown>;
      if (hasArrayProp(inner, "results")) {
        const results = inner["results"] as unknown[];
        const count = hasNumberProp(inner, "count") ? inner["count"] : results.length;
        const next = hasStringOrNullProp(inner, "next") ? inner["next"] : null;
        const previous = hasStringOrNullProp(inner, "previous") ? inner["previous"] : null;
        return {
          count,
          next,
          previous,
          results: results as AtelierTRE[],
        };
      }
      if (hasArrayProp(inner, "data")) {
        const arr = inner["data"] as unknown[];
        return {
          count: arr.length,
          next: null,
          previous: null,
          results: arr as AtelierTRE[],
        };
      }
    }
  }

  // 5) Fallback: vide
  return { count: 0, next: null, previous: null, results: [] };
}

// Construit des query params propres pour le ViewSet
function buildQuery(raw: Partial<AtelierTREFiltresValues>): Record<string, unknown> {
  dbg("buildQuery.input", raw);
  const q: Record<string, unknown> = {};

  // pagination / tri
  if (raw.page) q.page = raw.page;
  if (raw.page_size) q.page_size = raw.page_size;
  if (raw.ordering) q.ordering = raw.ordering;

  // filtres simples
  if (typeof raw.centre === "number") q.centre = raw.centre;

  // type_atelier: exact OU __in si l’UI fournit un tableau
  const ta = (raw as Record<string, unknown>).type_atelier;
  if (typeof ta === "string") {
    q.type_atelier = ta;
  } else if (isStringArray(ta)) {
    q.type_atelier__in = ta.join(","); // "atelier_1,atelier_2"
  }

  // dates: map -> gte/lte attendus par django-filter
  if (raw.date_atelier_min) q["date_atelier__gte"] = raw.date_atelier_min;
  if (raw.date_atelier_max) q["date_atelier__lte"] = raw.date_atelier_max;

  // nettoyage: supprime null/undefined/""
  for (const k of Object.keys(q)) {
    const v = q[k];
    if (v === undefined || v === null || v === "") delete q[k];
  }
  dbg("buildQuery.output", q);
  return q;
}

// ── Liste des ateliers (avec filtres/pagination/tri) ──────────────────────────
export function useAteliersTRE(params: Partial<AtelierTREFiltresValues> = {}) {
  const [data, setData] = useState<AtelierTREListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const key = useMemo(() => stableKey(params), [params]);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    const raw = JSON.parse(key) as Partial<AtelierTREFiltresValues>;
    const query = buildQuery(raw);

    dbg("useAteliersTRE.start", {
      url: "/ateliers-tre/",
      query,
    });

    (async () => {
      try {
        const res = await api.get<unknown>("/ateliers-tre/", {
          params: query,
          signal: ctrl.signal,
        });

        const normalized = normalizeListResponse(res.data);

        dbg("useAteliersTRE.success", {
          http: (res as { status?: number }).status ?? "n/a",
          count: normalized.count,
          ids: normalized.results.map((r) => r.id),
          first: normalized.results[0],
          contentType:
            (res as { headers?: Record<string, unknown> }).headers &&
            isObject((res as { headers?: Record<string, unknown> }).headers) &&
            typeof (res as { headers?: Record<string, unknown> }).headers!["content-type"] ===
              "string"
              ? ((res as { headers?: Record<string, string> }).headers!["content-type"] as string)
              : null,
        });

        setData(normalized);
      } catch (e: unknown) {
        if (isAbort(e)) {
          dbg("useAteliersTRE.abort");
          return;
        }
        if (isAxiosErr(e)) {
          dbg("useAteliersTRE.error", {
            message: e.message,
            status: e.response?.status,
            data: e.response?.data,
            url: e.config?.url,
            params: e.config?.params,
          });
        } else {
          dbg("useAteliersTRE.error.unknown", e);
        }
        setError(e as Error);
      } finally {
        setLoading(false);
        dbg("useAteliersTRE.end");
      }
    })();

    return () => ctrl.abort();
  }, [key]);

  return { data, loading, error };
}

// ── Détail d’un atelier ───────────────────────────────────────────────────────
export function useAtelierTRE(id: number | null) {
  const [data, setData] = useState<AtelierTRE | null>(null);
  const [loading, setLoading] = useState<boolean>(!!id);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      dbg("useAtelierTRE.skip (id null/undefined)");
      setData(null);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    dbg("useAtelierTRE.start", { id });

    (async () => {
      try {
        const res = await api.get<AtelierTRE>(`/ateliers-tre/${id}/`, {
          signal: ctrl.signal,
        });

        dbg("useAtelierTRE.success", {
          http: res.status,
          id: res.data?.id,
          type: res.data?.type_atelier,
          nb_inscrits: res.data?.nb_inscrits,
        });

        setData(res.data);
      } catch (e: unknown) {
        if (isAbort(e)) {
          dbg("useAtelierTRE.abort");
          return;
        }
        if (isAxiosErr(e)) {
          dbg("useAtelierTRE.error", {
            message: e.message,
            status: e.response?.status,
            data: e.response?.data,
            url: e.config?.url,
            params: e.config?.params,
          });
        } else {
          dbg("useAtelierTRE.error.unknown", e);
        }
        setError(e as Error);
      } finally {
        setLoading(false);
        dbg("useAtelierTRE.end", { id });
      }
    })();

    return () => ctrl.abort();
  }, [id]);

  return { data, loading, error };
}

// ── Création / Mise à jour / Suppression ──────────────────────────────────────
export function useCreateAtelierTRE() {
  const create = async (formData: AtelierTREFormData) => {
    dbg("createAtelierTRE.start", formData);
    try {
      const r = await api.post<AtelierTRE>("/ateliers-tre/", formData);
      dbg("createAtelierTRE.success", { id: r.data.id });
      return r.data;
    } catch (e) {
      if (isAxiosErr(e)) {
        dbg("createAtelierTRE.error", {
          message: e.message,
          status: e.response?.status,
          data: e.response?.data,
        });
      } else {
        dbg("createAtelierTRE.error.unknown", e);
      }
      throw e;
    }
  };
  return { create };
}

export function useUpdateAtelierTRE() {
  const update = async (id: number, formData: Partial<AtelierTREFormData>) => {
    dbg("updateAtelierTRE.start", { id, formData });
    try {
      const r = await api.patch<AtelierTRE>(`/ateliers-tre/${id}/`, formData);
      dbg("updateAtelierTRE.success", { id: r.data.id });
      return r.data;
    } catch (e) {
      if (isAxiosErr(e)) {
        dbg("updateAtelierTRE.error", {
          message: e.message,
          status: e.response?.status,
          data: e.response?.data,
        });
      } else {
        dbg("updateAtelierTRE.error.unknown", e);
      }
      throw e;
    }
  };
  return { update };
}

export function useDeleteAtelierTRE() {
  const remove = async (id: number) => {
    dbg("deleteAtelierTRE.start", { id });
    try {
      const r = await api.delete<void>(`/ateliers-tre/${id}/`);
      dbg("deleteAtelierTRE.success", { http: r.status });
      return r;
    } catch (e) {
      if (isAxiosErr(e)) {
        dbg("deleteAtelierTRE.error", {
          message: e.message,
          status: e.response?.status,
          data: e.response?.data,
        });
      } else {
        dbg("deleteAtelierTRE.error.unknown", e);
      }
      throw e;
    }
  };
  return { remove };
}

// ── Actions candidats (add/remove sans écraser la liste) ─────────────────────
export function useAddCandidatsToAtelierTRE() {
  const add = async (id: number, candidats: number[]) => {
    dbg("addCandidats.start", { id, candidats });
    try {
      const r = await api.post<AtelierTRE>(`/ateliers-tre/${id}/add-candidats/`, {
        candidats,
      });
      dbg("addCandidats.success", {
        id: r.data.id,
        nb_inscrits: r.data.nb_inscrits,
      });
      return r.data;
    } catch (e) {
      if (isAxiosErr(e)) {
        dbg("addCandidats.error", {
          message: e.message,
          status: e.response?.status,
          data: e.response?.data,
        });
      } else {
        dbg("addCandidats.error.unknown", e);
      }
      throw e;
    }
  };
  return { add };
}

export function useRemoveCandidatsFromAtelierTRE() {
  const remove = async (id: number, candidats: number[]) => {
    dbg("removeCandidats.start", { id, candidats });
    try {
      const r = await api.post<AtelierTRE>(`/ateliers-tre/${id}/remove-candidats/`, {
        candidats,
      });
      dbg("removeCandidats.success", {
        id: r.data.id,
        nb_inscrits: r.data.nb_inscrits,
      });
      return r.data;
    } catch (e) {
      if (isAxiosErr(e)) {
        dbg("removeCandidats.error", {
          message: e.message,
          status: e.response?.status,
          data: e.response?.data,
        });
      } else {
        dbg("removeCandidats.error.unknown", e);
      }
      throw e;
    }
  };
  return { remove };
}

// ── Métadonnées (choices) ────────────────────────────────────────────────────
export function useAtelierTREMeta() {
  const [meta, setMeta] = useState<AtelierTREMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    dbg("useAtelierTREMeta.start");

    (async () => {
      try {
        const res = await api.get<AtelierTREMeta>("/ateliers-tre/meta/", {
          signal: ctrl.signal,
        });
        dbg("useAtelierTREMeta.success", {
          http: res.status,
          keys: Object.keys(res.data ?? {}),
        });
        setMeta(res.data);
      } catch (e: unknown) {
        if (isAbort(e)) {
          dbg("useAtelierTREMeta.abort");
          return;
        }
        if (isAxiosErr(e)) {
          dbg("useAtelierTREMeta.error", {
            message: e.message,
            status: e.response?.status,
            data: e.response?.data,
          });
        } else {
          dbg("useAtelierTREMeta.error.unknown", e);
        }
        setError(e as Error);
      } finally {
        setLoading(false);
        dbg("useAtelierTREMeta.end");
      }
    })();

    return () => ctrl.abort();
  }, []);

  return { meta, loading, error };
}

// ── Options de filtres (type_atelier & centre) ───────────────────────────────
export interface AtelierTREFiltresOptions {
  type_atelier: Choice[];
  centre: Choice[];
}

function pickChoices(meta: unknown, key: string): Choice[] {
  if (!meta || typeof meta !== "object") return [];
  if (key in (meta as Record<string, unknown>)) {
    const v = (meta as Record<string, unknown>)[key];
    if (Array.isArray(v)) return v as Choice[];
  }
  if ("choices" in (meta as Record<string, unknown>)) {
    const choices = (meta as Record<string, unknown>).choices;
    if (choices && typeof choices === "object" && key in (choices as Record<string, unknown>)) {
      const v = (choices as Record<string, unknown>)[key];
      if (Array.isArray(v)) return v as Choice[];
    }
  }
  return [];
}

export function useAtelierTREFiltresOptions() {
  const { meta, loading, error } = useAtelierTREMeta();

  const options: AtelierTREFiltresOptions | null = useMemo(() => {
    if (!meta) return null;
    const out = {
      type_atelier: pickChoices(meta, "type_atelier_choices"),
      centre: pickChoices(meta, "centre_choices"),
    };
    dbg("useAtelierTREFiltresOptions", {
      type_atelier_len: out.type_atelier.length,
      centre_len: out.centre.length,
    });
    return out;
  }, [meta]);

  return { options, loading, error };
}

// ── Export Excel (XLSX) ──────────────────────────────────────────────────────
export function useExportAteliersTRE() {
  /**
   * Permet d’exporter les ateliers TRE filtrés au format Excel (.xlsx)
   * en respectant les filtres actuels et les permissions du backend.
   */
  const exportXlsx = async (params?: Partial<AtelierTREFiltresValues>) => {
    const res = await api.get<Blob>("/ateliers-tre/export-xlsx/", {
      params,
      responseType: "blob",
    });

    // Récupère le nom de fichier depuis le header Content-Disposition
    const disposition = res.headers["content-disposition"];
    let filename = "ateliers_tre.xlsx";
    if (disposition) {
      const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
      if (match && match[1]) {
        filename = decodeURIComponent(match[1].replace(/['"]/g, ""));
      }
    }

    // Crée le lien de téléchargement
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

    return true;
  };

  return { exportXlsx };
}
