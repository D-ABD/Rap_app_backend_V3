import { useEffect, useMemo, useState, useCallback } from "react";
import api from "../api/axios";
import axios from "axios";
import { toDisplayError } from "../api/errorMessage";
import type {
  ProspectionCommentDTO,
  ProspectionCommentCreateInput,
  ProspectionCommentUpdateInput,
  ProspectionCommentListParams,
} from "../types/prospectionComment";

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type ApiResponse<T> =
  | PaginatedResponse<T>
  | {
      success: boolean;
      message: string;
      data: PaginatedResponse<T>;
    };

const BASE = "/prospection-commentaires/";

/* ──────────────────────────────────────────────────────────────────────────
   Helpers de dé-sérialisation
   ────────────────────────────────────────────────────────────────────────── */
type ApiObjectShape<T> = T | { data: T };

function extractObject<T>(payload: ApiObjectShape<T>): T {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "data" in (payload as Record<string, unknown>)
  ) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

/* ──────────────────────────────────────────────────────────────────────────
   Normalisation & sérialisation des paramètres de liste
   ────────────────────────────────────────────────────────────────────────── */
type QueryDict = Record<string, string | number | boolean>;

function cleanString(x: unknown): string | undefined {
  if (typeof x !== "string") return undefined;
  const v = x.trim();
  return v === "" ? undefined : v;
}

/**
 * 🔧 Construit la query params DRF depuis le state React
 * (on inclut les nouveaux filtres anticipés : activite, est_archivee, statut_commentaire)
 */
function buildListQuery(p: ProspectionCommentListParams): QueryDict {
  const q: QueryDict = {};

  // IDs / booléens / tri
  if (typeof p.prospection === "number") q.prospection = p.prospection;
  if (typeof p.created_by === "number") q.created_by = p.created_by;
  if (typeof p.is_internal === "boolean") q.is_internal = p.is_internal;
  if (typeof p.prospection_owner === "number") q.prospection_owner = p.prospection_owner;
  if (typeof p.prospection_partenaire === "number")
    q.prospection_partenaire = p.prospection_partenaire;
  if (p.ordering) q.ordering = p.ordering;

  // Filtres textuels
  const formationNom = cleanString(p.formation_nom);
  const partenaireNom = cleanString(p.partenaire_nom);
  const authorUsername = cleanString(p.created_by_username);
  if (formationNom) q.formation_nom = formationNom;
  if (partenaireNom) q.partenaire_nom = partenaireNom;
  if (authorUsername) q.created_by_username = authorUsername;

  // 🆕 Filtres liés à l’activité / statut
  if (typeof p.est_archive === "boolean") {
    q.est_archive = p.est_archive ? "true" : "false";
  } else if (
    typeof p.est_archive === "string" &&
    ["true", "false", "both", "all", "tous"].includes(p.est_archive.toLowerCase())
  ) {
    q.est_archive = p.est_archive.toLowerCase(); // ✅ garde "both"
  }

  if (p.inclure_archives === true) q.inclure_archives = "true";

  if (p.activite) q.activite = p.activite;
  if (p.statut_commentaire) q.statut_commentaire = p.statut_commentaire;

  return q;
}

/* ──────────────────────────────────────────────────────────────────────────
   LISTE
   ────────────────────────────────────────────────────────────────────────── */
