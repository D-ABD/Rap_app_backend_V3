// ===============================
// 🔷 Types front conformes backend
// ===============================

// -- Utilitaires génériques
export interface NomId {
  id: number;
  nom: string;
}

export interface CodeLibelle {
  code: string;
  libelle: string;
}

// -- Entités liées (imports)
import type { Commentaire } from "./commentaire";
import type { Document } from "./document";
import type { Evenement } from "./evenement";
import type { Prospection } from "./prospection";
import type { HistoriqueFormation } from "./historique";
import type { Partenaire } from "./partenaire";

// -- Référentiels (plus précis que CouleurLibelleNom)
export interface TypeOffreRef {
  id: number;
  nom: string;
  libelle?: string;
  couleur?: string;
}

export interface StatutRef {
  id: number;
  nom: string;
  libelle?: string;
  couleur?: string;
}

// -- Activité (alignée sur l’enum modèle)
export type ActiviteCode = "active" | "archivee";

// ===============================
// 🔷 Donnée principale : Formation
// ===============================
export interface Formation {
  id: number;
  nom: string;

  // FK / référentiels
  centre?: NomId | null;
  type_offre?: TypeOffreRef | null;
  statut?: StatutRef | null;

  // activité & dérivés
  activite?: ActiviteCode; // "active" | "archivee"
  est_archivee?: boolean; // booléen exposé par le modèle
  statut_color?: string | null; // couleur calculée (si exposée par le backend)

  // dates & identifiants
  start_date?: string;
  end_date?: string;
  num_kairos?: string;
  num_offre?: string;
  num_produit?: string;

  // personnes & indicateurs simples
  assistante?: string | null;
  convocation_envoie?: boolean;

  // places & inscrits
  prevus_crif?: number;
  prevus_mp?: number;
  inscrits_crif?: number;
  inscrits_mp?: number;

  cap?: number | null;
  entree_formation?: number;
  nombre_candidats?: number;
  nombre_entretiens?: number;
  nombre_evenements?: number;

  // métriques calculées (côté modèle)
  saturation?: number | null;
  taux_transformation?: number | null;
  taux_saturation?: number | null;
  total_places?: number;
  total_inscrits?: number;
  places_disponibles?: number;
  places_restantes_crif?: number;
  places_restantes_mp?: number;

  // alias front historiques (pour compatibilité)
  inscrits_total?: number;
  prevus_total?: number;
  places_restantes?: number | null;

  // badges/labels
  saturation_badge?: string | null;
  transformation_badge?: string | null;
  saturation_badge_label?: string | null;

  // 🎓 Diplôme ou titre visé
  intitule_diplome?: string | null;
  code_diplome?: string | null;
  code_rncp?: string | null;
  total_heures?: number | null;
  heures_distanciel?: number | null;

  // commentaires & métadonnées
  dernier_commentaire?: string | null;
  created_at?: string;
  updated_at?: string;

  // collections liées
  commentaires?: Commentaire[];
  documents?: Document[];
  evenements?: Evenement[];
  prospections?: Prospection[];
  historique?: HistoriqueFormation[];
  partenaires?: Partenaire[]; // ManyToMany

  // dérivés temporels
  is_active?: boolean;
  is_future?: boolean;
  is_past?: boolean;
  a_recruter?: number;
  is_a_recruter?: boolean;
  status_temporel?: "active" | "past" | "future" | "unknown";
}

// =====================================
// 🔷 Formulaire de création / d’édition
// =====================================
export interface FormationFormData {
  nom: string;
  centre_id: number | null;
  type_offre_id: number | null;
  statut_id: number | null;

  start_date?: string;
  end_date?: string;

  num_kairos?: string;
  num_offre?: string;
  num_produit?: string;

  prevus_crif?: number;
  prevus_mp?: number;
  inscrits_crif?: number;
  inscrits_mp?: number;

  // 🎓 Diplôme ou titre visé
  intitule_diplome?: string;
  code_diplome?: string;
  code_rncp?: string;
  total_heures?: number;
  heures_distanciel?: number;

  assistante?: string;
  cap?: number;
  convocation_envoie?: boolean;

  entree_formation?: number;
  nombre_candidats?: number;
  nombre_entretiens?: number;
  nombre_evenements?: number;
  dernier_commentaire?: string;
}

export type FormationFormDataRaw = {
  [key: string]: string | number | boolean | null | undefined;
} & FormationFormData;

export type FormationFormErrors = Partial<Record<keyof FormationFormData, string>>;

// ======================
// 🔷 Filtres / Recherches
// ======================
export interface FiltresFormationsData {
  centres: NomId[];
  statuts: NomId[];
  type_offres: NomId[];
  activites: CodeLibelle[]; // [{ code: "active", libelle: "Active" }, ...]
  formations?: { id: number; nom: string }[];
  periodes_a_venir?: Array<{ code: string; libelle: string }>;
}

export interface FiltresFormationsValues {
  texte?: string;
  centre?: number;
  statut?: number;
  annee?: number;
  type_offre?: number;
  date_debut?: string;
  date_fin?: string;
  places_disponibles?: boolean;
  tri?: string;
  page?: number;
  dans?: string;
  avec_archivees?: boolean;
  activite?: ActiviteCode;
}

// ===========================
// 🔷 Résumé compact (endpoint)
// ===========================
export interface FormationResume {
  formation_nom: string;
  centre_nom: string;
  type_offre: string;
  num_offre: string;
  statut: string;
  start_date: string;
  end_date: string;
  saturation_formation: number | null;
  saturation_badge: string;
}

// ==================================
// 🔷 Liste simplifiée (dropdown, etc.)
// ==================================
export interface FormationSimple {
  id: number;
  nom: string;
  num_offre?: string | null;
  centre?: NomId | null;
  type_offre?: TypeOffreRef | null;
  statut?: StatutRef | null;
}

// ====================
// 🔷 Pagination DRF std
// ====================
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ===================
// 🔷 Réponses d’API
// ===================
export interface FormationAPIResponse {
  success: boolean;
  message: string;
  data: Formation;
}

export interface FormationsListAPIResponse {
  success: boolean;
  message: string;
  data: {
    count: number;
    results: Formation[];
  };
}

// Archiver / désarchiver
export type ArchiverResponse = { status: "archived" } | { detail: string }; // "Déjà archivée."

export type DesarchiverResponse = { status: "unarchived" } | { detail: string }; // "Déjà active."

// ========================
// 🔷 Statistiques mensuelles
// ========================
export interface FormationStatsParMois {
  [mois: number]: {
    label: string; // "Janvier", ...
    count: number;
    inscrits: number;
  };
}

// =========================
// 🔷 Formats d’export (front)
// =========================
export type FormationExportFormat = "csv" | "pdf" | "word";

// ==========================================
// 🔷 Données globales (si tu exposes /meta/)
// ==========================================
export interface FormationMeta {
  total_formations: number;
  total_inscrits: number;
  total_prevus: number;
  saturation_moyenne: number;
  taux_transformation_moyen: number;
}
