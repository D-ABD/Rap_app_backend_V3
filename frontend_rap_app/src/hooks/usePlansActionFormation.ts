// ======================================================
// usePlansActionFormation — liste paginée (module isolé)
// GET /api/plans-action-formation/ — format enveloppe RapAppPagination
// ======================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";
import api from "../api/axios";
import type {
  PlanActionCommentairesGroupesData,
  PlanActionCommentairesGroupesQuery,
  PlanActionFormationDetail,
  PlanActionFormationListItem,
  PlanActionFormationListQuery,
  PlanActionFormationPaginatedData,
  PlanActionFormationWriteBody,
} from "../types/planActionFormation";

const LIST_PATH = "/plans-action-formation/";
const GROUPES_PATH = "/plans-action-formation/commentaires-groupes/";

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/**
 * Extrait le corps `data` d’une réponse API enveloppée (success + data) si présent.
 */
export function unwrapRapAppPayload<T>(raw: unknown): T {
  if (isRecord(raw) && "data" in raw) {
    return (raw as { data: T }).data;
  }
  return raw as T;
}

/**
 * Détall plan d’action : gère d’éventuelles enveloppes `data` imbriquées
 * (évite un détail « vide » de champs, ex. `commentaire_ids` manquant).
 */
function unwrapRapAppPlanDetail<T extends Record<string, unknown>>(raw: unknown): T {
  let cur: unknown = raw;
  for (let i = 0; i < 5; i += 1) {
    if (!isRecord(cur)) {
      return cur as T;
    }
    if (Array.isArray((cur as { commentaire_ids?: unknown }).commentaire_ids)) {
      return cur as T;
    }
    if (typeof (cur as { id?: unknown }).id === "number" && typeof (cur as { titre?: unknown }).titre === "string") {
      return cur as T;
    }
    if ("data" in cur && (cur as { data: unknown }).data != null) {
      cur = (cur as { data: unknown }).data;
    } else {
      return cur as T;
    }
  }
  return cur as T;
}

/**
 * Extrait l’objet paginé depuis la réponse axios (enveloppe `success` + `data` ou DRF nu).
 */
export function parsePlanActionFormationListResponse(raw: unknown): PlanActionFormationPaginatedData {
  if (!isRecord(raw)) {
    return {
      count: 0,
      page: 1,
      page_size: 10,
      total_pages: 0,
      next: null,
      previous: null,
      results: [],
    };
  }
  const inner: unknown = "data" in raw && isRecord(raw.data) && "results" in raw.data ? raw.data : raw;
  if (!isRecord(inner)) {
    return {
      count: 0,
      page: 1,
      page_size: 10,
      total_pages: 0,
      next: null,
      previous: null,
      results: [],
    };
  }
  const results = Array.isArray(inner.results) ? (inner.results as PlanActionFormationListItem[]) : [];
  return {
    count: typeof inner.count === "number" ? inner.count : 0,
    page: typeof inner.page === "number" ? inner.page : 1,
    page_size: typeof inner.page_size === "number" ? inner.page_size : 10,
    total_pages: typeof inner.total_pages === "number" ? inner.total_pages : 0,
    next: typeof inner.next === "string" || inner.next === null ? (inner.next as string | null) : null,
    previous:
      typeof inner.previous === "string" || inner.previous === null
        ? (inner.previous as string | null)
        : null,
    results,
  };
}

/**
 * N’envoie que des paramètres définis (évite `search=` vides, etc.).
 */
function buildListParams(q: PlanActionFormationListQuery): Record<string, string | number> {
  const p: Record<string, string | number> = {
    page: q.page,
    page_size: q.page_size,
  };
  if (q.search && q.search.trim()) p.search = q.search.trim();
  if (q.statut) p.statut = q.statut;
  if (q.centre != null && Number.isFinite(q.centre)) p.centre = q.centre;
  if (q.formation != null && Number.isFinite(q.formation)) p.formation = q.formation;
  if (q.date_debut_gte) p.date_debut_gte = q.date_debut_gte;
  if (q.date_debut_lte) p.date_debut_lte = q.date_debut_lte;
  if (q.date_fin_gte) p.date_fin_gte = q.date_fin_gte;
  if (q.date_fin_lte) p.date_fin_lte = q.date_fin_lte;
  p.ordering = q.ordering ?? "-date_debut";
  return p;
}