export function useListProspectionComments(
  params: ProspectionCommentListParams = {},
  reloadKey = 0
) {
  const [data, setData] = useState<PaginatedResponse<ProspectionCommentDTO> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const paramsKey = useMemo(() => JSON.stringify(params), [params]);

  const fetchData = useCallback(() => {
    const parsedParams = JSON.parse(paramsKey) as ProspectionCommentListParams;
    const query = buildListQuery(parsedParams);

    const source = axios.CancelToken.source();
    setLoading(true);
    setError(null);

    api
      .get<ApiResponse<ProspectionCommentDTO>>(BASE, {
        params: query,
        cancelToken: source.token,
      })
      .then((res) => {
        const payload = res.data;
        const paginated: PaginatedResponse<ProspectionCommentDTO> =
          "data" in payload ? payload.data : (payload as PaginatedResponse<ProspectionCommentDTO>);
        setData(paginated);
      })
      .catch((err) => {
        if (!axios.isCancel(err)) {
          setError(toDisplayError(err));
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

/* ──────────────────────────────────────────────────────────────────────────
   DÉTAIL
   ────────────────────────────────────────────────────────────────────────── */
export function useProspectionComment(id: number | string | null) {
  const [data, setData] = useState<ProspectionCommentDTO | null>(null);
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
      .get<ApiObjectShape<ProspectionCommentDTO>>(`${BASE}${id}/`, {
        cancelToken: source.token,
      })
      .then((res) => setData(extractObject<ProspectionCommentDTO>(res.data)))
      .catch((err) => {
        if (!axios.isCancel(err)) {
          setError(toDisplayError(err));
          setData(null);
        }
      })
      .finally(() => setLoading(false));

    return () => source.cancel("detail canceled");
  }, [id]);

  return { data, loading, error };
}

/* ──────────────────────────────────────────────────────────────────────────
   CRÉATION
   ────────────────────────────────────────────────────────────────────────── */
export function useCreateProspectionComment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (payload: ProspectionCommentCreateInput) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<ApiObjectShape<ProspectionCommentDTO>>(BASE, payload);
      return extractObject<ProspectionCommentDTO>(res.data);
    } catch (err) {
      setError(toDisplayError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, loading, error };
}

/* ──────────────────────────────────────────────────────────────────────────
   MISE À JOUR
   ────────────────────────────────────────────────────────────────────────── */
export function useUpdateProspectionComment(id: number | string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = useCallback(
    async (payload: ProspectionCommentUpdateInput) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.patch<ApiObjectShape<ProspectionCommentDTO>>(
          `${BASE}${id}/`,
          payload
        );
        return extractObject<ProspectionCommentDTO>(res.data);
      } catch (err) {
        setError(toDisplayError(err));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  return { update, loading, error };
}

/* ──────────────────────────────────────────────────────────────────────────
   SUPPRESSION
   ────────────────────────────────────────────────────────────────────────── */
export function useDeleteProspectionComment(id: number | string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const remove = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await api.delete<void>(`${BASE}${id}/`);
    } catch (err) {
      setError(toDisplayError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [id]);

  return { remove, loading, error };
}

/* ──────────────────────────────────────────────────────────────────────────
   OPTIONS DE FILTRES
   ────────────────────────────────────────────────────────────────────────── */
export type ProspectionCommentFilterOptions = {
  formations: { value: string; label: string }[];
  partenaires: { value: string; label: string }[];
  authors: { value: string; label: string }[];
  centres: { value: string; label: string }[];
  owners: { value: number; label: string }[];
};

export function useProspectionCommentFilterOptions(reloadKey = 0) {
  const [data, setData] = useState<ProspectionCommentFilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(() => {
    const source = axios.CancelToken.source();
    setLoading(true);
    setError(null);

    api
      .get<ApiObjectShape<ProspectionCommentFilterOptions>>(`${BASE}filter-options/`, {
        cancelToken: source.token,
      })
      .then((res) => setData(extractObject<ProspectionCommentFilterOptions>(res.data)))
      .catch((err) => {
        if (!axios.isCancel(err)) {
          setError(toDisplayError(err));
          setData(null);
        }
      })
      .finally(() => setLoading(false));

    return () => source.cancel("filter-options canceled");
  }, []);

  useEffect(() => {
    const cancel = fetchData();
    return () => {
      if (typeof cancel === "function") cancel();
    };
  }, [fetchData, reloadKey]);

  return { data, loading, error, refetch: fetchData };
}
/* ──────────────────────────────────────────────────────────────────────────
   ARCHIVER / DÉSARCHIVER
   ────────────────────────────────────────────────────────────────────────── */
export function useArchiveProspectionComment(id: number | string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const toggleArchive = useCallback(
    async (isArchived: boolean) => {
      if (!id) return;
      try {
        setLoading(true);
        const endpoint = isArchived ? `${BASE}${id}/desarchiver/` : `${BASE}${id}/archiver/`;
        await api.post(endpoint);
        // ✅ Renvoie les bons codes alignés avec le backend & DTO
        return isArchived ? "actif" : "archive";
      } catch (err) {
        setError(toDisplayError(err));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  return { toggleArchive, loading, error };
}
