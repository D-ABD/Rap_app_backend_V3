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
  diplome_vise?: string;
  auto_generated?: boolean;
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
  employeur_specifique: string | null;
  employeur_code_ape: string | null;
  employeur_effectif: number | null;
  employeur_code_idcc: string | null;
  employeur_regime_assurance_chomage: boolean;

  // MAÎTRES D’APPRENTISSAGE
  maitre1_nom: string | null;
  maitre1_prenom: string | null;
  maitre1_date_naissance: string | null;
  maitre1_email: string | null;
  maitre1_emploi: string | null;
  maitre1_diplome: string | null;
  maitre1_niveau_diplome: string | null;

  maitre2_nom: string | null;
  maitre2_prenom: string | null;
  maitre2_date_naissance: string | null;
  maitre2_email: string | null;
  maitre2_emploi: string | null;
  maitre2_diplome: string | null;
  maitre2_niveau_diplome: string | null;
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
  apprenti_regime_social: string | null;
  apprenti_sportif_haut_niveau: boolean;
  apprenti_rqth: boolean;
  apprenti_droits_rqth: boolean;
  apprenti_equivalence_jeunes: boolean;
  apprenti_extension_boe: boolean;
  apprenti_situation_avant: string | null;
  apprenti_dernier_diplome_prepare: string | null;
  apprenti_derniere_annee_suivie: string | null;
  apprenti_intitule_dernier_diplome: string | null;
  apprenti_plus_haut_diplome: string | null;
  apprenti_projet_entreprise: boolean;

  // FORMATION / CFA
  cfa_entreprise: boolean;
  cfa_denomination: string | null;
  cfa_uai: string | null;
  cfa_siret: string | null;
  cfa_numero: string | null;
  cfa_voie: string | null;
  cfa_complement: string | null;
  cfa_code_postal: string | null;
  cfa_commune: string | null;
  cfa_lieu_principal: boolean;

  diplome_vise: string | null;
  diplome_intitule: string | null;
  code_diplome: string | null;
  code_rncp: string | null;
  formation_debut: string | null;
  formation_fin: string | null;
  formation_duree_heures: number | null;
  formation_distance_heures: number | null;
  formation_lieu_denomination: string | null;
  formation_lieu_uai: string | null;
  formation_lieu_siret: string | null;
  formation_lieu_numero: string | null;
  formation_lieu_voie: string | null;
  formation_lieu_complement: string | null;
  formation_lieu_code_postal: string | null;
  formation_lieu_commune: string | null;

  // CONTRAT
  type_contrat: string | null;
  type_derogation: string | null;
  motif_derogation: string | null;
  numero_contrat_precedent: string | null;
  date_conclusion: string | null;
  date_debut_execution: string | null;
  date_debut_formation: string | null;
  date_fin_contrat: string | null;
  date_effet_avenant: string | null;
  duree_hebdo_heures: number | null;
  duree_hebdo_minutes: number | null;
  duree_totale_contrat_mois: number | null;
  travail_dangereux: boolean;
  age_apprenti: number | null;

  // REMUNERATION
  ref_salaire: string | null;
  salaire_brut_mensuel: number | null;
  caisse_retraite: string | null;
  avantage_nourriture: number | null;
  avantage_logement: number | null;
  avantage_autre: string | null;
  avantages_en_nature_total: number | null;

  // ATTESTATION EMPLOYEUR
  attestation_pieces_justificatives: boolean;

  // SIGNATURES
  lieu_signature: string | null;
  date_signature_apprenti: string | null;
  date_signature_employeur: string | null;
  signature_apprenti: boolean;
  signature_employeur: boolean;
  signature_representant_legal: boolean;

  // Rémunérations liées (imbriquées côté serializer)
  remunerations?: CerfaRemuneration[];
};

export type CerfaContrat = CerfaContratBase & {
  id: number;
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime

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
