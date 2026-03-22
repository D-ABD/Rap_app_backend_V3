// ui_rap_app_mui/src/types/prepa.ts

// -----------------------------------------------------------------------------
// 🧩 Types TypeScript pour le module Prépa
// -----------------------------------------------------------------------------

// 🔹 Centre (résumé)
export interface CentreLight {
  id: number;
  nom: string;
  departement?: string | null;
  code_postal?: string | null;
}

// 🎯 Objectif Prépa – Objectifs annuels par centre
export interface ObjectifPrepa {
  id: number;

  // Relations
  centre: CentreLight | null; // lecture seule
  centre_id?: number; // requis pour création / update
  centre_nom?: string; // lecture seule

  // Données principales
  departement?: string | null;
  annee: number;
  valeur_objectif: number;
  commentaire?: string | null;

  // Données calculées
  data_prepa?: {
    places: number;
    prescriptions: number;
    presents: number;
    adhesions: number;
  };

  taux_prescription?: number;
  taux_presence?: number;
  taux_adhesion?: number;
  taux_atteinte?: number;
  reste_a_faire?: number;
  taux_retention?: number | null;

  // Métadonnées
  created_at?: string;
  updated_at?: string;
  created_by?: number | null;
  updated_by?: number | null;
}

// 📊 Séance Prépa (Information collective ou atelier)
export interface Prepa {
  id: number;
  type_prepa: string;
  type_prepa_display?: string;
  date_prepa: string;
  date_display?: string;

  centre: CentreLight | null;
  centre_id?: number;
  centre_nom?: string;

  // --- Information collective
  nombre_places_ouvertes: number;
  nombre_prescriptions: number;
  nb_presents_info: number;
  nb_absents_info: number;
  nb_adhesions: number;

  // --- Ateliers
  nb_inscrits_prepa: number;
  nb_presents_prepa: number;
  nb_absents_prepa: number;

  // ---------- 🆕 Champs unifiés (backend) ----------
  inscrits: number; // IC → prescriptions / Atelier → inscrits
  presents: number; // unified: presents IC / AT
  absents: number; // unified
  adhesions_ic: number; // IC uniquement

  // ---------- Taux & indicateurs ----------
  taux_prescription?: number;
  taux_presence_info?: number;
  taux_adhesion?: number;
  taux_presence_prepa?: number;

  // ---------- 🆕 Nouveaux taux ----------
  taux_presence_atelier?: number | null; // ateliers
  taux_presence_global?: number | null; // global (IC ou Atelier)

  objectif_annuel?: number;
  taux_atteinte_annuel?: number;
  reste_a_faire?: number;

  commentaire?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by?: number | null;
  updated_by?: number | null;
}

// -----------------------------------------------------------------------------
// 📈 Types pour les statistiques globales
// -----------------------------------------------------------------------------
export interface PrepaStats {
  centres: Record<string, number>;
  departements: Record<string, number>;
  resteAFaire: { annee: number; reste_total: number } | null;
  loading: boolean;
}

export interface SyntheseObjectifs {
  annee: number;
  objectif_total: number;
  realise_total: number;
  taux_atteinte_total: number;
  reste_a_faire_total: number;
  par_centre: Record<string, number>;
  par_departement: Record<string, number>;
}

export interface ObjectifPrepaSynthese {
  centre: string;
  departement?: string | null;
  annee: number;
  objectif: number;
  realise: number;
  adhesions: number;
  taux_prescription: number;
  taux_presence: number;
  taux_adhesion: number;
  taux_atteinte: number;
  reste_a_faire: number;
}

// -----------------------------------------------------------------------------
// 🎛️ Filtres et choix pour les vues Prépa
// -----------------------------------------------------------------------------

// 🔹 Type d’activité Prépa
export type TypePrepa =
  | "info_collective"
  | "session_1"
  | "session_2"
  | "session_3"
  | "session_4"
  | "session_5"
  | "session_6"
  | "autre";

// 🔹 Structure générique pour les listes de choix (centre, type, etc.)
export interface Choice {
  value: string | number;
  label: string;
}

// 🔹 Structure des filtres actifs dans l’UI (utilisée dans FiltresPrepaPanel)
export interface PrepaFiltresValues {
  search?: string;
  type_prepa?: TypePrepa;
  centre?: number;
  departement?: string; // 🆕 pour filtrer par département
  annee?: number; // 🆕 pour filtrer par année
  date_min?: string;
  date_max?: string;
  ordering?: string;
  page?: number;
}

// -----------------------------------------------------------------------------
// ⚙️ Options de filtres disponibles pour le module Prépa
// -----------------------------------------------------------------------------
export interface PrepaFiltersOptions {
  annees: number[]; // ✅ liste des années (ex: [2025, 2024, 2023])
  centres: CentreLight[];
  type_prepa: Choice[];
}

// -----------------------------------------------------------------------------
// 🎯 Filtres pour Objectifs Prépa
// -----------------------------------------------------------------------------

export interface ObjectifPrepaFiltresValues {
  search?: string;
  annee?: number;
  centre?: number;
  departement?: string;
  ordering?: string;
  page?: number;
}

// -----------------------------------------------------------------------------
// ⚙️ Options de filtres disponibles pour le module Objectifs Prépa
// -----------------------------------------------------------------------------
export interface ObjectifsPrepaFiltersOptions {
  annees: number[]; // ✅ liste des années (ex: [2025, 2024, 2023])
  centres: CentreLight[];
  type_prepa: Choice[];
}
