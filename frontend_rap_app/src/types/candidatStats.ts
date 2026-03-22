// src/types/candidatStats.ts
import { useQuery } from "@tanstack/react-query";
import api from "../api/axios";

// ────────────────────────────────────────────────────────────
// Types & filtres
// ────────────────────────────────────────────────────────────
export type CandidatFilters = {
  date_from?: string;
  date_to?: string;

  formation?: number | string;
  centre?: number | string;
  departement?: string; // "92", "75", ...

  statut?: string;
  type_contrat?: string;
  cv_statut?: string;
  resultat_placement?: string;
  contrat_signe?: string;

  responsable?: number | string; // user id
  entreprise?: number | string; // partenaire id

  entretien_ok?: boolean;
  test_ok?: boolean;
  gespers?: boolean;
  admissible?: boolean;
  rqth?: boolean;
  avec_archivees?: boolean;
};

// KPI candidats (globaux)
export type CandidatKpis = {
  total: number;
  entretien_ok: number;
  test_ok: number;
  gespers: number;
  admissibles: number;
  en_formation: number;
  en_appairage: number;
  en_accompagnement: number;

  // ⭐️ nouveaux compteurs
  rqth_count: number; // ← ajouté
  osia_count: number; // candidats avec numero_osia non vide
  cv_renseigne: number; // cv_statut renseigné (non null/vidé)
  courrier_rentree_count: number; // courrier_rentree = True
  ateliers_tre_total: number; // nombre d'ateliers TRE distincts liés

  // contrats (POEI/POEC fusionnés)
  contrat_apprentissage: number;
  contrat_professionnalisation: number;
  contrat_poei_poec: number; // ← fusionné
  contrat_crif: number; // ← ajouté
  contrat_sans: number;
  contrat_autre: number;
};

// KPI appairages (globaux)
export type AppairageKpis = {
  appairages_total: number;
  app_transmis: number;
  app_en_attente: number;
  app_accepte: number;
  app_refuse: number;
  app_annule: number;
  app_a_faire: number;
  app_contrat_a_signer: number;
  app_contrat_en_attente: number;
  app_appairage_ok: number;
};

export type Repartition = {
  par_statut: { statut: string | null; count: number }[];
  par_type_contrat: { type_contrat: string | null; count: number }[];
  par_cv: { cv_statut: string | null; count: number }[];
  par_resultat: { resultat_placement: string | null; count: number }[];
};

export type CandidatOverviewResponse = {
  kpis: CandidatKpis;
  appairages: AppairageKpis;
  repartition: Repartition;
  filters_echo: Record<string, string>;
};

export type CandidatGroupBy =
  | "centre"
  | "departement"
  | "formation"
  | "statut"
  | "type_contrat"
  | "cv_statut"
  | "resultat_placement"
  | "contrat_signe"
  | "responsable"
  | "entreprise";

export type CandidatGroupRow = {
  // identifiants potentiellement renvoyés
  formation__centre_id?: number;
  formation__centre__nom?: string;

  formation_id?: number;
  formation__nom?: string;

  departement?: string;
  statut?: string | null;
  type_contrat?: string | null;
  formation__num_offre?: string | null;
  cv_statut?: string | null;
  resultat_placement?: string | null;
  contrat_signe?: string | null;

  responsable_placement_id?: number | null;

  entreprise_placement_id?: number | null;
  entreprise_placement__nom?: string | null;

  // fournis par le backend (recommandé)
  group_key?: number | string | null;
  group_label?: string;

  // KPIs candidats par groupe
  total: number;
  entretien_ok: number;
  test_ok: number;
  gespers: number;
  admissibles: number;
  en_formation: number;
  en_appairage: number;

  // ⭐️ nouveaux compteurs (groupés)
  osia_count: number;
  rqth_count: number; // ← ajouté
  cv_renseigne: number;
  courrier_rentree_count: number;
  ateliers_tre_total: number; // ← nouveau

  // contrats par groupe (POEI/POEC fusionnés)
  contrat_apprentissage: number;
  contrat_professionnalisation: number;
  contrat_poei_poec: number; // ← fusionné
  contrat_sans: number;
  contrat_crif: number; // ← ajouté
  contrat_autre: number;

  // appairages par groupe
  appairages_total: number;
  app_transmis: number;
  app_en_attente: number;
  app_accepte: number;
  app_refuse: number;
  app_annule: number;
  app_a_faire: number;
  app_contrat_a_signer: number;
  app_contrat_en_attente: number;
  app_appairage_ok: number;
};

