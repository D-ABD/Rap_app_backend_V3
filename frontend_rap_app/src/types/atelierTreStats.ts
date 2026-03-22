import { useQuery } from "@tanstack/react-query";
import api from "../api/axios";

// ────────────────────────────────────────────────────────────
// Labels (facultatif : utile côté UI si besoin)
// ────────────────────────────────────────────────────────────
export const ATELIER_TYPE_LABELS: Record<string, string> = {
  atelier_1: "Atelier 1 - Exploration et positionnement",
  atelier_2: "Atelier 2 - CV et lettre de motivation",
  atelier_3: "Atelier 3 - Simulation entretien",
  atelier_4: "Atelier 4 - Prospection entreprise",
  atelier_5: "Atelier 5 - Réseaux sociaux pro",
  atelier_6: "Atelier 6 - Posture professionnelle",
  atelier_7: "Atelier 7 - Bilan et plan d’action",
  autre: "Autre",
};

export type AtelierTypeKey = keyof typeof ATELIER_TYPE_LABELS;

// ────────────────────────────────────────────────────────────
export type AtelierTREFilters = {
  date_from?: string;
  date_to?: string;
  centre?: string | number; // côté UI on envoie un number, mais on laisse string pour tolérance
  departement?: string; // ex: "06", "75" (on garde les zéros à gauche)
  type_atelier?: AtelierTypeKey | string; // on accepte aussi une valeur inconnue éventuelle
};

export type PresenceCounts = {
  inconnu: number;
  present: number;
  absent: number;
  excuse: number;
};

export type TypeCountsMap = Record<string, number>; // { "atelier_1": n, ... }

export type AtelierTREOverviewKpis = {
  nb_ateliers: number;
  nb_candidats_uniques: number;
  inscrits_total: number;
  ateliers: TypeCountsMap;
  presences_total: number;
  presences: PresenceCounts;
  taux_presence?: number | null; // ✅ nouveau champ optionnel
};

export type AtelierTREOverviewResponse = {
  kpis: AtelierTREOverviewKpis;
  filters_echo: Record<string, string>;
};

export type AtelierTREGroupBy = "centre" | "departement" | "type_atelier";

export type AtelierTREGroupRow = {
  group_key?: string | number | null;
  group_label?: string | null;

  centre_id?: number | null;
  centre__nom?: string | null;

  // Nouveau champ aligné avec l’API (annotation departement)
  departement?: string | null;
  // Compat rétro si jamais un ancien code renvoie encore ce champ :
  centre__departement?: string | null;

  type_atelier?: AtelierTypeKey | string | null;

  nb_ateliers: number;
  candidats_uniques: number;
  presences_total: number;

  inconnu: number;
  present: number;
  absent: number;
  excuse: number;

  taux_presence?: number | null; // ✅ nouveau champ optionnel
};

export type AtelierTREGroupedResponse = {
  by: AtelierTREGroupBy;
  results: AtelierTREGroupRow[];
  filters_echo: Record<string, string>;
};

export type AtelierTopsResponse = {
  top_types: { type_atelier: string; label: string; count: number }[];
  top_centres: { id: number | null; nom: string; count: number }[];
  filters_echo: Record<string, string>;
};

// ────────────────────────────────────────────────────────────
// Utils
// ────────────────────────────────────────────────────────────
export function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Erreur inconnue";
}

export function resolveGroupLabel(row: AtelierTREGroupRow): string {
  if (row.group_label && String(row.group_label).trim() !== "") return String(row.group_label);
  if (row["centre__nom"]) return String(row["centre__nom"]);
  if (row.type_atelier) {
    const key = row.type_atelier as AtelierTypeKey;
    return ATELIER_TYPE_LABELS[key] ?? String(row.type_atelier);
  }
  if (row.departement) return String(row.departement);
  if (row["centre__departement"]) return String(row["centre__departement"]);
  return "—";
}

/**
 * Sanitize/normalise des filtres côté front avant envoi API.
 * - supprime les champs vides
 * - centre → number
 * - departement → 2 caractères, zéros à gauche si besoin
 */
export function sanitizeAtelierTREFilters(f: AtelierTREFilters): AtelierTREFilters {
  const out: AtelierTREFilters = {};

  if (typeof f.date_from === "string" && f.date_from.trim() !== "") out.date_from = f.date_from;
  if (typeof f.date_to === "string" && f.date_to.trim() !== "") out.date_to = f.date_to;

  if (f.centre !== undefined && f.centre !== null && `${f.centre}`.trim() !== "") {
    const n = Number(f.centre);
    if (!Number.isNaN(n)) out.centre = n;
  }

  if (typeof f.departement === "string" && f.departement.trim() !== "") {
    out.departement = f.departement.trim().padStart(2, "0").slice(0, 2);
  }

  if (typeof f.type_atelier === "string" && f.type_atelier.trim() !== "") {
    out.type_atelier = f.type_atelier;
  }

  return out;
}

// ────────────────────────────────────────────────────────────
// API calls
// ────────────────────────────────────────────────────────────
export async function getAtelierTREOverview(filters: AtelierTREFilters) {
  const { data } = await api.get<AtelierTREOverviewResponse>("/ateliertre-stats/", {
    params: filters,
  });
  return data;
}

export async function getAtelierTREGrouped(by: AtelierTREGroupBy, filters: AtelierTREFilters) {
  const { data } = await api.get<AtelierTREGroupedResponse>("/ateliertre-stats/grouped/", {
    params: { ...filters, by },
  });
  return data;
}

export async function getAtelierTRETops(filters: AtelierTREFilters) {
  const { data } = await api.get<AtelierTopsResponse>("/ateliertre-stats/tops/", {
    params: filters,
  });
  return data;
}

// ────────────────────────────────────────────────────────────
// Hooks
// ────────────────────────────────────────────────────────────
export function useAtelierTREOverview(filters: AtelierTREFilters) {
  return useQuery<AtelierTREOverviewResponse, Error>({
    queryKey: ["ateliertre:overview", filters],
    queryFn: () => getAtelierTREOverview(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useAtelierTREGrouped(by: AtelierTREGroupBy, filters: AtelierTREFilters) {
  return useQuery<AtelierTREGroupedResponse, Error>({
    queryKey: ["ateliertre:grouped", by, filters],
    queryFn: () => getAtelierTREGrouped(by, filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useAtelierTRETops(filters: AtelierTREFilters) {
  return useQuery<AtelierTopsResponse, Error>({
    queryKey: ["ateliertre:tops", filters],
    queryFn: () => getAtelierTRETops(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}
