// src/types/prospectionStats.ts
import { useQuery } from "@tanstack/react-query";
import api from "../api/axios";

// ────────────────────────────────────────────────────────────
// Types — filtres & enums
// ────────────────────────────────────────────────────────────
export type ProspectionFilters = {
  date_from?: string;
  date_to?: string;
  centre?: string | number;
  departement?: string; // "92", "75", ...
  formation?: string | number;
  partenaire?: string | number;
  owner?: string | number; // user id
  statut?: string; // ProspectionChoices
  objectif?: string; // ProspectionChoices
  motif?: string; // ProspectionChoices
  type?: string; // ProspectionChoices (type_prospection)
  relance_due?: boolean | string | number; // true/false/1/0
  /** ✅ Nouveau : inclure les prospections archivées */
  avec_archivees?: boolean | string | number;
};

export type ProspectionOverviewKpis = {
  total: number;
  actives: number;
  a_relancer: number;

  acceptees: number;
  refusees: number;
  annulees: number;

  en_cours: number;
  a_faire: number;
  a_relancer_statut: number;
  non_renseigne: number;

  /** Taux de transformation (% acceptées / total), calculé côté API */
  taux_acceptation: number;
};

export type StatutBreakdown = {
  code: string | null;
  label?: string; // fourni par l'API
  count: number;
};

export type KeyCount = { key: string | null; count: number };

export type ProspectionRepartition = {
  par_statut: StatutBreakdown[];
  par_objectif: KeyCount[];
  par_motif: KeyCount[];
  par_type: KeyCount[];
  par_moyen_contact: KeyCount[];
};

export type ProspectionOverviewResponse = {
  kpis: ProspectionOverviewKpis;
  repartition: ProspectionRepartition;
  filters_echo: Record<string, string>;
};

// ────────────────────────────────────────────────────────────
// Grouped
// ────────────────────────────────────────────────────────────
export type ProspectionGroupBy =
  | "centre"
  | "departement"
  | "owner"
  | "formation"
  | "partenaire"
  | "statut"
  | "objectif"
  | "motif"
  | "type";

export type ProspectionGroupRow = {
  // identifiants potentiellement renvoyés par l’API
  centre_id?: number;
  centre__nom?: string;

  departement?: string;

  owner_id?: number;
  owner__first_name?: string;
  owner__last_name?: string;
  owner__email?: string;
  owner__username?: string;

  formation_id?: number;
  formation__nom?: string;

  // ✅ champs formation additionnels (exposés quand by=formation)
  formation__num_offre?: string | number | null;
  formation__centre__nom?: string | null;

  partenaire_id?: number;
  partenaire__nom?: string;

  statut?: string | null;
  objectif?: string | null;
  motif?: string | null;
  type_prospection?: string | null;

  // label/clé normalisés côté backend
  group_key?: number | string | null;
  group_label?: string;

  // métriques par groupe
  total: number;
  actives: number;
  a_relancer: number;

  acceptees: number;
  refusees: number;
  annulees: number;

  en_cours: number;
  a_faire: number;
  a_relancer_statut: number;
  non_renseigne: number;

  /** Taux de transformation par groupe (% acceptées / total), calculé côté API */
  taux_acceptation?: number;
};

export type ProspectionGroupedResponse = {
  group_by: ProspectionGroupBy;
  results: ProspectionGroupRow[];
};

// ────────────────────────────────────────────────────────────
// Utils
// ────────────────────────────────────────────────────────────
export function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Erreur inconnue";
}

/**
 * Normalisation légère des répartitions renvoyées par l’API pour les
 * clés autres que le statut (objectif/motif/type/moyen_contact).
 */
function normalizeKeyCountArray<T extends Record<string, unknown>>(
  arr: T[],
  keyName: string
): KeyCount[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((it) => {
    const raw = (it as Record<string, unknown>)[keyName];
    const key = typeof raw === "string" ? raw : raw == null ? null : String(raw);
    const countRaw = (it as Record<string, unknown>).count;
    const count = typeof countRaw === "number" ? countRaw : Number(countRaw ?? 0);
    return { key, count };
  });
}

