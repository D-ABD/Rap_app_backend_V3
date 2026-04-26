// types/partenaire.ts

export type PartenaireType = "entreprise" | "partenaire" | "personne";

export type PartenaireAction =
  | "recrutement_emploi"
  | "recrutement_stage"
  | "recrutement_apprentissage"
  | "presentation_metier_entreprise"
  | "visite_entreprise"
  | "coaching"
  | "partenariat"
  | "autre"
  | "non_definie";

export type CentreLite = { id: number; nom: string };

export interface Partenaire {
  id: number;
  was_reused?: boolean;
  nom: string;
  type: PartenaireType;
  type_display: string;

  secteur_activite?: string | null;

  // 📍 Localisation
  street_number?: string | null;
  street_name?: string | null;
  street_complement?: string | null;
  zip_code?: string | null;
  city?: string | null;
  country?: string | null;

  // 📞 Coordonnées générales
  telephone?: string | null;
  email?: string | null;

  // 🧭 Centre par défaut
  default_centre?: CentreLite | null;
  default_centre_id?: number | null;
  default_centre_nom?: string | null;

  // 👤 Contact principal
  contact_nom?: string | null;
  contact_poste?: string | null;
  contact_telephone?: string | null;
  contact_email?: string | null;

  // 🌐 Web
  website?: string | null;
  social_network_url?: string | null;

  // ⚙️ Actions et descriptions
  actions?: PartenaireAction | null;
  actions_display?: string | null;
  action_description?: string | null;
  description?: string | null;

  // 🏢 Donnees employeur source CERFA : listes codees cote metier
  siret?: string | null;
  type_employeur_code?: string | null;
  employeur_specifique_code?: string | null;
  code_ape?: string | null;
  effectif_total?: number | null;
  idcc?: string | null;
  assurance_chomage_speciale?: boolean;

  // 🎓 Maitres d'apprentissage n°1
  maitre1_nom_naissance?: string | null;
  maitre1_prenom?: string | null;
  maitre1_date_naissance?: string | null; // ISO string
  maitre1_courriel?: string | null;
  maitre1_emploi_occupe?: string | null;
  maitre1_diplome_titre?: string | null;
  maitre1_niveau_diplome_code?: string | null;

  // 🎓 Maitres d'apprentissage n°2
  maitre2_nom_naissance?: string | null;
  maitre2_prenom?: string | null;
  maitre2_date_naissance?: string | null; // ISO string
  maitre2_courriel?: string | null;
  maitre2_emploi_occupe?: string | null;
  maitre2_diplome_titre?: string | null;
  maitre2_niveau_diplome_code?: string | null;

  // 🕓 Métadonnées
  slug: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  /** Fiche retirée de la liste du compte courant (retrait perso, sans archivage global) */
  retrait_dans_ma_liste?: boolean;

  created_by?: {
    id: number;
    full_name: string;
  } | null;

  // 🧮 Champs calculés
  full_address: string;
  contact_info: string;
  has_contact: boolean;
  has_address: boolean;
  has_web: boolean;

  // 📊 Compteurs (objets { count })
  prospections: { count: number };
  appairages: { count: number };
  formations: { count: number };
  candidats: { count: number };

  // 📈 Annotations optionnelles
  prospections_count?: number;
  appairages_count?: number;
  formations_count?: number;
  candidats_count?: number;
}

// Alias
export type PartenaireWithRelations = Partenaire;

export interface PartenaireChoice {
  value: string;
  label: string;
}

export interface PartenaireChoicesResponse {
  types: PartenaireChoice[];
  actions: PartenaireChoice[];
}

// Pagination générique
export type Paginated<T> = { results: T[]; count: number };

export interface PartenaireMinimal {
  id: number;
  nom: string;
  type: string;
  secteur_activite?: string | null;
  city?: string | null;
  zip_code?: string | null;

  default_centre_id?: number | null;
  default_centre_nom?: string | null;

  contact_nom?: string | null;
  contact_email?: string | null;
  contact_telephone?: string | null;
  website?: string | null;

  is_active: boolean;
  created_at: string;
  updated_at: string;
}
