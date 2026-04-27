// src/types/prospection.ts
// ----------------------------------
// Types bruts des énumérations DRF

import { CandidatReadMinimal } from "./candidat";
import { PartenaireMinimal } from "./partenaire";
import { CustomUserRole } from "./User";

// ----------------------------------
export type ProspectionStatut =
  | "a_faire"
  | "en_cours"
  | "a_relancer"
  | "acceptee"
  | "refusee"
  | "annulee"
  | "non_renseigne";

export type ProspectionActivite = "active" | "archivee";

export type ProspectionObjectif =
  | "prise_contact"
  | "rendez_vous"
  | "presentation_offre"
  | "candidature"
  | "contrat"
  | "partenariat"
  | "autre";

export type ProspectionMotif = "POEI" | "apprentissage" | "VAE" | "partenariat" | "autre";

export type ProspectionTypeProspection =
  | "nouveau_prospect"
  | "premier_contact"
  | "relance"
  | "reprise_contact"
  | "suivi"
  | "rappel_programme"
  | "fidelisation"
  | "autre";

export type ProspectionMoyenContact = "email" | "telephone" | "visite" | "reseaux";

// ----------------------------------
// Type générique pour un choix DRF
// ----------------------------------
export interface Choice<T = string> {
  value: T;
  label: string;
}

// ----------------------------------
// Wrapper générique d’une réponse DRF
// ----------------------------------
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ----------------------------------
// Pagination standard DRF + wrapper
// ----------------------------------
export interface PaginatedResults<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type PaginatedResponse<T> = ApiResponse<PaginatedResults<T>>;

// ----------------------------------
// Le cœur : la prospection “data”
// ----------------------------------
export interface Prospection {
  id: number;
  partenaire: number;
  formation: number | null;
  formation_nom: string | null;

  /** 🆕 centre (id) renvoyé par l'API, calculé côté back */
  centre: number | null;
  centre_nom: string | null;

  num_offre: string | null;
  date_prospection: string; // ISO datetime
  type_prospection: ProspectionTypeProspection;
  type_prospection_display: string;
  motif: ProspectionMotif;
  motif_display: string;
  statut: ProspectionStatut; // statut de la prospection
  statut_display: string;
  activite: ProspectionActivite;
  activite_display: string;
  objectif: ProspectionObjectif;
  objectif_display: string;
  commentaire: string; // (conservé tel quel pour compat)

  // ✅ ajouté : moyen de contact saisi
  moyen_contact?: ProspectionMoyenContact | null;
  /** libellé du moyen de contact renvoyé par l’API */
  moyen_contact_display?: string;

  last_comment?: string | null;
  last_comment_at?: string | null;
  last_comment_id?: number | null;
  comments_count?: number;

  // 🗓️ source unique de vérité pour la relance (list + detail)
  relance_prevue: string | null; // ISO date (YYYY-MM-DD)

  // indicateurs
  is_active: boolean;
  relance_necessaire: boolean;

  // méta
  created_by: string;
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
  owner: number | null;
  owner_username: string;
  userRole?: CustomUserRole;

  // infos de confort d’affichage existantes
  partenaire_nom?: string;

  // ✅ NOUVEAUX champs d’affichage renvoyés par l’API (read-only)
  // Partenaire
  partenaire_ville?: string | null; // partenaire.city
  partenaire_tel?: string | null; // partenaire.contact_telephone
  partenaire_email?: string | null; // partenaire.contact_email

  // Formation
  formation_date_debut?: string | null; // formation.start_date (ISO date)
  formation_date_fin?: string | null; // formation.end_date   (ISO date)
  type_offre_display?: string | null; // formation.type_offre.nom
  formation_statut_display?: string | null; // formation.statut.nom/libellé
  places_disponibles?: number | null; // formation.places_disponibles
}

// ----------------------------------
// Payload pour la création / édition
// ----------------------------------
export interface ProspectionFormData {
  partenaire: number | null;
  partenaire_nom?: string | null;

  activite?: ProspectionActivite;
  activite_display?: string;

