// src/hooks/useProspection.ts
import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import api from "../api/axios";
import type {
  Prospection,
  ProspectionFiltresValues,
  ProspectionFormData,
  HistoriqueProspection,
  PaginatedResults,
  Choice,
  ProspectionStatut,
  ProspectionObjectif,
  ProspectionMotif,
  ProspectionTypeProspection,
  ProspectionMoyenContact,
  ProspectionChoicesResponse,
  ProspectionChangeStatutPayload,
} from "../types/prospection";

/* ────────────────────────────────────────────────────────────────────────────
   Helpers de parsing sûrs (sans any) + logs
   ──────────────────────────────────────────────────────────────────────────── */

type DRFDetail<T> = { success?: boolean; message?: string; data: T };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function hasKey<T extends string>(obj: unknown, key: T): obj is Record<T, unknown> {
  return isRecord(obj) && key in obj;
}
function isDRFDetail<T>(v: unknown): v is DRFDetail<T> {
  return hasKey(v, "data");
}
/** Forme "souple" de liste: on ne présume pas les types exacts, juste la présence de `results` */
type ListLike = {
  count?: unknown;
  next?: unknown;
  previous?: unknown;
  results?: unknown;
};
function hasListShape(v: unknown): v is ListLike {
  return isRecord(v) && "results" in v;
}

function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}
function toStringOrNull(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (v === null) return null;
  return null;
}
function toResultsArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/** Détail: accepte {data:T} ou T directement */
function safeGetDetail<T>(payload: unknown, _tag: string): T {
  if (isDRFDetail<T>(payload)) return payload.data;
  return payload as T;
}

/** Liste paginée: accepte {data:{...}} ou {...} ou objet DRF classique */
function safeGetList<T>(payload: unknown, _tag: string): PaginatedResults<T> {
  // Cas enveloppé: { data: {...} }
  if (isDRFDetail<unknown>(payload)) {
    const d = payload.data;
    if (hasListShape(d)) {
      return {
        count: toNumber(d.count),
        next: toStringOrNull(d.next),
        previous: toStringOrNull(d.previous),
        results: toResultsArray<T>(d.results),
      };
    }
  }

  // Cas plat: {...}
  if (hasListShape(payload)) {
    return {
      count: toNumber(payload.count),
      next: toStringOrNull(payload.next),
      previous: toStringOrNull(payload.previous),
      results: toResultsArray<T>(payload.results),
    };
  }
  throw new Error("Format de réponse inattendu (liste).");
}

function logAxiosError(ns: string, err: unknown) {
  if (axios.isAxiosError(err)) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error(`[${ns}] AxiosError :`, {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        url: err.config?.url,
      });
    }
  } else {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error(`[${ns}] Erreur inconnue :`, err);
    }
  }
}

/* ────────────────────────────────────────────────────────────────────────────
   Normalisation des filtres: convertit number[] -> "1,2,3" pour certains champs
   (le back accepte un id simple OU une CSV)
   ──────────────────────────────────────────────────────────────────────────── */
function normalizeFilters(params: ProspectionFiltresValues): Record<string, unknown> {
  // Champs que le back accepte sous forme CSV (ex: 1,2,3)
  const csvKeys: Array<keyof ProspectionFiltresValues> = [
    "centre",
    "formation_statut",
    "formation_type_offre",
  ];

  const out: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(params) as Array<[keyof ProspectionFiltresValues, unknown]>) {
    // ⚠️ on ignore les valeurs vides ou nulles
    if (v === undefined || v === null || v === "") continue;

    if (csvKeys.includes(k)) {
      // ✅ Conversion number[] → "1,2,3"
      if (Array.isArray(v)) {
        out[k as string] = v.join(",");
      } else {
        out[k as string] = v; // string CSV déjà, ou id simple
      }
    }

    // ✅ compatibilité rétro : avec_archivees OU inclure_archives
    else if (k === "avec_archivees" || k === "inclure_archives") {
      out["inclure_archives"] =
        v === true || v === "1" || v === "true" || v === "yes" ? "true" : "false";
    } else {
      out[k as string] = v;
    }
  }

  return out;
}

