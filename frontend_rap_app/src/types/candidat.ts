// ─────────────────────────────────────────────────────────────────────────────
// Types communs
// ─────────────────────────────────────────────────────────────────────────────

export interface Choice {
  value: string | number;
  label: string;
}

export type TypeOffreInfo = {
  id: number;
  nom?: string | null;
  libelle?: string | null;
  couleur?: string | null;
};

export type ChoiceOption = { label: string; value: string | number };
export type PhaseActionMethod = "POST" | "PATCH" | "PUT" | "DELETE";

export interface PhaseActionContract {
  key: string;
  url_name: string;
  method: PhaseActionMethod;
}

export interface PhaseContract {
  legacy_status_field: string;
  recommended_phase_field: string;
  derived_phase_field: string;
  business_status_field?: string;
  legacy_status_supported: boolean;
  legacy_status_deprecated: boolean;
  legacy_status_removal_stage: string;
  legacy_status_write_locked: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Formation (lite pour affichage)
// ─────────────────────────────────────────────────────────────────────────────

export interface FormationInfo {
  id: number;
  nom?: string | null;
  num_offre?: string | null;
  centre?: { id: number; nom: string } | null;
  type_offre?: TypeOffreInfo | null;
  date_debut?: string | null; // ✅ exposé par le backend
  date_fin?: string | null; // ✅ exposé par le backend
}

/** Valeurs autorisées pour le statut de CV (aligne strictement avec le backend). */
export type CVStatutValue = "oui" | "en_cours" | "a_modifier";
export type ContratSigneValue = "non" | "en_cours" | "signe" | "valide";
export type ParcoursPhaseValue =
  | "postulant"
  | "inscrit_valide"
  | "stagiaire_en_formation"
  | "sorti"
  | "abandon";

export type StatutMetierValue =
  | "candidat"
  | "admissible"
  | "en_accompagnement_tre"
  | "en_appairage"
  | "inscrit_gespers"
  | "en_formation"
  | "sortie_formation"
  | "abandon";

export type RgpdLegalBasisValue = "consentement" | "contrat" | "interet_legitime" | "obligation_legale";
export type DemandeCompteStatutValue = "non_demandee" | "en_attente" | "acceptee" | "refusee";
// ─────────────────────────────────────────────────────────────────────────────
// Appairage (lite) – dernier appairage du candidat
// ─────────────────────────────────────────────────────────────────────────────

/** 🔹 Commentaire lié à un appairage (lite) */
export interface CommentaireAppairage {
  id: number;
  body: string;
  is_internal: boolean;
  created_at: string; // ISO
  created_by: number | null;
  created_by_nom: string | null;
}

export interface AppairageLite {
  id: number;
  partenaire: number; // id FK
  partenaire_nom: string | null; // libellé partenaire
  date_appairage: string; // ISO
  statut: string; // value (ex: "accepte")
  statut_display: string; // label (ex: "Accepté")
  retour_partenaire?: string | null;
  date_retour?: string | null; // ISO
  created_at: string; // ISO
  updated_at: string; // ISO
  created_by_nom: string | null; // libellé créateur

  /** 🔹 Dernier commentaire (string simple, rétro-compatibilité) */
  commentaire: string | null;

