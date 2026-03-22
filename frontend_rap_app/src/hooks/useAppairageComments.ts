// src/hooks/useAppairageComments.ts
import { useEffect, useMemo, useState, useCallback } from "react";
import api from "../api/axios";
import axios from "axios";
import type {
  AppairageCommentDTO,
  AppairageCommentCreateInput,
  AppairageCommentUpdateInput,
  AppairageCommentListParams,
} from "../types/appairageComment";

/* -------------------------------------------------------------------------- */
/* CONFIG                                                                     */
/* -------------------------------------------------------------------------- */
const BASE = "/appairage-commentaires/";

/* -------------------------------------------------------------------------- */
/* HELPERS - Extraction                                                        */
/* -------------------------------------------------------------------------- */
type ApiEnvelope<T> =
  | T[]
  | { data: T[] }
  | { results: T[] }
  | { data: T }
  | {
      success: boolean;
      message: string;
      data: { results?: T[] } | T[] | T;
    };

function extractArray<T>(payload: ApiEnvelope<T>): T[] {
  if (Array.isArray(payload)) return payload;
  if ("data" in payload && Array.isArray(payload.data)) return payload.data;
  if ("results" in payload && Array.isArray(payload.results)) return payload.results;

  if ("data" in payload && typeof payload.data === "object") {
    const inner = payload.data as unknown;
    if (Array.isArray(inner)) return inner;
    if (inner && typeof inner === "object" && "results" in inner) {
      return (inner as { results: T[] }).results;
    }
  }
  return [];
}

function extractObject<T>(payload: ApiEnvelope<T>): T {
  if ("data" in payload && !Array.isArray(payload.data)) {
    return payload.data as T;
  }
  return payload as T;
}

/* -------------------------------------------------------------------------- */
/* HELPERS - Query params                                                      */
/* -------------------------------------------------------------------------- */
type QueryDict = Record<string, string | number | boolean>;

function cleanString(x: unknown): string | undefined {
  if (typeof x !== "string") return undefined;
  const v = x.trim();
  return v === "" ? undefined : v;
}

function buildListQuery(p: AppairageCommentListParams): QueryDict {
  const q: QueryDict = {};

  // IDs & ordering
  if (typeof p.appairage === "number") q.appairage = p.appairage;
  if (typeof p.created_by === "number") q.created_by = p.created_by;
  if (p.ordering) q.ordering = p.ordering;

  // Text filters
  const formationNom = cleanString(p.formation_nom);
  const partenaireNom = cleanString(p.partenaire_nom);
  const authorUsername = cleanString(p.created_by_username);
  if (formationNom) q.formation_nom = formationNom;
  if (partenaireNom) q.partenaire_nom = partenaireNom;
  if (authorUsername) q.created_by_username = authorUsername;

  // ✅ Nouveaux filtres d’état / archivage (alignés Prospection)
  if (typeof p.est_archive === "boolean") q.est_archive = p.est_archive;
  if (p.activite) q.activite = p.activite;
  if (p.statut_commentaire) q.statut_commentaire = p.statut_commentaire;

  // ✅ Filtres additionnels possibles
  if (typeof p.appairage_owner === "number") q.appairage_owner = p.appairage_owner;
  if (typeof p.appairage_partenaire === "number") q.appairage_partenaire = p.appairage_partenaire;
  if (cleanString(p.appairage_statut)) q.appairage_statut = p.appairage_statut!.trim();

  return q;
}