export type CandidatGroupedResponse = {
  group_by: CandidatGroupBy;
  results: CandidatGroupRow[];
};

// ────────────────────────────────────────────────────────────
export function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Erreur inconnue";
}

/**
 * Résolution du libellé d’un groupe.
 * 1) Préfère `group_label` si présent (backend v2).
 * 2) Sinon tente les champs présents selon `by`.
 * 3) Fallback lisible.
 */
export function resolveCandidatGroupLabel(row: CandidatGroupRow, by: CandidatGroupBy): string {
  if (row.group_label && String(row.group_label).trim() !== "") return String(row.group_label);

  if (by === "centre" && row["formation__centre__nom"])
    return String(row["formation__centre__nom"]);
  if (by === "formation" && row["formation__nom"]) return String(row["formation__nom"]);
  if (by === "departement" && row.departement) return String(row.departement);
  if (by === "entreprise" && row["entreprise_placement__nom"])
    return String(row["entreprise_placement__nom"]);

  if (by === "statut" && row.statut != null) return String(row.statut);
  if (by === "type_contrat" && row.type_contrat != null) return String(row.type_contrat);
  if (by === "cv_statut" && row.cv_statut != null) return String(row.cv_statut);
  if (by === "resultat_placement" && row.resultat_placement != null)
    return String(row.resultat_placement);
  if (by === "contrat_signe" && row.contrat_signe != null) return String(row.contrat_signe);

  if (by === "centre")
    return row.formation__centre_id != null ? `Centre #${row.formation__centre_id}` : "—";
  if (by === "formation") return row.formation_id != null ? `Formation #${row.formation_id}` : "—";
  if (by === "departement") return row.departement ?? "—";
  if (by === "entreprise")
    return row.entreprise_placement_id != null ? `Entreprise #${row.entreprise_placement_id}` : "—";
  if (by === "responsable")
    return row.responsable_placement_id != null ? `User #${row.responsable_placement_id}` : "—";
  if (by === "statut") return row.statut ?? "—";
  if (by === "type_contrat") return row.type_contrat ?? "—";
  if (by === "cv_statut") return row.cv_statut ?? "—";
  if (by === "resultat_placement") return row.resultat_placement ?? "—";
  if (by === "contrat_signe") return row.contrat_signe ?? "—";
  return "—";
}

// ────────────────────────────────────────────────────────────
/** Transforme les booléens en string compatible query ("true"/"false"). */
function normalizeFilters(filters: CandidatFilters) {
  const out: Record<string, unknown> = { ...filters };
  const boolKeys: (keyof CandidatFilters)[] = [
    "entretien_ok",
    "test_ok",
    "gespers",
    "admissible",
    "rqth",
  ];
  for (const k of boolKeys) {
    const v = filters[k];
    if (typeof v === "boolean") out[k] = v ? "true" : "false";
  }
  return out;
}

// ────────────────────────────────────────────────────────────
// API
// ────────────────────────────────────────────────────────────
export async function getCandidatOverview(filters: CandidatFilters) {
  const params = normalizeFilters(filters);
  const { data } = await api.get<CandidatOverviewResponse>("/candidat-stats/", {
    params,
  });
  return data;
}

export async function getCandidatGrouped(by: CandidatGroupBy, filters: CandidatFilters) {
  const params = { ...normalizeFilters(filters), by };
  const { data } = await api.get<CandidatGroupedResponse>("/candidat-stats/grouped/", { params });
  return data;
}

// ────────────────────────────────────────────────────────────
// Hooks (TanStack Query v5)
// ────────────────────────────────────────────────────────────
export function useCandidatOverview(filters: CandidatFilters) {
  return useQuery<CandidatOverviewResponse, Error>({
    queryKey: ["candidat-stats:overview", filters],
    queryFn: () => getCandidatOverview(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useCandidatGrouped(by: CandidatGroupBy, filters: CandidatFilters) {
  return useQuery<CandidatGroupedResponse, Error>({
    queryKey: ["candidat-stats:grouped", by, filters],
    queryFn: () => getCandidatGrouped(by, filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}