  /** 🔹 Liste complète des commentaires */
  commentaires?: CommentaireAppairage[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Candidat
// ─────────────────────────────────────────────────────────────────────────────
export type AtelierCounts = {
  atelier1?: number;
  atelier2?: number;
  atelier3?: number;
  atelier4?: number;
  atelier5?: number;
  atelier6?: number;
  atelier7?: number;
  autre?: number;
};

export interface Candidat {
  id: number;
  nom: string;
  prenom: string;

  // ───── Identité ─────
  sexe?: "M" | "F" | null;
  nom_naissance?: string | null;
  email?: string | null;
  telephone?: string | null;
  date_naissance?: string | null; // ISO
  departement_naissance?: string | null;
  commune_naissance?: string | null;
  pays_naissance?: string | null;
  nationalite?: string | null;
  nir?: string | null; // Numéro de sécurité sociale (15 chiffres)
  rqth: boolean;
  permis_b: boolean;

  // ───── Adresse détaillée ─────
  street_number?: string | null;
  street_name?: string | null;
  street_complement?: string | null;
  code_postal?: string | null;
  ville?: string | null;

  // ───── Formation demandée─────
  formation?: number | null;
  formation_info?: FormationInfo | null;
  centre_id?: number | null;
  centre_nom?: string | null;
  // Champs dérivés de formation (backend 2025-10)
  formation_nom?: string | null;
  formation_centre_nom?: string | null;
  formation_type_offre_nom?: string | null;
  formation_type_offre_libelle?: string | null;
  formation_num_offre?: string | null;
  formation_date_debut?: string | null;
  formation_date_fin?: string | null;

  // ───── Infos pour contrats ─────
  situation_avant_contrat?: string | null;
  dernier_diplome_prepare?: string | null;
  diplome_plus_eleve_obtenu?: string | null;
  derniere_classe?: string | null;
  intitule_diplome_prepare?: string | null;
  numero_osia?: string | null;
  regime_social?: string | null;
  sportif_haut_niveau?: boolean;
  equivalence_jeunes?: boolean;
  extension_boe?: boolean;
  situation_actuelle?: string | null;
  projet_creation_entreprise?: boolean;
  // ───── Représentant légal ─────
  representant_lien?: string | null;
  representant_nom_naissance?: string | null;
  representant_prenom?: string | null;
  representant_email?: string | null;
  representant_street_name?: string | null;
  representant_zip_code?: string | null;
  representant_city?: string | null;

  // ───── Statuts ─────
  statut: string;
  statut_display?: string | null;
  parcours_phase?: ParcoursPhaseValue | null;
  parcours_phase_display?: string | null;
  parcours_phase_calculee?: string | null;
  statut_metier_calcule?: StatutMetierValue | null;
  statut_metier_display?: string | null;
  is_inscrit_valide?: boolean;
  is_en_formation_now?: boolean;
  has_compte_utilisateur?: boolean;
  cv_statut?: CVStatutValue | null;
  cv_statut_display?: string | null;
  type_contrat?: string | null;
  disponibilite?: string | null;

  entretien_done: boolean;
  test_is_ok: boolean;
  admissible: boolean;
  inscrit_gespers: boolean;
  en_accompagnement_tre?: boolean;
  en_appairage?: boolean;
  courrier_rentree: boolean;

  communication?: number | null;
  experience?: number | null;
  csp?: number | null;
  date_rentree?: string | null; // ISO

  // ───── Placement / appairage ─────
  responsable_placement?: number | null;
  responsable_placement_nom?: string | null;
  date_placement?: string | null; // ISO
  entreprise_placement?: number | null;
  entreprise_placement_nom?: string | null;
  resultat_placement?: string | null;
  resultat_placement_display?: string | null;
  entreprise_validee?: number | null;
  entreprise_validee_nom?: string | null;

  // ───── Suivi  ─────
  nb_appairages?: number;
  nb_prospections?: number;
  last_appairage?: AppairageLite | null;
  ateliers_resume?: string;
  ateliers_counts?: AtelierCounts;
  notes?: string | null;
  origine_sourcing?: string | null;
  contrat_signe?: ContratSigneValue | null;
  contrat_signe_display?: string | null;
  rgpd_legal_basis?: RgpdLegalBasisValue | null;
  rgpd_notice_status?: string | null;
  rgpd_creation_source?: string | null;
  rgpd_consent_obtained?: boolean;
  rgpd_consent_obtained_at?: string | null;
  rgpd_notice_sent_at?: string | null;
  rgpd_data_reviewed_at?: string | null;
  demande_compte_statut?: DemandeCompteStatutValue | null;
  demande_compte_date?: string | null;
  demande_compte_traitee_le?: string | null;

  // ───── Système ─────
  date_inscription: string; // ISO
  created_at?: string;
  updated_at?: string;
  created_by?: number | { id: number; full_name?: string } | null;
  updated_by?: number | { id: number; full_name?: string } | null;
  nom_complet: string;
  role_utilisateur?: string;
  peut_modifier?: boolean;
  compte_utilisateur?: number | { id: number; full_name?: string } | null;
  age?: number | null; // calculé côté backend
  vu_par?: number | null;
  vu_par_nom?: string | null;
}

export interface CandidatListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Candidat[];
}

// Payload d'édition/création côté front (on omet les champs calculés/serveur)
export type CandidatFormData = Partial<
  Omit<
    Candidat,
    | "id"
    | "nom_complet"
    | "age"
    | "nb_appairages"
    | "nb_prospections"
    | "role_utilisateur"
    | "ateliers_resume"
    | "peut_modifier"
    | "created_at"
    | "updated_at"
    | "created_by"
    | "updated_by"
    | "formation_info"
    | "date_inscription"
    | "last_appairage"
    | "responsable_placement_nom"
    | "entreprise_placement_nom"
    | "entreprise_validee_nom"
    | "vu_par_nom"
    | "resultat_placement_display"
    | "cv_statut_display"
    | "ateliers_counts"
  >
>;

// ─────────────────────────────────────────────────────────────────────────────
export interface CandidatMeta {
  statut_choices: Choice[];
  parcours_phase_choices?: Choice[];
  phase_contract?: PhaseContract;
  phase_filter_aliases?: Record<string, string[]>;
  phase_ordering_fields?: string[];
  phase_read_only_fields?: string[];
  manual_status_flags?: string[];
  phase_transition_actions?: PhaseActionContract[];
  statut_metier_choices?: Choice[];
  cv_statut_choices: Array<{ value: CVStatutValue; label: string }>;
  type_contrat_choices: Choice[];
  disponibilite_choices: Choice[];
  resultat_placement_choices: Choice[];
  contrat_signe_choices: Choice[];
  niveau_choices: Choice[];
  centre_choices?: Choice[];
  formation_choices?: Choice[];
  rgpd_legal_basis_choices?: Choice[];
  rgpd_notice_status_choices?: Choice[];
  rgpd_creation_source_choices?: Choice[];
  rgpd_consent_fields?: string[];
  sexe_choices?: Choice[];
  pays_choices?: Choice[];