  formation?: number | null;
  date_prospection: string; // ISO date
  type_prospection: ProspectionTypeProspection;
  motif: ProspectionMotif;
  statut: ProspectionStatut;
  objectif: ProspectionObjectif;
  commentaire?: string;
  last_comment?: string | null;
  last_comment_at?: string | null;
  last_comment_id?: number | null;
  comments_count?: number; // total visible pour l’utilisateur courant

  // (optionnel) si statut = a_relancer, le back attend cette date
  relance_prevue?: string | null; // ISO date

  // champ conservé pour compat (rempli côté back pour staff/admin)
  owner: number | null;
  owner_username?: string | null;

  // readonly d’affichage si présents
  formation_nom?: string | null;

  /** 🆕 centre renvoyé/calculé côté back — ne pas l’envoyer en création/édition */
  centre?: number | null;
  centre_nom?: string | null;

  num_offre?: string | null;

  // ✅ NOUVEAUX readonly d’affichage (si renvoyés par la liste/détail)
  partenaire_ville?: string | null;
  partenaire_tel?: string | null;
  partenaire_email?: string | null;

  formation_date_debut?: string | null;
  formation_date_fin?: string | null;
  type_offre_display?: string | null;
  formation_statut_display?: string | null;
  places_disponibles?: number | null;

  // (facultatif, selon UI)
  moyen_contact?: ProspectionMoyenContact | null;
}

// ----------------------------------
export interface FormationLight {
  id: number;
  nom: string;
  slug?: string;
}

// ----------------------------------
// Filtres pour l’API list()
// ----------------------------------
export interface ProspectionFiltresValues {
  statut?: ProspectionStatut;
  objectif?: ProspectionObjectif;
  motif?: ProspectionMotif;
  type_prospection?: ProspectionTypeProspection;
  moyen_contact?: ProspectionMoyenContact;
  avec_archivees?: boolean | "1" | "true";
  formation?: number;
  formation_num_offre?: string;
  partenaire?: number;
  activite?: ProspectionActivite;
  // 🔎 recherche & période
  search?: string;
  date_min?: string; // ISO date (sur date_prospection)
  date_max?: string; // ISO date (sur date_prospection)

  // 🔢 pagination
  page?: number;
  page_size?: number;

  // 👤 filtrage par responsable (staff/admin)
  owner?: number;

  // 🆕 filtres formation ajoutés dans l'API
  // Le back accepte un ID simple ("3") ou une CSV ("1,2,3").
  // On autorise aussi number[] côté TS si tu préfères joindre avant envoi.
  formation_type_offre?: number | number[] | string;
  formation_statut?: number | number[] | string;
  centre?: number | number[] | string;

  inclure_archives?: boolean | string; // ← nouveau

  // (optionnel) tri supporté par l'API
  ordering?:
    | "date_prospection"
    | "-date_prospection"
    | "created_at"
    | "-created_at"
    | "owner__username"
    | "-owner__username";
}

// ----------------------------------
// Historique d’une prospection
// ----------------------------------
export interface HistoriqueProspection {
  id: number;
  prospection: number;
  date_modification: string; // ISO datetime

  ancien_statut: ProspectionStatut;
  ancien_statut_display: string;
  nouveau_statut: ProspectionStatut;
  nouveau_statut_display: string;

  type_prospection: ProspectionTypeProspection;
  type_prospection_display: string;

  commentaire?: string;
  resultat?: string;

  // 🗓️ si une relance a été planifiée au moment de l’historique
  // ⚠️ côté back: champ "prochain_contact"
  prochain_contact?: string | null; // ISO date

  moyen_contact?: ProspectionMoyenContact;
  moyen_contact_display?: string;

  jours_avant_relance: number;
  relance_urgente: boolean;
  est_recent: boolean;

  created_by: string;
  statut_avec_icone?: {
    statut: string;
    icone: string;
    classe: string;
  };

  owner_username?: string;
}

// ----------------------------------
// Action custom “changer-statut”
// ----------------------------------
export interface ChangerStatutPayload {
  statut: ProspectionStatut;
  commentaire?: string;
  moyen_contact?: ProspectionMoyenContact;

