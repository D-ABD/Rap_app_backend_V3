/**
 * TypeScript types pour le modèle Centre
 * Basé sur le modèle Django + serializer complet.
 */

export interface Centre {
  /** Identifiant unique du centre */
  id: number;

  /** Date de création (ISO 8601) */
  created_at: string | null;

  /** Date de dernière mise à jour (ISO 8601) */
  updated_at: string | null;

  /** Statut d'activité */
  is_active: boolean;

  /** Nom du centre (unique) */
  nom: string;

  /** Code postal à 5 chiffres */
  code_postal: string | null;

  /** Commune */
  commune: string | null;

  /** Numéro de voie (ex: 12, 4B, etc.) */
  numero_voie: string | null;

  /** Nom de la voie (ex: Rue de la Paix) */
  nom_voie: string | null;

  /** Complément d’adresse (bâtiment, étage, etc.) */
  complement_adresse: string | null;

  /** N° UAI du centre (si applicable) */
  numero_uai_centre: string | null;

  /** Numéro SIRET du centre */
  siret_centre: string | null;

  /** Indique si c’est un CFA d’entreprise */
  cfa_entreprise: boolean;

  // ───────────────────────────────────────────────
  // Champs liés au CFA responsable
  // ───────────────────────────────────────────────
  cfa_responsable_est_lieu_principal: boolean;
  cfa_responsable_denomination: string | null;
  cfa_responsable_uai: string | null;
  cfa_responsable_siret: string | null;

  cfa_responsable_numero: string | null;
  cfa_responsable_voie: string | null;
  cfa_responsable_complement: string | null;
  cfa_responsable_code_postal: string | null;
  cfa_responsable_commune: string | null;

  // ───────────────────────────────────────────────
  // Champs calculés / dérivés
  // ───────────────────────────────────────────────
  /** Adresse complète formatée */
  full_address: string | null;

  /** Nombre de PrepaCompGlobal associés */
  nb_prepa_comp_global: number;
}

/**
 * Variante simplifiée pour formulaires (édition / création)
 * → exclut les champs calculés et les readonly
 */
export type CentreFormData = Omit<
  Centre,
  "id" | "created_at" | "updated_at" | "is_active" | "full_address" | "nb_prepa_comp_global"
>;

/**
 * Structure légère utilisée pour les listes (autocomplete / sélecteurs)
 */
export interface CentreOption {
  id: number;
  label: string;
}

/**
 * Constantes exposées par l’API (GET /api/centres/constants)
 */
export interface CentreConstants {
  nom_max_length: number;
  code_postal_length: number;
}