function buildCommentairesGroupesParams(
  q: PlanActionCommentairesGroupesQuery
): Record<string, string | number | boolean> {
  const p: Record<string, string | number | boolean> = {};
  if (q.date_debut) p.date_debut = q.date_debut;
  if (q.date_fin) p.date_fin = q.date_fin;
  if (q.centres != null && q.centres.length > 0) {
    p.centres = q.centres.join(",");
  } else if (q.centre != null && Number.isFinite(q.centre)) {
    p.centre = q.centre;
  }
  if (q.formations != null && q.formations.length > 0) {
    p.formations = q.formations.join(",");
  } else if (q.formation != null && Number.isFinite(q.formation)) {
    p.formation = q.formation;
  }
  if (q.inclure_archives === true) p.inclure_archives = "true";
  if (q.limite != null && Number.isFinite(q.limite)) p.limite = q.limite;
  return p;
}

/** GET détail. */
export async function fetchPlanActionFormationDetail(id: number): Promise<PlanActionFormationDetail> {
  const { data: raw } = await api.get<unknown>(`${LIST_PATH}${id}/`);
  return unwrapRapAppPlanDetail<Record<string, unknown> & PlanActionFormationDetail>(
    unwrapRapAppPayload<unknown>(raw)
  ) as PlanActionFormationDetail;
}

export async function createPlanActionFormation(
  body: PlanActionFormationWriteBody
): Promise<PlanActionFormationDetail> {
  const { data: raw } = await api.post<unknown>(LIST_PATH, body);
  return unwrapRapAppPlanDetail<Record<string, unknown> & PlanActionFormationDetail>(
    unwrapRapAppPayload<unknown>(raw)
  ) as PlanActionFormationDetail;
}

export async function patchPlanActionFormation(
  id: number,
  body: Partial<PlanActionFormationWriteBody>
): Promise<PlanActionFormationDetail> {
  const { data: raw } = await api.patch<unknown>(`${LIST_PATH}${id}/`, body);
  return unwrapRapAppPlanDetail<Record<string, unknown> & PlanActionFormationDetail>(
    unwrapRapAppPayload<unknown>(raw)
  ) as PlanActionFormationDetail;
}

export async function deletePlanActionFormation(id: number): Promise<void> {
  await api.delete(`${LIST_PATH}${id}/`);
}

/**
 * Télécharge le PDF généré par `GET /api/plans-action-formation/:id/export-pdf/`.
 */
export async function downloadPlanActionFormationPdf(id: number): Promise<void> {
  const res = await api.get<Blob>(`${LIST_PATH}${id}/export-pdf/`, { responseType: "blob" });
  const ct = (res.headers as { "content-type"?: string })["content-type"] ?? "application/pdf";
  const blob = new Blob([res.data], { type: ct });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `plan_action_${id}.pdf`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function fetchCommentairesGroupes(
  q: PlanActionCommentairesGroupesQuery
): Promise<PlanActionCommentairesGroupesData> {
  const { data: raw } = await api.get<unknown>(GROUPES_PATH, { params: buildCommentairesGroupesParams(q) });
  return unwrapRapAppPayload<PlanActionCommentairesGroupesData>(raw);
}

/**
 * Récupère la liste paginée des plans d'action formation pour l'écran liste (LOT 4).
 * Ne modifie aucun autre module ; s'appuie uniquement sur l'API dédiée.
 */
export function usePlansActionFormation(params: PlanActionFormationListQuery) {
  const [data, setData] = useState<PlanActionFormationPaginatedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const paramsKey = useMemo(() => JSON.stringify(params), [params]);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const stable = JSON.parse(paramsKey) as PlanActionFormationListQuery;
      const { data: raw } = await api.get(LIST_PATH, { params: buildListParams(stable) });
      setData(parsePlanActionFormationListResponse(raw));
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      setError(
        ax.response?.data && typeof ax.response.data === "object" && "message" in ax.response.data
          ? String((ax.response.data as { message?: string }).message)
          : ax.message || "Erreur lors du chargement des plans d'action."
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [paramsKey]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const pageData = data;

  return {
    data: pageData,
    /** Alias pratique pour le tableau. */
    plans: pageData?.results ?? [],
    loading,
    error,
    refetch,
    count: pageData?.count ?? 0,
    page: pageData?.page ?? params.page,
    pageSize: pageData?.page_size ?? params.page_size,
    totalPages: pageData?.total_pages ?? 0,
  };
}
