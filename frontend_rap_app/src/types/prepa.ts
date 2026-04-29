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

export type StagiairePrepaStatut =
  | "en_attente"
  | "en_parcours"
  | "parcours_termine"
  | "abandon";

export interface StagiairePrepa {
  id?: number;
  is_active?: boolean;
  nom: string;
  prenom: string;
  telephone?: string | null;
  email?: string | null;
  prepa_origine_id?: number | null;
  date_ic?: string | null;
  centre?: CentreLight | null;
  centre_id?: number | null;
  centre_nom?: string;
  centre_afpa_cible?: CentreLight | null;
  centre_afpa_cible_id?: number | null;
  centre_afpa_cible_nom?: string;
  statut_parcours?: StagiairePrepaStatut;
  statut_parcours_display?: string;
  statut_parcours_calcule?: StagiairePrepaStatut;
  statut_parcours_calcule_display?: string;
  prochain_atelier_prevu?: TypePrepa | null;
  prochain_atelier_prevu_display?: string | null;
  prochain_atelier_attendu?: TypePrepa | null;
  prochain_atelier_attendu_display?: string | null;
  statut_positionnement?: "a_positionner" | "positionne" | "en_attente" | null;
  statut_positionnement_display?: string | null;
  orientation_finale?: "afpa" | "autre_centre_afpa" | "hors_afpa" | null;
  orientation_finale_display?: string | null;
  formation_afpa_cible?: string | null;
  date_orientation?: string | null;
  entree_formation_confirmee?: boolean;
  est_oriente_afpa?: boolean;
  est_oriente_vers_autre_centre_afpa?: boolean;
  est_en_attente_entree?: boolean;
  est_a_integrer_atelier_1?: boolean;
  est_en_attente_prochain_atelier?: boolean;
  date_entree_parcours?: string | null;
  date_sortie_parcours?: string | null;
  commentaire_suivi?: string | null;
  motif_abandon?: string | null;
  atelier_1_realise?: boolean;
  atelier_2_realise?: boolean;
  atelier_3_realise?: boolean;
  atelier_4_realise?: boolean;
  atelier_5_realise?: boolean;
  atelier_6_realise?: boolean;
  atelier_autre_realise?: boolean;
  date_atelier_1?: string | null;
  date_atelier_2?: string | null;
  date_atelier_3?: string | null;
  date_atelier_4?: string | null;
  date_atelier_5?: string | null;
  date_atelier_6?: string | null;
  date_atelier_autre?: string | null;
  ateliers_realises_count?: number;
  ateliers_realises_labels?: string[];
  ateliers_realises_ordonnes?: Array<{ value: string; label: string; date?: string | null }>;
  dernier_atelier_label?: string | null;
  dernier_atelier_date?: string | null;
  atelier_en_cours?: TypePrepa | null;
  atelier_en_cours_display?: string | null;
  atelier_en_cours_date?: string | null;
  dernier_statut_participation?: PrepaPresenceStatut | null;
  dernier_statut_participation_display?: string | null;
  dernier_statut_participation_liberant?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type PrepaPresenceStatut = "inscrit" | "present" | "absent" | "termine" | "a_repositionner";

export interface PrepaParticipation {
  id?: number;
  stagiaire_prepa?: StagiairePrepa | null;
  stagiaire_prepa_id?: number | null;
  nom?: string;
  prenom?: string;
  telephone?: string | null;
  email?: string | null;
  statut_parcours?: StagiairePrepaStatut;
  statut: PrepaPresenceStatut;
  statut_display?: string | null;
  commentaire?: string | null;
  created_at?: string;
  updated_at?: string;
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
    presents_info?: number;
    inscrits?: number;
    presents: number;
    absents?: number;
    adhesions: number;
    atelier1?: number;
    atelier1_inscrits?: number;
    atelier1_presents?: number;
    atelier6?: number;
  };

  taux_prescription?: number;
  taux_presence?: number;
  taux_adhesion?: number;
  taux_atteinte?: number;
  taux_atteinte_inscrits?: number;
  taux_atteinte_presents?: number;
  reste_a_faire?: number;
  reste_a_faire_inscrits?: number;
  reste_a_faire_presents?: number;
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
  is_active?: boolean;
  type_prepa: string;
  type_prepa_display?: string;
  date_prepa: string;
  date_debut_atelier?: string | null;
  date_fin_atelier?: string | null;
  date_display?: string;

