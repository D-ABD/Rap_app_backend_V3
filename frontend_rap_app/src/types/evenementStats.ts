import { useQuery } from "@tanstack/react-query";
import api from "../api/axios";

export type EvenementStatsFilters = {
  date_min?: string;
  date_max?: string;
  centre?: string | number;
  formation?: string | number;
  type_evenement?: string;
  statut?: string;
};

export type EvenementOverviewKpis = {
  total: number;
  passes: number;
  aujourd_hui: number;
  bientot: number;
  a_venir: number;
  sans_date: number;
  avec_formation: number;
  sans_formation: number;
  participants_prevus: number;
  participants_reels: number;
  taux_moyen_participation: number;
  taux_remplissage_global: number;
};

export type EvenementBreakdownRow = {
  code: string | null;
  label: string;
  count: number;
  participants_prevus?: number;
  participants_reels?: number;
};

export type EvenementOverviewResponse = {
  kpis: EvenementOverviewKpis;
  repartition: {
    par_type: EvenementBreakdownRow[];
    par_statut: EvenementBreakdownRow[];
  };
  filters_echo: Record<string, string>;
};

export type EvenementGroupBy = "centre" | "formation" | "type" | "statut";

export type EvenementGroupRow = {
  group_key?: string | number | null;
  group_label?: string;
  formation__centre_id?: number;
  formation__centre__nom?: string;
  formation_id?: number;
  formation__nom?: string;
  formation__num_offre?: string | number | null;
  type_evenement?: string | null;
  status_temporel?: string | null;
  total: number;
  passes: number;
  aujourd_hui: number;
  bientot: number;
  a_venir: number;
  sans_date: number;
  avec_formation: number;
  sans_formation: number;
  participants_prevus: number;
  participants_reels: number;
  taux_moyen_participation: number;
  taux_remplissage_global: number;
};

export type EvenementGroupedResponse = {
  group_by: EvenementGroupBy;
  results: EvenementGroupRow[];
};

export function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Erreur inconnue";
}

export async function getEvenementOverview(filters: EvenementStatsFilters) {
  const { data } = await api.get<EvenementOverviewResponse>("/evenement-stats/", { params: filters });
  return data;
}

export async function getEvenementGrouped(by: EvenementGroupBy, filters: EvenementStatsFilters) {
  const { data } = await api.get<EvenementGroupedResponse>("/evenement-stats/grouped/", {
    params: { ...filters, by },
  });
  return data;
}

export function useEvenementOverview(filters: EvenementStatsFilters) {
  return useQuery<EvenementOverviewResponse, Error>({
    queryKey: ["evenement-stats:overview", filters],
    queryFn: () => getEvenementOverview(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useEvenementGrouped(by: EvenementGroupBy, filters: EvenementStatsFilters) {
  return useQuery<EvenementGroupedResponse, Error>({
    queryKey: ["evenement-stats:grouped", by, filters],
    queryFn: () => getEvenementGrouped(by, filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function resolveEvenementGroupLabel(row: EvenementGroupRow, by: EvenementGroupBy): string {
  if (typeof row.group_label === "string" && row.group_label.trim() !== "") return row.group_label;
  if (by === "centre") return row.formation__centre__nom || "Centre non renseigné";
  if (by === "formation") return row.formation__nom || "Formation non renseignée";
  if (by === "type") return row.type_evenement || "—";
  if (by === "statut") return row.status_temporel || "—";
  return "—";
}
