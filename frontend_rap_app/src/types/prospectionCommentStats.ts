// src/types/prospectionCommentStats.ts
import { useQuery } from "@tanstack/react-query";
import api from "../api/axios";

// ────────────────────────────────────────────────────────────
// Types & filtres
// ────────────────────────────────────────────────────────────
export type ProspectionCommentFilters = {
  date_from?: string;
  date_to?: string;

  centre?: number | string;
  departement?: string; // "92", "75", ...

  formation?: number | string;
  partenaire?: number | string;
  owner?: number | string;

  is_internal?: boolean; // force incl./excl. si fourni
  search?: string;
  limit?: number;
};

export type ProspectionCommentItem = {
  id: number;
  prospection_id: number | null;
  prospection_text: string | null;

  centre_nom?: string | null;
  formation_nom?: string | null;
  partenaire_nom?: string | null;

  // ✅ ajoutés
  num_offre?: string | null;
  type_offre_nom?: string | null;
  start_date?: string | null;
  end_date?: string | null;

  statut?: string | null;
  type_prospection?: string | null;
  objectif?: string | null;

  body: string; // aperçu
  is_internal: boolean;

  auteur: string;
  date: string; // "DD/MM/YYYY"
  heure: string; // "HH:MM"
  created_at: string;
  updated_at: string | null;

  is_recent: boolean;
  is_edited: boolean;
};

export type ProspectionCommentLatestResponse = {
  count: number;
  results: ProspectionCommentItem[];
  filters_echo: Record<string, string>;
};

// ────────────────────────────────────────────────────────────
// Grouped (pour alimenter les selects Centre / Département)
// ────────────────────────────────────────────────────────────
export type ProspectionCommentGroupBy = "centre" | "departement";

export type ProspectionCommentGroupRow = {
  group_key: number | string | null;
  group_label: string;
  total: number;

  prospection__centre_id?: number | null;
  prospection__centre__nom?: string | null;
  departement?: string | null;
};

export type ProspectionCommentGroupedResponse = {
  group_by: ProspectionCommentGroupBy;
  results: ProspectionCommentGroupRow[];
  filters_echo: Record<string, string>;
};

// ────────────────────────────────────────────────────────────
// Normalisation des filtres envoyés à l’API
// ────────────────────────────────────────────────────────────
function normalizeFilters(filters: ProspectionCommentFilters) {
  const out: Record<string, unknown> = { ...filters };

  if (typeof filters.is_internal === "boolean") {
    out.is_internal = filters.is_internal ? "true" : "false";
  }

  if (filters.departement != null) {
    const d = String(filters.departement).trim().slice(0, 2);
    if (d) out.departement = d;
    else delete out.departement;
  }

  Object.keys(out).forEach((k) => {
    const v = out[k as keyof typeof out];
    if (v === "" || v === undefined || v === null) {
      delete out[k];
    }
  });

  return out;
}

// ────────────────────────────────────────────────────────────
// API — Latest
// ────────────────────────────────────────────────────────────
export async function getProspectionCommentLatest(filters: ProspectionCommentFilters) {
  const params = normalizeFilters(filters);
  const { data } = await api.get<ProspectionCommentLatestResponse>(
    "/prospection-comment-stats/latest/",
    { params }
  );
  return data;
}

// Hook — Latest
export function useProspectionCommentLatest(filters: ProspectionCommentFilters) {
  return useQuery<ProspectionCommentLatestResponse, Error>({
    queryKey: ["prospection-comment-stats:latest", filters],
    queryFn: () => getProspectionCommentLatest(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

// ────────────────────────────────────────────────────────────
// API — Grouped
// ────────────────────────────────────────────────────────────
export async function getProspectionCommentGrouped(
  by: ProspectionCommentGroupBy,
  filters: ProspectionCommentFilters
) {
  const params = { by, ...normalizeFilters(filters) };
  const { data } = await api.get<ProspectionCommentGroupedResponse>(
    "/prospection-comment-stats/grouped/",
    { params }
  );
  return data;
}

// Hook — Grouped
export function useProspectionCommentGrouped(
  by: ProspectionCommentGroupBy,
  filters: ProspectionCommentFilters
) {
  return useQuery<ProspectionCommentGroupedResponse, Error>({
    queryKey: ["prospection-comment-stats:grouped", by, filters],
    queryFn: () => getProspectionCommentGrouped(by, filters),
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  });
}