  // ✅ nouveaux possibles selon backend/meta
  regime_social_choices?: Choice[];
  situation_actuelle_choices?: Choice[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Filtres + params de liste (UI)
// ─────────────────────────────────────────────────────────────────────────────

export interface CandidatFiltresValues {
  centre?: number;
  formation?: number;
  ville?: string;
  code_postal?: string;
  statut?: string;
  cv_statut?: CVStatutValue; // ✅ fortement typé
  type_contrat?: string;
  disponibilite?: string;
  resultat_placement?: string;
  contrat_signe?: string;
  responsable_placement?: number;

  rqth?: boolean | "true" | "false";
  permis_b?: boolean | "true" | "false";
  admissible?: boolean | "true" | "false";
  inscrit_gespers?: boolean | "true" | "false";
  en_accompagnement_tre?: boolean | "true" | "false";
  en_appairage?: boolean | "true" | "false";
  has_osia?: boolean | "true" | "false";
  entretien_done?: boolean | "true" | "false";
  test_is_ok?: boolean | "true" | "false";

  date_min?: string; // ISO (>= date_inscription)
  date_max?: string; // ISO (<= date_inscription)

  search?: string;
  page?: number;
  page_size?: number;
  ordering?: string; // ex: "-date_inscription"
}

export type CandidatFiltresOptions = Partial<Record<keyof CandidatFiltresValues, ChoiceOption[]>>;

// … (tes types existants)
export interface CandidatReadMinimal {
  id: number;
  nom: string;
  prenom: string;
  email?: string | null;
  telephone?: string | null;
  ville?: string | null;
  code_postal?: string | null;
  formation?: number | null;
  statut: string;
  cv_statut: CVStatutValue | null;
  created_at: string;
  updated_at: string;
}
