// src/types/cerfa.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosInstance } from "axios";

/* ----------------------------------------
   🔧 Axios instance (personnalise BASE_URL) 
----------------------------------------- */
export const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export const api: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true,
});

/* ----------------------------------------
   📦 Types communs DRF (pagination)
----------------------------------------- */
export type DRFListResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type Ordering =
  | "-created_at"
  | "created_at"
  | "-date_conclusion"
  | "date_conclusion"
  | "-date_debut_execution"
  | "date_debut_execution";

export type CerfaQueryParams = {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: Ordering;
  // filtres
  candidat?: number;
  formation?: number;
  employeur?: number;
  centre?: number;
  cerfa_type?: "apprentissage" | "professionnalisation";
  type_contrat_code?: string;
  auto_generated?: boolean;
  date_field?: "created_at" | "date_conclusion" | "date_debut_execution" | "formation_debut";
  date_from?: string;
  date_to?: string;
  diplome_vise?: string;
};

/* ----------------------------------------
   💶 Rémunération liée
----------------------------------------- */
export type CerfaRemuneration = {
  id: number;
  annee: 1 | 2 | 3 | 4;
  date_debut: string | null; // ISO date
  date_fin: string | null; // ISO date
  pourcentage: number | null;
  reference: "SMIC" | "SMC";
  montant_mensuel_estime: number | null;
};

