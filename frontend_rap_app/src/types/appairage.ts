// ----------------------------------
// Types bruts des énumérations DRF
// ----------------------------------

export type AppairageStatut =
  | "transmis"
  | "en_attente"
  | "accepte"
  | "refuse"
  | "annule"
  | "a_faire"
  | "contrat_a_signer"
  | "contrat_en_attente"
  | "appairage_ok";

// ----------------------------------
// Nouvelle énumération DRF : activité
// ----------------------------------
export type AppairageActivite = "actif" | "archive";

// Labels associés
export const AppairageActiviteLabels: Record<AppairageActivite, string> = {
  actif: "Actif",
  archive: "Archivé",
};

export const isAppairageArchived = (a: { activite?: AppairageActivite }): boolean =>
  a.activite === "archive";

// Labels associés
export const AppairageStatutLabels: Record<AppairageStatut, string> = {
  transmis: "Transmis au partenaire",
  en_attente: "En attente de réponse",
  accepte: "Accepté",
  refuse: "Refusé",
  annule: "Annulé",
  a_faire: "À faire",
  contrat_a_signer: "Contrat à signer",
  contrat_en_attente: "Contrat en attente",
  appairage_ok: "Appairage OK",
};

export interface HistoriqueAppairage {
  id: number;
  date: string; // ISO format
  statut: AppairageStatut;
  statut_display: string;
  commentaire: string;
  auteur: number | null;
  auteur_nom: string | null;
  appairage: number;
}

/** 🔹 Commentaire lié à un appairage */
export interface CommentaireAppairage {
  id: number;
  body: string;
  created_at: string; // ISO
  updated_at: string; // ISO
  auteur_nom: string | null;
}

export interface TypeOffreMini {
  id?: number;
  nom?: string;
  libelle?: string;
  couleur?: string;
}

export interface FormationIdentiteComplete {
  formation_nom: string;
  centre_id: number | null;
  centre_nom: string;
  type_offre?: string | TypeOffreMini | null;
  num_offre: string | null;
  statut: string;
  start_date: string | null; // ISO
  end_date: string | null; // ISO
  saturation_formation?: number | null;
  saturation_badge?: string | null;
}

export interface FormationIdentiteBref {
  formation_nom: string;
  centre_id: number | null;
  centre_nom: string;
  num_offre: string | null;
  start_date: string | null; // ISO
  end_date: string | null; // ISO
}

export interface Appairage {
  id: number;
  candidat: number;
  candidat_nom: string;
  partenaire: number;
  partenaire_nom: string;
  partenaire_contact_nom?: string | null;
  partenaire_email?: string | null;
  partenaire_telephone?: string | null;

  formation: number | null;
  formation_nom: string | null;

  formation_type_offre?: string | null;
  formation_places_disponibles?: number | null;
  formation_places_total?: number | null;

  /** ➕ Nouveaux champs détaillés */
  formation_statut?: string | null;
  formation_date_debut?: string | null;
  formation_date_fin?: string | null;
  formation_numero_offre?: string | null;
  formation_centre?: string | null;

  formation_detail?: FormationIdentiteComplete | null;
  formation_bref?: FormationIdentiteBref | null;

  date_appairage: string; // ISO
  statut: AppairageStatut;
  statut_display: string;
  activite?: AppairageActivite;
  activite_display?: string;
  commentaire: string | null;
  commentaires?: CommentaireAppairage[];

  retour_partenaire: string | null;
  date_retour: string | null;

  created_by: number;
  created_by_nom: string;
  created_at: string;

  updated_by?: number | null;
  updated_by_nom?: string | null;
  updated_at?: string | null;

  peut_modifier: boolean;
  historiques: HistoriqueAppairage[];

  user_role?: string | null;
  last_commentaire?: string | null;
}

export interface AppairageListItem {
  id: number;
  candidat_nom: string;
  partenaire_nom: string;
  partenaire_contact_nom?: string | null;

  partenaire_email?: string | null;
  partenaire_telephone?: string | null;

  formation: number | null;
  formation_nom: string | null;

  formation_type_offre?: string | null;
  formation_places_total?: number | null;
  formation_places_disponibles?: number | null;

  /** ➕ Pour être homogène avec détail */
  formation_statut?: string | null;
  formation_date_debut?: string | null;
  formation_date_fin?: string | null;
  formation_numero_offre?: string | null;
  formation_centre?: string | null;

  formation_bref?: FormationIdentiteBref | null;
  formation_detail?: FormationIdentiteComplete | null;

  date_appairage: string;
  statut: AppairageStatut;
  statut_display: string;
  activite?: AppairageActivite;
  activite_display?: string;
  commentaire: string | null;
  last_commentaire?: string | null;

  created_by_nom: string | null;
  created_at?: string;
  updated_by_nom?: string | null;
  updated_at?: string | null;
}

export type AppairageCreatePayload = {
  candidat: number;
  partenaire: number;
  formation?: number | null;
  statut: AppairageStatut;
  commentaire?: string | null;
  retour_partenaire?: string | null;
  date_retour?: string | null;
  created_by?: number;
};

export interface AppairageFormData {
  partenaire: number | null;
  partenaire_nom: string | null;

  formation: number | null;
  formation_nom: string | null;

  candidat: number | null;
  candidat_nom: string | null;
  candidat_prenom: string | null;

  statut: AppairageStatut;
  activite?: AppairageActivite | null;

  commentaire: string;

  last_commentaire: string | null;
  commentaires: {
    id: number;
    body: string;
    created_at: string;
    auteur_nom?: string | null;
  }[];
}

export type AppairageUpdatePayload = Partial<AppairageCreatePayload>;

export interface AppairageMeta {
  statut_choices: { value: AppairageStatut; label: string }[];
  formation_choices: { value: number; label: string }[];
  candidat_choices: { value: number; label: string }[];
  partenaire_choices: { value: number; label: string }[];
  user_choices: { value: number; label: string }[];
}

export interface PaginatedResults<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AppairageFiltresValues {
  statut?: string;
  partenaire?: number;
  formation?: number;
  candidat?: number;
  search?: string;
  page?: number;
  page_size?: number;
  created_by?: number;
  avec_archivees?: boolean; // 👈 ajouté
  activite?: AppairageActivite; // ✅ ajouté

  annee?: number;
  date_min?: string; // format YYYY-MM-DD
  date_max?: string;
}