  centre: CentreLight | null;
  centre_id?: number;
  centre_nom?: string;
  formateur_animateur?: string | null;
  stagiaires_prepa?: StagiairePrepa[];
  participations_prepa?: PrepaParticipation[];

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
  nb_inscrits_prepa_hors_liste?: number;
  nb_presents_prepa_hors_liste?: number;
  nb_absents_prepa_hors_liste?: number;
  nb_inscrits_prepa_nominatifs?: number;
  nb_presents_prepa_nominatifs?: number;
  nb_absents_prepa_nominatifs?: number;
  presence_counts_prepa?: Record<PrepaPresenceStatut, number>;

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
  engages_total?: number;
  realise_total: number;
  adhesions_total?: number;
  taux_atteinte_inscrits?: number;
  taux_atteinte_total: number;
  reste_a_faire_inscrits?: number;
  reste_a_faire_total: number;
  par_centre: Array<{ centre_id?: number; centre__nom: string; total: number; engages?: number; adhesions?: number }>;
  par_departement: Array<{ departement: string; total: number; engages?: number; adhesions?: number }>;
}

export interface ObjectifPrepaSynthese {
  centre: string;
  departement?: string | null;
  annee: number;
  objectif: number;
  engages_atelier_1?: number;
  realise: number;
  realises_atelier_1?: number;
  adhesions: number;
  taux_prescription: number;
  taux_presence: number;
  taux_adhesion: number;
  taux_atteinte_inscrits?: number;
  taux_atteinte_presents?: number;
  taux_atteinte: number;
  reste_a_faire_inscrits?: number;
  reste_a_faire_presents?: number;
  reste_a_faire: number;
}

// -----------------------------------------------------------------------------
// 🎛️ Filtres et choix pour les vues Prépa
// -----------------------------------------------------------------------------

// 🔹 Type d’activité Prépa
export type TypePrepa =
  | "info_collective"
  | "atelier_1"
  | "atelier_2"
  | "atelier_3"
  | "atelier_4"
  | "atelier_5"
  | "atelier_6"
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
  avec_archivees?: boolean;
  archives_seules?: boolean;
}

// -----------------------------------------------------------------------------
// ⚙️ Options de filtres disponibles pour le module Prépa
// -----------------------------------------------------------------------------
export interface PrepaFiltersOptions {
  annees: number[]; // ✅ liste des années (ex: [2025, 2024, 2023])
  centres: CentreLight[];
  type_prepa: Choice[];
}

export interface StagiairePrepaFiltersValues {
  search?: string;
  centre?: number;
  statut_parcours_calcule?: StagiairePrepaStatut;
  atelier_en_cours?: TypePrepa;
  prochain_atelier_attendu?: TypePrepa;
  orientation_finale?: "afpa" | "autre_centre_afpa" | "hors_afpa";
  pilotage?:
    | "attente_entree"
    | "a_integrer_atelier_1"
    | "attente_prochain_atelier"
    | "en_parcours_actif"
    | "a_reprogrammer"
    | "parcours_termine"
    | "abandon";
  date_ic_min?: string;
  date_ic_max?: string;
  prepa_origine?: number;
  prepa_participation?: number;
  ordering?: string;
  page_size?: number;
  page?: number;
  avec_archivees?: boolean;
  archives_seules?: boolean;
}

export interface StagiairePrepaSynthese {
  total_stagiaires?: number;
  en_attente_entree: number;
  a_integrer_atelier_1: number;
  en_attente_prochain_atelier: number;
  en_parcours: number;
  termines: number;
  abandons: number;
  orientes_afpa: number;
  orientes_autre_centre_afpa: number;
  entrees_atelier_1: number;
  sorties_atelier_6: number;
  taux_transformation_vers_afpa: number;
  taux_abandon_vers_entrees?: number;
  taux_orientation_autre_centre_afpa?: number;
  filtres?: {
    centre?: string | null;
    annee?: string | null;
    prepa_origine?: string | null;
    orientation_finale?: string | null;
  };
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