/* ----------------------------------------
   🧾 Contrat CERFA – 100% des champs
   (les dates = string ISO, décimaux = number)
----------------------------------------- */
export type CerfaContratBase = {
  // fichier généré
  pdf_fichier: string | null;

  // créé automatiquement ?
  auto_generated: boolean;
  cerfa_type: "apprentissage" | "professionnalisation";

  // relations
  candidat: number; // FK -> Candidat (id)
  formation: number | null; // FK -> Formation (id)
  employeur: number | null; // FK -> Partenaire (id)

  // EMPLOYEUR
  employeur_prive: boolean;
  employeur_public: boolean;
  employeur_nom: string;
  employeur_adresse_numero: string | null;
  employeur_adresse_voie: string | null;
  employeur_adresse_complement: string | null;
  employeur_code_postal: string | null;
  employeur_commune: string | null;
  employeur_telephone: string | null;
  employeur_email: string | null;
  employeur_siret: string | null;
  employeur_type: string | null;
  employeur_type_code: string | null;
  employeur_specifique: string | null;
  employeur_specifique_code: string | null;
  employeur_code_ape: string | null;
  employeur_effectif: number | null;
  employeur_code_idcc: string | null;
  employeur_urssaf_particulier: string | null;
  employeur_organisme_prevoyance: string | null;
  employeur_numero_projet: string | null;
  employeur_regime_assurance_chomage: boolean;

  // MAÎTRES D’APPRENTISSAGE
  maitre1_nom: string | null;
  maitre1_prenom: string | null;
  maitre1_date_naissance: string | null;
  maitre1_email: string | null;
  maitre1_emploi: string | null;
  maitre1_diplome: string | null;
  maitre1_niveau_diplome: string | null;
  maitre1_niveau_diplome_code: string | null;

  maitre2_nom: string | null;
  maitre2_prenom: string | null;
  maitre2_date_naissance: string | null;
  maitre2_email: string | null;
  maitre2_emploi: string | null;
  maitre2_diplome: string | null;
  maitre2_niveau_diplome: string | null;
  maitre2_niveau_diplome_code: string | null;
  maitre_eligible: boolean;

  // APPRENTI
  apprenti_nom_naissance: string;
  apprenti_nom_usage: string | null;
  apprenti_prenom: string;
  apprenti_nir: string | null;
  apprenti_numero: string | null;
  apprenti_voie: string | null;
  apprenti_complement: string | null;
  apprenti_code_postal: string | null;
  apprenti_commune: string | null;
  apprenti_telephone: string | null;
  apprenti_email: string | null;

  representant_nom: string | null;
  representant_lien: string | null;
  representant_adresse_numero: string | null;
  representant_adresse_voie: string | null;
  representant_adresse_complement: string | null;
  representant_code_postal: string | null;
  representant_commune: string | null;
  representant_email: string | null;

  apprenti_date_naissance: string | null;
  apprenti_sexe: "M" | "F" | null;
  apprenti_departement_naissance: string | null;
  apprenti_commune_naissance: string | null;
  apprenti_nationalite: string | null;
  apprenti_nationalite_code: string | null;
  apprenti_regime_social: string | null;
  apprenti_regime_social_code: string | null;
  apprenti_sportif_haut_niveau: boolean;
  apprenti_rqth: boolean;
  apprenti_droits_rqth: boolean;
  apprenti_equivalence_jeunes: boolean;
  apprenti_extension_boe: boolean;
  apprenti_situation_avant: string | null;
  apprenti_situation_avant_code: string | null;
  apprenti_dernier_diplome_prepare: string | null;
  apprenti_dernier_diplome_prepare_code: string | null;
  apprenti_derniere_annee_suivie: string | null;
  apprenti_derniere_annee_suivie_code: string | null;
  apprenti_intitule_dernier_diplome: string | null;
  apprenti_plus_haut_diplome: string | null;
  apprenti_plus_haut_diplome_code: string | null;
  apprenti_inscrit_france_travail: boolean | null;
  apprenti_france_travail_numero: string | null;
  apprenti_france_travail_duree_mois: number | null;
  apprenti_minimum_social_type: string | null;
  apprenti_projet_entreprise: boolean;

  // FORMATION / CFA
  cfa_entreprise: boolean;
  cfa_denomination: string | null;
  cfa_uai: string | null;
  cfa_siret: string | null;
  cfa_adresse_numero: string | null;
  cfa_adresse_voie: string | null;
  cfa_adresse_complement: string | null;
  cfa_code_postal: string | null;
  cfa_commune: string | null;
  cfa_est_lieu_formation_principal: boolean;

  diplome_vise: string | null;
  diplome_vise_code: string | null;
  diplome_intitule: string | null;
  code_diplome: string | null;
  code_rncp: string | null;
  type_qualification_visee: string | null;
  organisme_declaration_activite: string | null;
  nombre_organismes_formation: number | null;
  specialite_formation: string | null;
  organisation_formation: string | null;
  formation_heures_enseignements: number | null;
  formation_debut: string | null;
  formation_fin: string | null;
  formation_duree_heures: number | null;
  formation_distance_heures: number | null;
  formation_lieu_denomination: string | null;
  formation_lieu_uai: string | null;
  formation_lieu_siret: string | null;
  formation_lieu_voie: string | null;
  formation_lieu_code_postal: string | null;
  formation_lieu_commune: string | null;
  pieces_justificatives_ok: boolean;

  // CONTRAT
  type_contrat: string | null;
  type_contrat_code: string | null;
  nature_contrat: "cdi" | "cdd" | "travail_temporaire" | null;
  type_derogation: string | null;
  type_derogation_code: string | null;
  motif_derogation: string | null;
  numero_contrat_precedent: string | null;
  emploi_occupe_pendant_contrat: string | null;
  classification_emploi: string | null;
  classification_niveau: string | null;
  coefficient_hierarchique: string | null;
  duree_periode_essai_jours: number | null;
  date_conclusion: string | null;
  date_debut_execution: string | null;
  date_fin_contrat: string | null;
  date_debut_formation_pratique_employeur: string | null;
  date_effet_avenant: string | null;
  duree_hebdo_heures: number | null;
  duree_hebdo_minutes: number | null;
  travail_machines_dangereuses: boolean;

  // REMUNERATION
  salaire_brut_mensuel: number | null;
  avantage_nourriture: number | null;
  avantage_logement: number | null;
  avantage_autre: string | null;
  remu_annee1_periode1_debut: string | null;
  remu_annee1_periode1_fin: string | null;
  remu_annee1_periode1_pourcentage: number | null;
  remu_annee1_periode1_reference: string | null;
  remu_annee1_periode2_debut: string | null;
  remu_annee1_periode2_fin: string | null;
  remu_annee1_periode2_pourcentage: number | null;
  remu_annee1_periode2_reference: string | null;
  remu_annee2_periode1_debut: string | null;
  remu_annee2_periode1_fin: string | null;
  remu_annee2_periode1_pourcentage: number | null;
  remu_annee2_periode1_reference: string | null;
  remu_annee2_periode2_debut: string | null;
  remu_annee2_periode2_fin: string | null;
  remu_annee2_periode2_pourcentage: number | null;
  remu_annee2_periode2_reference: string | null;
  caisse_retraite: string | null;

  // SIGNATURES
  lieu_signature: string | null;
  opco_nom: string | null;
  opco_adherent_numero: string | null;

  // Rémunérations liées (imbriquées côté serializer)
  remunerations?: CerfaRemuneration[];
};

export type CerfaContrat = CerfaContratBase & {
  id: number;
  is_active?: boolean;
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
  created_by?: number | null;
  updated_by?: number | null;
  created_by_nom?: string | null;
  updated_by_nom?: string | null;

  // champs calculés côté serializer
  pdf_url: string | null;
  pdf_status: "ready" | "missing";

  // ⚠️ Champs manquants détectés par le backend (optionnel)
  missing_fields?: string[];
};

/* ----------------------------------------
   ✍️ Create / Update payloads
----------------------------------------- */
export type CerfaContratCreate = Partial<
  Omit<
    CerfaContratBase,
    "employeur_nom" | "apprenti_nom_naissance" | "apprenti_prenom" | "candidat"
  >
> & {
  // on garde candidat requis (contrainte minimale)
  candidat: number;
  // ces champs sont très souvent requis côté modèle ; si ton API les rend optionnels,
  // tu peux supprimer leur "required" ici :
  employeur_nom?: string;
  apprenti_nom_naissance?: string;
  apprenti_prenom?: string;
};

export type CerfaContratUpdate = Partial<CerfaContratBase>;
