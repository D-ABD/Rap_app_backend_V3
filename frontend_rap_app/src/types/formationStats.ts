import { useQuery } from "@tanstack/react-query";
import api from "../api/axios";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────
export type Filters = {
  date_from?: string;
  date_to?: string;
  centre?: string | number;
  departement?: string;
  type_offre?: string | number;
  statut?: string | number;
  avec_archivees?: boolean;
};

export type CandidatKpis = {
  nb_candidats: number;
  nb_entretien_ok: number;
  nb_test_ok: number;
  nb_inscrits_gespers: number;
  nb_entrees_formation: number;
  nb_contrats_apprentissage: number;
  // ↓ NEW
  nb_contrats_professionnalisation: number;
  nb_contrats_poei_poec: number;
  nb_contrats_autres: number;
  // ↑ NEW
  nb_admissibles: number;
  /** Inclure les formations archivées (true/false) */
  avec_archivees?: boolean; // ← ✅ nouveau champ
};

// ← NEW
export type AppairageParStatut = {
  transmis: number;
  en_attente: number;
  accepte: number;
  refuse: number;
  annule: number;
  a_faire: number;
  contrat_a_signer: number;
  contrat_en_attente: number;
  appairage_ok: number;
};

export type AppairageKpis = {
  total: number;
  par_statut: AppairageParStatut;
};

export type OverviewKpis = {
  nb_formations: number;
  nb_actives: number;
  nb_a_venir: number;
  nb_terminees: number;
  total_places_crif: number;
  total_places_mp: number;
  total_inscrits_crif: number;
  total_inscrits_mp: number;
  total_places: number;
  total_inscrits: number;
  total_dispo_crif: number;
  total_dispo_mp: number;
  total_disponibles: number;
  taux_saturation: number;
  repartition_financeur: {
    crif: number;
    mp: number;
    crif_pct: number;
    mp_pct: number;
  };
  entrees_formation: number;
  candidats: CandidatKpis;
  appairages: AppairageKpis; // ← NEW
  avec_archivees?: boolean;
  nb_annulees: number;
  nb_archivees: number;
};

export type OverviewResponse = {
  kpis: OverviewKpis;
  filters_echo: Record<string, string>;
};

export type GroupBy = "formation" | "centre" | "departement" | "type_offre" | "statut";

export type GroupRow = {
  id?: number;
  nom?: string;

  centre_id?: number;
  centre__nom?: string;

  // ↓ NEW (présents quand by=formation)
  num_offre?: string | number;
  // ↑ NEW

  departement?: string;

  type_offre_id?: number;
  type_offre__id?: number;

  statut_id?: number;
  statut__id?: number;

  group_key?: number | string;
  group_label?: string;

  // métriques formations
  nb_formations: number;
  nb_actives: number;
  nb_a_venir: number;
  nb_terminees: number;
  total_places: number;
  total_places_crif: number;
  total_places_mp: number;
  total_inscrits: number;
  total_inscrits_crif: number;
  total_inscrits_mp: number;
  total_dispo_crif: number;
  total_dispo_mp: number;
  total_disponibles: number;
  entrees_formation: number;
  taux_saturation: number;
  repartition_financeur: {
    crif: number;
    mp: number;
    crif_pct: number;
    mp_pct: number;
  };

  // candidats
  nb_candidats: number;
  nb_entretien_ok: number;
  nb_test_ok: number;
  nb_inscrits_gespers: number;
  nb_entrees_formation: number;

  // Contrats (par type)
  nb_contrats_apprentissage: number;
  // ↓ NEW
  nb_contrats_professionnalisation: number;
  nb_contrats_poei_poec: number;
  nb_contrats_autres: number;
  // ↑ NEW

  nb_admissibles: number;

  // appairages par statut ← NEW (flat pour le tableau)
  app_total: number;
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

export type GroupedResponse = {
  group_by: GroupBy;
  results: GroupRow[];
};

// ── Tops (avec centre et n° d’offre) ─────────────────────────
type TopBase = {
  id: number;
  nom: string;
  /** Nom du centre (clé telle que renvoyée par l'API) */
  centre__nom?: string | null;
  /** Numéro d’offre si disponible côté backend */
  num_offre?: string | number | null;
};

export type ARecruterItem = TopBase & {
  places_disponibles: number;
};

export type TopSatureeItem = TopBase & {
  taux: number;
  /** Peut ne pas être renvoyé par certains backends */
  places_disponibles?: number;
};

export type EnTensionItem = TopBase & {
  taux: number;
  places_disponibles: number;
};

export type TopsResponse = {
  a_recruter: ARecruterItem[];
  top_saturees: TopSatureeItem[];
  en_tension: EnTensionItem[];
};

// ────────────────────────────────────────────────────────────
// Utils + API + hooks
// ────────────────────────────────────────────────────────────
export function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Erreur inconnue";
}