  // 👉 accepté par le back (mappé vers prochain_contact côté sérializer)
  relance_prevue?: string; // ISO date, si applicable
}

// ----------------------------------
// Résultat de l’appel “/prospections/choices/”
// ----------------------------------
export interface ProspectionChoicesResponse {
  success: boolean;
  message: string;
  data: {
    statut: Choice<ProspectionStatut>[];
    activite?: Choice<ProspectionActivite>[]; // 🆕 si renvoyé par le back
    objectif: Choice<ProspectionObjectif>[];
    motif: Choice<ProspectionMotif>[];
    type_prospection: Choice<ProspectionTypeProspection>[];
    moyen_contact: Choice<ProspectionMoyenContact>[];
    owners?: Choice<number>[];
    user_role?: string;
    partenaires?: Choice<number>[];
  };
}

// Types pour les actions custom du ProspectionViewSet

export interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data: T;
}

/* Créer un partenaire depuis une prospection */
export interface PartenaireCreateFromProspectionPayload {
  nom: string;
  type?: string | null;
  secteur_activite?: string | null;
  street_name?: string | null;
  zip_code?: string | null;
  city?: string | null;
  country?: string | null;
  contact_nom?: string | null;
  contact_poste?: string | null;
  contact_telephone?: string | null;
  contact_email?: string | null;
  website?: string | null;
  social_network_url?: string | null;
  actions?: string | null;
  action_description?: string | null;
  description?: string | null;
}
export type PartenaireCreateFromProspectionResponse = ApiEnvelope<PartenaireMinimal>;

/* Créer un candidat depuis une prospection */
export interface CandidatCreateFromProspectionPayload {
  nom: string;
  prenom: string;
  email?: string | null;
  telephone?: string | null;
  ville?: string | null;
  code_postal?: string | null;
  /** si omis, le backend reprendra la formation de la prospection */
  formation?: number | null;
  /** défauts appliqués côté backend */
  statut?: string;
  cv_statut?: "oui" | "en_cours" | "a_modifier";
}
export type CandidatCreateFromProspectionResponse = ApiEnvelope<CandidatReadMinimal>;

/* Changer le statut d’une prospection */
export interface ProspectionChangeStatutPayload {
  partenaire?: number;
  formation?: number;
  owner?: number;
  date_prospection?: string; // ISO Datetime
  type_prospection?: string;
  motif?: string;
  statut?: string;
  objectif?: string;
  commentaire?: string;
  /** l’un ou l’autre (alias géré par le backend) */
  relance_prevue?: string; // YYYY-MM-DD
  prochain_contact?: string; // YYYY-MM-DD
  moyen_contact?: string;
}
export type ProspectionChangeStatutResponse<T = unknown> = ApiEnvelope<T>;

export type ProspectionDetailDTO = ProspectionFormData & {
  id?: number;
  centre?: number | null;
  centre_nom?: string | null;

  partenaire_nom?: string | null;
  partenaire_ville?: string | null;
  partenaire_tel?: string | null;
  partenaire_email?: string | null;

  formation_nom?: string | null;
  num_offre?: string | null;
  formation_date_debut?: string | null;
  formation_date_fin?: string | null;
  type_offre_display?: string | null;
  formation_statut_display?: string | null;
  places_disponibles?: number | null;

  // 🧾 Champs de description / statut
  type_prospection_display?: string | null;
  motif_display?: string | null;
  objectif_display?: string | null;
  statut_display?: string | null;
  moyen_contact_display?: string | null;

  // 🗓️ Dates
  date_prospection?: string | null; // ISO datetime
  relance_prevue?: string | null; // ISO date (YYYY-MM-DD)

  // 💬 Commentaires
  commentaire?: string | null;
  last_comment?: string | null;
  last_comment_at?: string | null;
  last_comment_id?: number | null;
  comments_count?: number | null;

  // ⚙️ Indicateurs
  is_active?: boolean;
  relance_necessaire?: boolean;

  // 👤 Métadonnées
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  owner?: number | null;
  owner_username?: string | null;

  // 🧑‍💼 Rôle utilisateur (pour front)
  user_role?: string | null;
};