/* -------------------------------------------------------------------------- */
/* HOOKS - LISTE                                                              */
/* -------------------------------------------------------------------------- */
export function useListAppairageComments(params: AppairageCommentListParams = {}, reloadKey = 0) {
  const [data, setData] = useState<AppairageCommentDTO[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const paramsKey = useMemo(() => JSON.stringify(params), [params]);

  const fetchData = useCallback(() => {
    const parsedParams = JSON.parse(paramsKey) as AppairageCommentListParams;
    const query = buildListQuery(parsedParams);

    const source = axios.CancelToken.source();
    setLoading(true);
    setError(null);

    api
      .get<ApiEnvelope<AppairageCommentDTO>>(BASE, {
        params: query,
        cancelToken: source.token,
      })
      .then((res) => setData(extractArray<AppairageCommentDTO>(res.data)))
      .catch((err) => {
        if (!axios.isCancel(err)) {
          setError(
            new Error(`HTTP ${axios.isAxiosError(err) ? (err.response?.status ?? "?") : "?"}`)
          );
          setData(null);
        }
      })
      .finally(() => setLoading(false));

    return () => source.cancel("list canceled");
  }, [paramsKey]);

  useEffect(() => {
    const cancel = fetchData();
    return () => {
      if (typeof cancel === "function") cancel();
    };
  }, [fetchData, reloadKey]);

  return { data, loading, error, refetch: fetchData };
}

/* -------------------------------------------------------------------------- */
/* HOOKS - DETAIL                                                             */
/* -------------------------------------------------------------------------- */
export function useAppairageComment(id: number | string | null) {
  const [data, setData] = useState<AppairageCommentDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (id == null) {
      setData(null);
      setLoading(false);
      return;
    }

    const source = axios.CancelToken.source();
    setLoading(true);
    setError(null);

    api
      .get<ApiEnvelope<AppairageCommentDTO>>(`${BASE}${id}/`, {
        cancelToken: source.token,
      })
      .then((res) => setData(extractObject<AppairageCommentDTO>(res.data)))
      .catch((err) => {
        if (!axios.isCancel(err)) {
          setError(
            new Error(`HTTP ${axios.isAxiosError(err) ? (err.response?.status ?? "?") : "?"}`)
          );
          setData(null);
        }
      })
      .finally(() => setLoading(false));

    return () => source.cancel("detail canceled");
  }, [id]);

  return { data, loading, error };
}

/* -------------------------------------------------------------------------- */
/* HOOKS - CREATE                                                             */
/* -------------------------------------------------------------------------- */
export function useCreateAppairageComment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (payload: AppairageCommentCreateInput) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<ApiEnvelope<AppairageCommentDTO>>(BASE, payload);
      return extractObject<AppairageCommentDTO>(res.data);
    } catch (err) {
      setError(new Error(`HTTP ${axios.isAxiosError(err) ? (err.response?.status ?? "?") : "?"}`));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, loading, error };
}

/* -------------------------------------------------------------------------- */
/* HOOKS - UPDATE                                                             */
/* -------------------------------------------------------------------------- */
export function useUpdateAppairageComment(id: number | string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = useCallback(
    async (payload: AppairageCommentUpdateInput) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.patch<ApiEnvelope<AppairageCommentDTO>>(`${BASE}${id}/`, payload);
        return extractObject<AppairageCommentDTO>(res.data);
      } catch (err) {
        setError(
          new Error(`HTTP ${axios.isAxiosError(err) ? (err.response?.status ?? "?") : "?"}`)
        );
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  return { update, loading, error };
}

/* -------------------------------------------------------------------------- */
/* HOOKS - DELETE                                                             */
/* -------------------------------------------------------------------------- */
export function useDeleteAppairageComment(id: number | string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const remove = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await api.delete<void>(`${BASE}${id}/`);
    } catch (err) {
      setError(new Error(`HTTP ${axios.isAxiosError(err) ? (err.response?.status ?? "?") : "?"}`));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [id]);

  return { remove, loading, error };
}

/* -------------------------------------------------------------------------- */
/* HOOKS - ARCHIVER / DÉSARCHIVER                                             */
/* -------------------------------------------------------------------------- */
export function useArchiveAppairageComment(id: number | string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const toggleArchive = useCallback(
    async (isArchived: boolean) => {
      if (!id) return;
      try {
        setLoading(true);
        const endpoint = isArchived ? `${BASE}${id}/desarchiver/` : `${BASE}${id}/archiver/`;
        await api.post(endpoint);
        return isArchived ? "actif" : "archive";
      } catch (err) {
        if (axios.isAxiosError(err)) {
          setError(new Error(`HTTP ${err.response?.status ?? "?"}`));
        } else {
          setError(err as Error);
        }
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  return { toggleArchive, loading, error };
}
