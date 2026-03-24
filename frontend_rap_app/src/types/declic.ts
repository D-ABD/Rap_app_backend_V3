// -----------------------------------------------------------------------------
// 🧩 Types TypeScript pour le module Déclic (IC supprimée, ateliers uniquement)
// -----------------------------------------------------------------------------

// 🔹 Centre (résumé)
export interface CentreLight {
  id: number;
  nom: string;
  departement?: string | null;
  code_postal?: string | null;
}

export interface ParticipantDeclic {
  id?: number;
  nom: string;
  prenom: string;
  telephone?: string | null;
  email?: string | null;
  declic_origine_id?: number | null;
  declic_origine_label?: string;
  type_declic?: string;
  type_declic_display?: string;
  date_declic?: string;
  centre?: CentreLight | null;
  centre_id?: number | null;
  centre_nom?: string;
  present?: boolean;
  commentaire_presence?: string | null;
  created_at?: string;
  updated_at?: string;
}

// -----------------------------------------------------------------------------
// 🎯 Objectif Déclic – Objectifs annuels par centre
// -----------------------------------------------------------------------------
export interface ObjectifDeclic {
  id: number;

  // --- Centre ---
  centre: CentreLight | null;
  centre_id?: number;
  departement?: string | null;

  // --- Infos principales ---
  annee: number;
  valeur_objectif: number;
  commentaire?: string | null;

  // --- Données calculées (backend: synthese_globale + model Declic) ---
  taux_atteinte?: number | null;
  taux_presence?: number | null;
  taux_adhesion?: number | null;
  taux_prescription?: number | null;
  taux_retention?: number | null; // A1→A6 (backend Declic.taux_retention)
  reste_a_faire?: number | null;

  // --- Synthèse brute (backend ObjectifDeclic.data_declic) ---
  data_declic?: {
    inscrits: number;
    presents: number;
    absents: number;
    total_ateliers: number;

    // 🔥 très important : utilisé dans ta modal
    adhesions?: number;
  };

  // --- Legacy / autres champs du modèle ---
  taux_presence_ateliers?: number;

  // --- Métadonnées DRF ---
  created_at?: string;
  updated_at?: string;
  created_by?: number | null;
  updated_by?: number | null;
}

// -----------------------------------------------------------------------------
// 📊 Séance Déclic — uniquement ateliers
// -----------------------------------------------------------------------------
export interface Declic {
  id: number;

  type_declic: string;
  type_declic_display?: string;

  date_declic: string;

  centre: CentreLight | null;
  centre_id?: number;
  centre_nom?: string;
  participants_declic?: ParticipantDeclic[];

  // ---------------------------
  // ATELIERS UNIQUEMENT
  // ---------------------------
  nb_inscrits_declic: number;
  nb_presents_declic: number;
  nb_absents_declic: number;

  taux_presence_atelier?: number;

  // ---------------------------
  // OBJECTIFS
  // ---------------------------
  objectif_annuel?: number | null;
  taux_atteinte_annuel?: number | null;
  reste_a_faire?: number | null;

  commentaire?: string | null;

  created_at?: string;
  updated_at?: string;
  created_by?: number | null;
  updated_by?: number | null;
}

// -----------------------------------------------------------------------------
// 📈 Statistiques globales
// -----------------------------------------------------------------------------
export interface DeclicStats {
  centres: Record<string, number>;
  departements: Record<string, number>;
  resteAFaire: { annee: number; reste_total: number } | null;
  loading: boolean;
}

// -----------------------------------------------------------------------------
// 🎯 Synthèse Objectifs Déclic
// -----------------------------------------------------------------------------
export interface ObjectifDeclicSynthese {
  centre: string;
  departement?: string | null;
  annee: number;
  objectif: number;
  realise: number;
  taux_presence_ateliers: number;
  taux_atteinte: number;
  reste_a_faire: number;
}

// -----------------------------------------------------------------------------
// 🎛️ Filtres Déclic
// -----------------------------------------------------------------------------

export type TypeDeclic =
  | "atelier_1"
  | "atelier_2"
  | "atelier_3"
  | "atelier_4"
  | "atelier_5"
  | "atelier_6"
  | "autre";

export interface Choice {
  value: string | number;
  label: string;
}

export interface DeclicFiltresValues {
  search?: string;
  type_declic?: TypeDeclic;
  centre?: number;
  departement?: string;
  annee?: number;
  date_min?: string;
  date_max?: string;
  ordering?: string;
  page?: number;
}

export interface DeclicFiltersOptions {
  annees: number[];
  centres: CentreLight[];
  type_declic: Choice[];
}

export interface ParticipantDeclicFiltersValues {
  search?: string;
  centre?: number;
  declic_origine?: number;
  type_declic?: TypeDeclic;
  annee?: number;
  present?: "true" | "false";
  ordering?: string;
  page?: number;
}

// -----------------------------------------------------------------------------
// 🎯 Filtres Objectifs Déclic
// -----------------------------------------------------------------------------
export interface ObjectifDeclicFiltresValues {
  search?: string;
  annee?: number;
  centre?: number;
  departement?: string;
  ordering?: string;
  page?: number;
}

export interface ObjectifsDeclicFiltersOptions {
  annees: number[];
  centres: CentreLight[];
}
