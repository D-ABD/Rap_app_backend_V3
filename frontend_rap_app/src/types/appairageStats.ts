// src/types/appairageStats.ts
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import api from "../api/axios";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────
export type AppairageFilters = {
  date_from?: string;
  date_to?: string;
  centre?: string | number;
  departement?: string;
  formation?: string | number;
  partenaire?: string | number;
  statut?: string; // transmis, en_attente, ...
  avec_archivees?: boolean; // ← NEW
};

export type AppairageStatusMap = Record<string, number>;

export type AppairageOverviewKpis = {
  appairages_total: number;
  nb_candidats_distincts: number;
  nb_partenaires_distincts: number;
  nb_formations_distinctes: number;
  statuts: AppairageStatusMap; // clés safe: "contrat_a_signer", "appairage_ok", ...
  /** Ajouté par le viewset : appairage_ok / total (en %) */
  taux_transformation?: number;
  /** Inclure aussi les appairages archivés (false par défaut) */
  avec_archivees?: boolean;
};

export type AppairageOverviewResponse = {
  kpis: AppairageOverviewKpis;
  filters_echo: Record<string, string>;
  // le backend peut aussi renvoyer repartition.par_statut ; inutile de le typer si non utilisé
};

export type AppairageGroupBy = "centre" | "departement" | "statut" | "formation" | "partenaire";

export type AppairageGroupRow = {
  // group id/label
  group_key?: string | number | null;
  group_label?: string;

  // matières premières (selon group_by)
  formation__centre__nom?: string | null;
  formation__centre_id?: number | null;
  departement?: string | null;
  statut?: string | null;
  formation__nom?: string | null;
  formation_id?: number | null;
  partenaire__nom?: string | null;
  partenaire_id?: number | null;

  // métriques
  appairages_total: number;
  nb_candidats: number;
  nb_partenaires: number;
  nb_formations: number;

  /** Ajout: taux_transformation par ligne (ok/total en %) */
  taux_transformation?: number;

  // statuts dynamiques (ex: a_faire, transmis, appairage_ok, etc.)
  [statusKey: string]: number | string | null | undefined;
};

export type AppairageGroupedResponse = {
  group_by: AppairageGroupBy;
  results: AppairageGroupRow[];
  filters_echo?: Record<string, string>;
};

export type AppairageTopsResponse = {
  top_partenaires: { id: number | null; nom: string; count: number }[];
  top_formations: { id: number | null; nom: string; count: number }[];
  filters_echo?: Record<string, string>;
};

// ────────────────────────────────────────────────────────────
export function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Erreur inconnue";
}

export function resolveAppairageGroupLabel(row: AppairageGroupRow, by: AppairageGroupBy): string {
  if (row.group_label) return String(row.group_label);
  switch (by) {
    case "centre":
      return (
        row["formation__centre__nom"] ??
        (row.formation__centre_id ? `Centre #${row.formation__centre_id}` : "—")
      );
    case "departement":
      return row.departement ?? "—";
    case "statut":
      return row.statut ?? "—";
    case "formation":
      return row.formation__nom ?? (row.formation_id ? `Formation #${row.formation_id}` : "—");
    case "partenaire":
      return row.partenaire__nom ?? (row.partenaire_id ? `Partenaire #${row.partenaire_id}` : "—");
    default:
      return "—";
  }
}

// ────────────────────────────────────────────────────────────
export async function getAppairageOverview(filters: AppairageFilters) {
  const { data } = await api.get<AppairageOverviewResponse>("/appairage-stats/", {
    params: filters,
  });
  return data;
}

export async function getAppairageGrouped(by: AppairageGroupBy, filters: AppairageFilters) {
  const { data } = await api.get<AppairageGroupedResponse>("/appairage-stats/grouped/", {
    params: { ...filters, by },
  });
  return data;
}

export async function getAppairageTops(filters: AppairageFilters) {
  const { data } = await api.get<AppairageTopsResponse>("/appairage-stats/tops/", {
    params: filters,
  });
  return data;
}

// ────────────────────────────────────────────────────────────
// Hooks (React Query v5: placeholderData: keepPreviousData)
// ────────────────────────────────────────────────────────────
const REFRESH_MS = 15_000; // auto-refresh "temps réel" léger (enlève si non voulu)

export function useAppairageOverview(filters: AppairageFilters) {
  return useQuery<AppairageOverviewResponse, Error>({
    queryKey: ["appairage-stats:overview", filters],
    queryFn: () => getAppairageOverview(filters),
    staleTime: 30_000,
    refetchInterval: REFRESH_MS,
    placeholderData: keepPreviousData,
  });
}

export function useAppairageGrouped(by: AppairageGroupBy, filters: AppairageFilters) {
  return useQuery<AppairageGroupedResponse, Error>({
    queryKey: ["appairage-stats:grouped", by, filters],
    queryFn: () => getAppairageGrouped(by, filters),
    staleTime: 30_000,
    refetchInterval: REFRESH_MS,
    placeholderData: keepPreviousData,
  });
}

export function useAppairageTops(filters: AppairageFilters) {
  return useQuery<AppairageTopsResponse, Error>({
    queryKey: ["appairage-stats:tops", filters],
    queryFn: () => getAppairageTops(filters),
    staleTime: 30_000,
    refetchInterval: REFRESH_MS,
    placeholderData: keepPreviousData,
  });
}
