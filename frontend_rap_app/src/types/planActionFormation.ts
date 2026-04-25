/**
 * Types TypeScript du module **Plan d'action formation** (V1 listes / CRUD futur).
 * Alignés sur les sérialiseurs DRF : liste compacte, détail et filtres d’API.
 */

/** Élément renvoyé par `GET /api/plans-action-formation/` (serializer liste). */
export type PlanActionFormationListItem = {
  id: number;
  titre: string;
  slug: string | null;
  date_debut: string;
  date_fin: string;
  periode_type: "jour" | "semaine" | "mois";
  periode_type_display: string;
  centre: number | null;
  centre_nom: string | null;
  formation: number | null;
  formation_nom: string | null;
  statut: "brouillon" | "valide" | "archive";
  statut_display: string;
  nb_commentaires: number;
  created_at: string;
  updated_at: string;
  created_by: number | null;
  created_by_label: string | null;
};

/** Passé à `onSaved` après enregistrement (navigation conditionnelle brouillon / validé). */
export type PlanActionFormationSavedPayload = {
  id: number;
  statut: "brouillon" | "valide" | "archive";
};

/** Enveloppe paginée (RapAppPagination) sous `data` pour les listes. */
export type PlanActionFormationPaginatedData = {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  next: string | null;
  previous: string | null;
  results: PlanActionFormationListItem[];
};

/** Paramètres supportés côté client pour la liste (alignés `PlanActionFormationFilterSet` + search). */
export type PlanActionFormationListQuery = {
  page: number;
  page_size: number;
  search?: string;
  statut?: string;
  centre?: number;
  formation?: number;
  /** Filtre sur `date_debut` du plan (inclus). */
  date_debut_gte?: string;
  /** Filtre sur `date_debut` du plan (inclus). */
  date_debut_lte?: string;
  /** Filtre sur `date_fin` du plan (inclus). */
  date_fin_gte?: string;
  date_fin_lte?: string;
  ordering?: string;
};

/** Objet de lecture (GET détail) — aligné `PlanActionFormationReadSerializer`. */
export type PlanActionFormationDetail = {
  id: number;
  titre: string;
  slug: string | null;
  date_debut: string;
  date_fin: string;
  periode_type: "jour" | "semaine" | "mois";
  periode_type_display: string;
  centre: number | null;
  centre_nom: string | null;
  formation: number | null;
  formation_nom: string | null;
  synthese: string;
  resume_points_cles: string;
  plan_action: string;
  plan_action_structured: unknown;
  statut: "brouillon" | "valide" | "archive";
  statut_display: string;
  nb_commentaires: number;
  metadata: unknown;
  commentaire_ids: number[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: number | null;
  created_by_label: string | null;
  updated_by: number | null;
  updated_by_label: string | null;
};

/** Corps POST / PATCH (écriture) — champs gérés par le formulaire. */
export type PlanActionFormationWriteBody = {
  titre: string;
  date_debut: string;
  date_fin: string;
  periode_type: "jour" | "semaine" | "mois";
  centre: number | null;
  formation: number | null;
  synthese: string;
  resume_points_cles: string;
  plan_action: string;
  statut: "brouillon" | "valide" | "archive";
  commentaire_ids: number[];
  /**
   * Périmètre multi-centres (ex. { centre_ids: [1, 2, 3] }) — le FK `centre` reste le premier id pour l’affichage.
   * Toujours un objet (souvent `{}` si aucun centre), pas `null` (aligné `JSONField` côté API).
   */
  metadata?: Record<string, unknown> | null;
};

/** Query `GET .../commentaires-groupes/`. */
export type PlanActionCommentairesGroupesQuery = {
  date_debut?: string;
  date_fin?: string;
  /** Plusieurs identifiants centre → paramètre `centres=1,2,3` (prioritaire sur `centre`). */
  centres?: number[];
  centre?: number;
  /** Plusieurs identifiants de formation → requêtes `formations=1,2,3` */
  formations?: number[];
  formation?: number;
  inclure_archives?: boolean;
  limite?: number;
};

export type PlanActionCommentaireGroupeItem = {
  id: number;
  contenu: string;
  created_at: string;
  statut_commentaire: string;
  saturation: string | null;
  formation_id: number;
  formation_nom: string | null;
  centre_id: number | null;
  centre_nom: string | null;
  auteur: string | null;
};

export type PlanActionCommentaireJourGroupe = {
  date: string;
  nombre: number;
  commentaires: PlanActionCommentaireGroupeItem[];
};

/** Données `data` de la réponse commentaires regroupés. */
export type PlanActionCommentairesGroupesData = {
  total_commentaires: number;
  commentaires_retournes: number;
  limite: number;
  limite_atteinte: boolean;
  date_debut: string | null;
  date_fin: string | null;
  filtres: {
    centre_ids: number[];
    formation_id: number | null;
    formation_ids?: number[];
    inclure_archives: boolean;
  };
  jours: PlanActionCommentaireJourGroupe[];
};

/** État local du formulaire création / édition. */
export type PlanActionFormationFormValues = {
  titre: string;
  date_debut: string;
  date_fin: string;
  periode_type: "jour" | "semaine" | "mois";
  /** Périmètre : un ou plusieurs centres (vide = chargement = tous les centres autorisés). */
  centreIds: number[];
  /**
   * Filtre optionnel des formations pour « Charger les commentaires » (plusieurs autorisé si
   * les centres correspondants sont cochés). Vide = toutes les formations du périmètre centre.
   */
  formationIds: number[];
  statut: "brouillon" | "valide" | "archive";
  synthese: string;
  resume_points_cles: string;
  plan_action: string;
  selectedCommentaireIds: number[];
  /** Filtre optionnel sur l’endpoint commentaires groupés. */
  inclureArchivesCommentaires: boolean;
  /** Rappel d’enregistrement (lecture) — n’influence pas l’enregistrement. */
  nbCommentairesReference?: number;
  /**
   * Surcharges de texte pour le seul export PDF (clé = id commentaire, ignoré si vide = texte d’origine).
   * Stocké dans `metadata.export_commentaire_overrides` côté API.
   */
  exportCommentaireOverrides: Record<number, string>;
  /** Si vrai : PDF = un seul bloc de texte sans repères formation/auteur/date (`metadata.export_pdf_regroupe_commentaires`). */
  exportPdfRegroupeCommentaires: boolean;
};
