// src/types/partenaireStats.ts
import { useQuery } from "@tanstack/react-query";
import api from "../api/axios";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────
export type PartenaireFilters = {
  date_from?: string;
  date_to?: string;
  centre?: string | number;
  departement?: string;
  type?: string;
  actions?: string;
  secteur?: string;
};

export type ProspectionStatusMap = Record<string, number>;
export type AppairageStatusMap = Record<string, number>;

export type PartenaireOverviewKpis = {
  nb_partenaires: number;
  nb_avec_contact: number;
  nb_avec_web: number;
  nb_avec_adresse: number;
  nb_formations_liees: number;
  prospections_total: number;
  appairages_total: number;
  prospections: ProspectionStatusMap;
  appairages: AppairageStatusMap;
};

export type PartenaireOverviewResponse = {
  kpis: PartenaireOverviewKpis;
  // L'API n'envoie pas forcément cet écho : on le rend optionnel
  filters_echo?: Record<string, string>;
};

export type PartenaireGroupBy = "type" | "secteur" | "centre" | "departement" | "actions";

// (facultatif) listes de clés connues si tu veux éviter les "as any" côté UI
export type KnownProspectionStatusKeys =
  | "a_faire"
  | "en_cours"
  | "a_relancer"
  | "acceptee"
  | "refusee"
  | "annulee"
  | "non_renseigne";

export type KnownAppairageStatusKeys =
  | "transmis"
  | "en_attente"
  | "accepte"
  | "refuse"
  | "annule"
  | "contrat_a_signer"
  | "contrat_en_attente"
  | "appairage_ok"
  // ⚠️ Conflit "a_faire" résolu côté API par "app_a_faire"
  | "app_a_faire";

export type PartenaireGroupRow = {
  // group id/label renvoyés par l'API
  group_key?: string | number | null;
  group_label?: string;

  // champs bruts éventuels
  type?: string | null;
  secteur_activite?: string | null;
  default_centre_id?: number | null;
  default_centre__nom?: string | null;
  departement?: string | null;
  actions?: string | null;

  // métriques
  nb_partenaires: number;
  nb_avec_contact: number;
  nb_avec_web: number;
  nb_avec_adresse: number;

  prospections_total: number;
  appairages_total: number;

  // On laisse une index signature souple pour les clés dynamiques de statuts
  [status: string]: number | string | null | undefined;
};

export type PartenaireGroupedResponse = {
  // l'API renvoie "by"
  by: PartenaireGroupBy;
  results: PartenaireGroupRow[];
};

export type PartenaireTopsResponse = {
  top_appairages: { id: number; nom: string; count: number }[];
  top_prospections: { id: number; nom: string; count: number }[];
};

// ────────────────────────────────────────────────────────────
// Utils
// ────────────────────────────────────────────────────────────
export function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Erreur inconnue";
}

export function resolvePartenaireGroupLabel(
  row: PartenaireGroupRow,
  by: PartenaireGroupBy
): string {
  if (row.group_label) return String(row.group_label);
  if (by === "centre" && row["default_centre__nom"]) return String(row["default_centre__nom"]);
  if (by === "type" && row.type) return String(row.type);
  if (by === "secteur" && row.secteur_activite) return String(row.secteur_activite);
  if (by === "departement" && row.departement) return String(row.departement);
  if (by === "actions" && row.actions) return String(row.actions);

  if (by === "centre")
    return row.default_centre_id != null ? `Centre #${row.default_centre_id}` : "—";
  if (by === "departement") return row.departement ?? "—";
  return "—";
}

// ────────────────────────────────────────────────────────────
// API
// ────────────────────────────────────────────────────────────
export async function getPartenaireOverview(filters: PartenaireFilters) {
  const { data } = await api.get<PartenaireOverviewResponse>("/partenaire-stats/", {
    params: filters,
  });
  return data;
}

export async function getPartenaireGrouped(by: PartenaireGroupBy, filters: PartenaireFilters) {
  const { data } = await api.get<PartenaireGroupedResponse>("/partenaire-stats/grouped/", {
    params: { ...filters, by },
  });
  return data;
}

export async function getPartenaireTops(filters: PartenaireFilters) {
  const { data } = await api.get<PartenaireTopsResponse>("/partenaire-stats/tops/", {
    params: filters,
  });
  return data;
}

// ────────────────────────────────────────────────────────────
export function usePartenaireOverview(filters: PartenaireFilters) {
  return useQuery<PartenaireOverviewResponse, Error>({
    queryKey: ["partenaire-stats:overview", filters],
    queryFn: () => getPartenaireOverview(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function usePartenaireGrouped(by: PartenaireGroupBy, filters: PartenaireFilters) {
  return useQuery<PartenaireGroupedResponse, Error>({
    queryKey: ["partenaire-stats:grouped", by, filters],
    queryFn: () => getPartenaireGrouped(by, filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function usePartenaireTops(filters: PartenaireFilters) {
  return useQuery<PartenaireTopsResponse, Error>({
    queryKey: ["partenaire-stats:tops", filters],
    queryFn: () => getPartenaireTops(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}