// ────────────────────────────────────────────────────────────
// API
// ────────────────────────────────────────────────────────────
export async function getProspectionOverview(filters: ProspectionFilters) {
  const { data } = await api.get<ProspectionOverviewResponse>("/prospection-stats/", {
    params: filters,
  });

  // On s’assure que la répartition ait une forme homogène côté front
  const rep = data?.repartition ?? {};
  const normalized: ProspectionOverviewResponse = {
    kpis: data?.kpis ?? {
      total: 0,
      actives: 0,
      a_relancer: 0,
      acceptees: 0,
      refusees: 0,
      annulees: 0,
      en_cours: 0,
      a_faire: 0,
      a_relancer_statut: 0,
      non_renseigne: 0,
      taux_acceptation: 0,
    },
    repartition: {
      par_statut: Array.isArray(rep.par_statut) ? (rep.par_statut as StatutBreakdown[]) : [],
      par_objectif: normalizeKeyCountArray(rep.par_objectif || [], "objectif"),
      par_motif: normalizeKeyCountArray(rep.par_motif || [], "motif"),
      par_type: normalizeKeyCountArray(rep.par_type || [], "type_prospection"),
      par_moyen_contact: normalizeKeyCountArray(rep.par_moyen_contact || [], "moyen_contact"),
    },
    filters_echo: data?.filters_echo ?? {},
  };

  return normalized;
}

export async function getProspectionGrouped(by: ProspectionGroupBy, filters: ProspectionFilters) {
  const { data } = await api.get<ProspectionGroupedResponse>("/prospection-stats/grouped/", {
    params: { ...filters, by },
  });
  return data;
}

// ────────────────────────────────────────────────────────────
// Hooks (TanStack Query v5)
// ────────────────────────────────────────────────────────────
export function useProspectionOverview(filters: ProspectionFilters) {
  return useQuery<ProspectionOverviewResponse, Error>({
    queryKey: ["prospection-stats:overview", filters],
    queryFn: () => getProspectionOverview(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useProspectionGrouped(by: ProspectionGroupBy, filters: ProspectionFilters) {
  return useQuery<ProspectionGroupedResponse, Error>({
    queryKey: ["prospection-stats:grouped", by, filters],
    queryFn: () => getProspectionGrouped(by, filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

// ────────────────────────────────────────────────────────────
/**
 * Résolution du libellé d’un groupe (centre/departement/owner/…)
 * 1) Utilise `group_label` si présent (backend)
 * 2) Sinon tente les champs bruts
 * 3) Sinon fallback lisible
 */
// ────────────────────────────────────────────────────────────
export function resolveProspectionGroupLabel(
  row: ProspectionGroupRow,
  by: ProspectionGroupBy
): string {
  if (typeof row.group_label === "string" && row.group_label.trim() !== "") return row.group_label;

  if (by === "centre") {
    if (typeof row["centre__nom"] === "string" && row["centre__nom"].trim() !== "")
      return String(row["centre__nom"]);
    if (row.centre_id != null) return `Centre #${row.centre_id}`;
  }

  if (by === "departement") {
    if (row.departement) return String(row.departement);
  }

  if (by === "owner") {
    const fn = (row["owner__first_name"] || "") as string;
    const ln = (row["owner__last_name"] || "") as string;
    const full = `${fn} ${ln}`.trim();
    if (full) return full;
    const back = (row["owner__email"] || row["owner__username"]) as string | undefined;
    if (back && back.trim() !== "") return back;
    if (row.owner_id != null) return `Utilisateur #${row.owner_id}`;
  }

  if (by === "formation") {
    if (typeof row["formation__nom"] === "string" && row["formation__nom"].trim() !== "")
      return String(row["formation__nom"]);
    if (row.formation_id != null) return `Formation #${row.formation_id}`;
  }

  if (by === "partenaire") {
    if (typeof row["partenaire__nom"] === "string" && row["partenaire__nom"].trim() !== "")
      return String(row["partenaire__nom"]);
    if (row.partenaire_id != null) return `Partenaire #${row.partenaire_id}`;
  }

  if (by === "statut") {
    if (row.statut != null) return String(row.statut);
  }
  if (by === "objectif") {
    if (row.objectif != null) return String(row.objectif);
  }
  if (by === "motif") {
    if (row.motif != null) return String(row.motif);
  }
  if (by === "type") {
    if (row.type_prospection != null) return String(row.type_prospection);
  }

  return "—";
}
