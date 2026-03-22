// src/types/appairageCommentStats.ts
import { useQuery } from "@tanstack/react-query";
import api from "../api/axios";

// ────────────────────────────────────────────────────────────
// Types & filtres
// ────────────────────────────────────────────────────────────
export type AppairageCommentFilters = {
  date_from?: string;
  date_to?: string;

  centre?: number | string;
  departement?: string; // "92", "75", ...

  formation?: number | string;
  partenaire?: number | string;
  owner?: number | string;

  statut?: string; // snapshot ou statut courant

  search?: string;
  limit?: number;
};

export type AppairageCommentItem = {
  id: number;
  appairage_id: number;

  centre_nom?: string | null;
  formation_nom?: string | null;
  partenaire_nom?: string | null;

  num_offre?: string | null; // 🔹 ajouté
  type_offre_nom?: string | null; // 🔹 ajouté

  statut_snapshot?: string | null;

  body: string; // aperçu

  auteur: string;
  date: string; // "DD/MM/YYYY"
  heure: string; // "HH:MM"
  created_at: string;
  updated_at: string | null;

  is_recent: boolean;
  is_edited: boolean;
};

export type AppairageCommentLatestResponse = {
  count: number;
  results: AppairageCommentItem[];
  filters_echo: Record<string, string>;
};

// ────────────────────────────────────────────────────────────
// Grouped (centre | departement)
// ────────────────────────────────────────────────────────────
export type AppairageCommentGroupBy = "centre" | "departement";

export type AppairageCommentGroupRow = {
  group_key: number | string | null;
  group_label: string;
  total: number;

  // Champs bruts possibles (suivant le by)
  appairage__formation__centre_id?: number | null;
  appairage__formation__centre__nom?: string | null;
  departement?: string | null;
};

export type AppairageCommentGroupedResponse = {
  group_by: AppairageCommentGroupBy;
  results: AppairageCommentGroupRow[];
  filters_echo: Record<string, string>;
};

// ────────────────────────────────────────────────────────────
// Normalisation des filtres envoyés à l’API
// ────────────────────────────────────────────────────────────
function normalizeFilters(filters: AppairageCommentFilters) {
  const out: Record<string, unknown> = { ...filters };

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
export async function getAppairageCommentLatest(filters: AppairageCommentFilters) {
  const params = normalizeFilters(filters);
  const { data } = await api.get<AppairageCommentLatestResponse>(
    "/appairage-comment-stats/latest/",
    { params }
  );
  return data;
}

// Hook — Latest
export function useAppairageCommentLatest(filters: AppairageCommentFilters) {
  return useQuery<AppairageCommentLatestResponse, Error>({
    queryKey: ["appairage-comment-stats:latest", filters],
    queryFn: () => getAppairageCommentLatest(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

// ────────────────────────────────────────────────────────────
// API — Grouped
// ────────────────────────────────────────────────────────────
export async function getAppairageCommentGrouped(
  by: AppairageCommentGroupBy,
  filters: AppairageCommentFilters
) {
  const params = { by, ...normalizeFilters(filters) };
  const { data } = await api.get<AppairageCommentGroupedResponse>(
    "/appairage-comment-stats/grouped/",
    { params }
  );
  return data;
}

// Hook — Grouped
export function useAppairageCommentGrouped(
  by: AppairageCommentGroupBy,
  filters: AppairageCommentFilters
) {
  return useQuery<AppairageCommentGroupedResponse, Error>({
    queryKey: ["appairage-comment-stats:grouped", by, filters],
    queryFn: () => getAppairageCommentGrouped(by, filters),
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  });
}