export async function getOverview(filters: Filters) {
  const { data } = await api.get<OverviewResponse>("/formation-stats/", {
    params: filters,
  });
  return data;
}

export async function getGrouped(by: GroupBy, filters: Filters) {
  const { data } = await api.get<GroupedResponse>("/formation-stats/grouped/", {
    params: { ...filters, by },
  });
  return data;
}

export async function getTops(filters: Filters) {
  const { data } = await api.get<TopsResponse>("/formation-stats/tops/", {
    params: filters,
  });
  return data;
}

export function useFormationOverview(filters: Filters) {
  return useQuery<OverviewResponse, Error>({
    queryKey: ["formation-stats:overview", filters],
    queryFn: () => getOverview(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useFormationGrouped(by: GroupBy, filters: Filters) {
  return useQuery<GroupedResponse, Error>({
    queryKey: ["formation-stats:grouped", by, filters],
    queryFn: () => getGrouped(by, filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useFormationTops(filters: Filters) {
  return useQuery<TopsResponse, Error>({
    queryKey: ["formation-stats:tops", filters],
    queryFn: () => getTops(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

// ── Dictionnaires pour labels ────────────────────────────────

export type Dictionaries = {
  centresById: Record<string | number, string>;
  typeOffreById: Record<string | number, string>;
  statutById: Record<string | number, string>;
};

// ⚙️ Appel du nouvel endpoint backend
async function fetchDictionaries(): Promise<Dictionaries> {
  const { data } = await api.get<Dictionaries>("/formation-stats/filter-options/");
  return data;
}

// ✅ Hook simplifié (plus besoin de buildMap ou FiltersPayload)
export function useFormationDictionaries() {
  return useQuery<Dictionaries, Error>({
    queryKey: ["formation-stats:filter-options"],
    queryFn: fetchDictionaries,
    staleTime: 5 * 60_000, // cache de 5 min
    placeholderData: (prev) => prev,
  });
}

// ── Libellé des groupes ─────────────────────────────────────
export function resolveGroupLabel(row: GroupRow, by: GroupBy, dicts?: Dictionaries): string {
  if (row.group_label) return String(row.group_label);
  if (by === "centre" && row["centre__nom"]) return String(row["centre__nom"]);
  if (by === "formation" && row.nom) return String(row.nom);
  if (by === "departement" && row.departement) return String(row.departement);

  if (by === "centre" && row.centre_id != null && dicts?.centresById)
    return dicts.centresById[row.centre_id] ?? `Centre #${row.centre_id}`;

  if (by === "type_offre") {
    const id = row["type_offre__id"] ?? row.type_offre_id;
    if (id != null && dicts?.typeOffreById) return dicts.typeOffreById[id] ?? `Type #${id}`;
  }

  if (by === "statut") {
    const id = row["statut__id"] ?? row.statut_id;
    if (id != null && dicts?.statutById) return dicts.statutById[id] ?? `Statut #${id}`;
  }

  if (by === "formation") return row.id != null ? `Formation #${row.id}` : "—";
  if (by === "centre") return row.centre_id != null ? `Centre #${row.centre_id}` : "—";
  if (by === "departement") return row.departement ?? "—";
  if (by === "type_offre") {
    const id = row["type_offre__id"] ?? row.type_offre_id;
    return id != null ? `Type #${id}` : "—";
  }
  if (by === "statut") {
    const id = row["statut__id"] ?? row.statut_id;
    return id != null ? `Statut #${id}` : "—";
  }
  return "—";
}