/* ────────────────────────────────────────────────────────────────────────────
   🔹 useProspections — liste paginée + filtres
   ──────────────────────────────────────────────────────────────────────────── */
export function useProspections(params: ProspectionFiltresValues = {}, reloadKey: number = 0) {
  const [pageData, setPageData] = useState<PaginatedResults<Prospection> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const paramsKey = useMemo(() => JSON.stringify(params), [params]);

  const fetchData = useCallback(() => {
    const raw = JSON.parse(paramsKey) as ProspectionFiltresValues;
    const parsedParams = normalizeFilters(raw);

    setLoading(true);
    setError(null);

    api
      .get<unknown>("/prospections/", { params: parsedParams })
      .then((res) => {
        const list = safeGetList<Prospection>(res.data, "useProspections");
        setPageData(list);
      })
      .catch((err) => {
        logAxiosError("useProspections", err);
        setError(err as Error);
        setPageData(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [paramsKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData, reloadKey]);

  return { pageData, loading, error, refetch: fetchData };
}

/* ────────────────────────────────────────────────────────────────────────────
   🔹 useProspection — détail
   ──────────────────────────────────────────────────────────────────────────── */
export function useProspection(id: number | string | null) {
  const [data, setData] = useState<Prospection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (id == null) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const url = `/prospections/${id}/`;

    api
      .get<unknown>(url)
      .then((res) => {
        const detail = safeGetDetail<Prospection>(res.data, "useProspection");
        setData(detail);
      })
      .catch((err) => {
        logAxiosError("useProspection", err);
        setError(err as Error);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  return { data, loading, error };
}

/* ────────────────────────────────────────────────────────────────────────────
   🔹 useCreateProspection — création
   ──────────────────────────────────────────────────────────────────────────── */
export function useCreateProspection() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (payload: ProspectionFormData) => {
    setLoading(true);
    setError(null);
    try {
      const cleanPayload = Object.fromEntries(
        Object.entries(payload).filter(([, v]) => v !== null && v !== undefined)
      );

      const res = await api.post<unknown>("/prospections/", cleanPayload);

      const created = safeGetDetail<Prospection>(res.data, "useCreateProspection");
      return created;
    } catch (err) {
      logAxiosError("useCreateProspection", err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, loading, error };
}

/* ────────────────────────────────────────────────────────────────────────────
   🔹 useUpdateProspection — mise à jour
   ──────────────────────────────────────────────────────────────────────────── */
export function useUpdateProspection(id: number | string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = useCallback(
    async (payload: ProspectionFormData) => {
      setLoading(true);
      setError(null);
      try {
        const cleanPayload = Object.fromEntries(
          Object.entries(payload).filter(([, v]) => v !== null && v !== undefined)
        );
        const url = `/prospections/${id}/`;

        const res = await api.put<unknown>(url, cleanPayload);

        const updated = safeGetDetail<Prospection>(res.data, "useUpdateProspection");
        return updated;
      } catch (err) {
        logAxiosError("useUpdateProspection", err);
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  return { update, loading, error };
}

/* ────────────────────────────────────────────────────────────────────────────
   🔹 useDeleteProspection — suppression
   ──────────────────────────────────────────────────────────────────────────── */
export function useDeleteProspection(id: number | string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const remove = useCallback(async () => {
    setLoading(true);
    setError(null);
    const url = `/prospections/${id}/`;
    try {
      await api.delete(url); // ✅ res supprimé car inutilisé
    } catch (err) {
      logAxiosError("useDeleteProspection", err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [id]);

  return { remove, loading, error };
}

/* ────────────────────────────────────────────────────────────────────────────
   🔹 useChangerStatut — action custom
   ──────────────────────────────────────────────────────────────────────────── */
export function useChangerStatut(id: number | string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const changeStatus = useCallback(
    async (payload: ProspectionChangeStatutPayload) => {
      setLoading(true);
      setError(null);
      const url = `/prospections/${id}/changer-statut/`;
      try {
        const res = await api.post<unknown>(url, payload);

        const updated = safeGetDetail<Prospection>(res.data, "useChangerStatut");
        return updated;
      } catch (err) {
        logAxiosError("useChangerStatut", err);
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  return { changeStatus, loading, error };
}

/* ────────────────────────────────────────────────────────────────────────────
   🔹 useHistoriqueProspections — historiques d’une prospection
   ──────────────────────────────────────────────────────────────────────────── */
export function useHistoriqueProspections(id: number | string | null) {
  const [data, setData] = useState<HistoriqueProspection[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (id == null) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const url = `/prospections/${id}/historiques/`;

    api
      .get<unknown>(url)
      .then((res) => {
        const arr = safeGetDetail<HistoriqueProspection[]>(res.data, "useHistoriqueProspections");
        setData(arr);
      })
      .catch((err) => {
        logAxiosError("useHistoriqueProspections", err);
        setError(err as Error);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  return { data, loading, error };
}

/* ────────────────────────────────────────────────────────────────────────────
   🔹 useProspectionChoices — listes de choix
   ──────────────────────────────────────────────────────────────────────────── */
export function useProspectionChoices() {
  const [choices, setChoices] = useState<ProspectionChoicesResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const url = "/prospections/choices/";

    api
      .get<unknown>(url)
      .then((res) => {
        // Réponses possibles: { success, message, data:{...} } OU {statut:[],...}
        if (isDRFDetail<ProspectionChoicesResponse["data"]>(res.data)) {
          setChoices(res.data.data);
        } else if (isRecord(res.data)) {
          setChoices(res.data as ProspectionChoicesResponse["data"]);
        } else {
          throw new Error("Format de réponse inattendu (choices).");
        }
      })
      .catch((err) => {
        logAxiosError("useProspectionChoices", err);
        setError(err as Error);
        setChoices(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return { choices, loading, error };
}

/* ────────────────────────────────────────────────────────────────────────────
   🔹 useFiltresProspections — suggestions de filtres
   (ajout formation_statut, formation_type_offre, centre)
   ──────────────────────────────────────────────────────────────────────────── */

// Forme attendue par le front pour le panneau de filtres
type FiltresPayload = {
  statut: Choice<ProspectionStatut>[];
  objectif: Choice<ProspectionObjectif>[];
  motif: Choice<ProspectionMotif>[];
  type_prospection: Choice<ProspectionTypeProspection>[];
  moyen_contact: Choice<ProspectionMoyenContact>[];
  owners?: Choice<number>[];
  formations?: Choice<number>[];
  partenaires?: Choice<number>[];
  user_role?: string;

  // 🆕 ajouts
  formation_statut?: Choice<number>[];
  formation_type_offre?: Choice<number>[];
  centres?: Choice<number>[];
};

export default function useFiltresProspections() {
  const [filtres, setFiltres] = useState<FiltresPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const url = "/prospections/filtres/";
    const fetchFiltres = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get<unknown>(url);

        // Formats possibles:
        // 1) { success, message, data: {...} }
        // 2) { data: {...} }
        // 3) {...} directement
        if (isDRFDetail<Record<string, unknown>>(res.data)) {
          setFiltres(res.data.data as FiltresPayload);
        } else if (isRecord(res.data) && hasKey(res.data, "data") && isRecord(res.data.data)) {
          setFiltres(res.data.data as FiltresPayload);
        } else if (isRecord(res.data)) {
          setFiltres(res.data as FiltresPayload);
        } else {
          throw new Error("Format de réponse inattendu (filtres).");
        }
      } catch (err) {
        logAxiosError("useFiltresProspections", err);
        setError(err as Error);
        setFiltres(null);
      } finally {
        setLoading(false);
      }
    };

    fetchFiltres();
  }, []);

  return { filtres, loading, error };
}
