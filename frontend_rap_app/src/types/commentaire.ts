// ======================================================
// src/types/commentaire.ts
// Aligné avec CommentaireViewSet + Serializer + Formation
// ======================================================

export interface Commentaire {
  id: number;

  // --- Référence formation ---
  formation: number;
  formation_id?: number;
  formation_nom?: string;
  formation_label?: string;
  centre_id?: number;

  // --- Métadonnées formation ---
  num_offre?: string;
  centre_nom?: string;
  statut_nom?: string;
  type_offre_nom?: string;
  formation_etat?: string; // ✅ nouveau : état de la formation (ouverte, terminée...)

  // --- Contenu principal ---
  contenu: string;
  auteur?: string;
  activite?: string; // ✅ ajouté côté backend

  // --- Champs de saturation ---
  saturation?: number; // éventuel champ "legacy"
  saturation_formation?: number; // saturation au moment du commentaire
  taux_saturation?: number | null; // saturation actuelle de la formation
  taux_transformation?: number | null; // transformation actuelle de la formation
  saturation_commentaires?: number | null; // moyenne des saturations des commentaires

  // --- Statut & logique d’archivage ---
  statut_commentaire?: "actif" | "archive" | string; // ✅ exposé dans le serializer
  est_archive?: boolean; // alias du backend
  is_archived?: boolean; // alias front
  archived_at?: string | null;
  archived_by?: string | null;

  // --- Métadonnées utilisateur ---
  created_by?: number | string | null;
  created_by_username?: string;
  updated_by?: number | string | null;
  updated_by_username?: string;
  auteur_id?: number | null; // ✅ utile pour filtrage côté front

  // --- Métadonnées temporelles ---
  created_at?: string;
  updated_at?: string;
  date?: string;
  heure?: string;
  start_date?: string;
  end_date?: string;

  // --- Flags utiles ---
  is_recent?: boolean;
  is_edited?: boolean;
  can_edit?: boolean;
  can_archive?: boolean;
}

// ======================================================
// 🧾 Formulaires
// ======================================================
export interface CommentaireFormData {
  formation: number;
  contenu: string;
  activite?: string;
  saturation?: number;
}

export type CommentaireFormErrors = Partial<Record<keyof CommentaireFormData, string>>;

// ======================================================
// 🧩 Métadonnées / Réponses API
// ======================================================
export interface CommentaireMeta {
  saturation_min: number;
  saturation_max: number;
  preview_default_length: number;
  recent_default_days: number;
}

export interface CommentaireResponse {
  success: boolean;
  message: string;
  data: Commentaire;
}

export interface PaginatedCommentairesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Commentaire[];
}

// ======================================================
// ⚙️ Filtres pour la liste de commentaires
// ======================================================
export interface CommentaireFiltresData {
  centres: { id: number; nom: string }[];
  statuts: { id: number; nom: string }[];
  type_offres: { id: number; nom: string }[];
  formation_etats?: { value: string; label: string }[];
  auteurs?: { id: number; nom: string }[]; // ✅ nouveau filtre possible
}

export interface CommentaireFiltresValues {
  centre_id?: number;
  statut_id?: number | string; // ✅ "actif" / "archive" ou id numérique
  type_offre_id?: number;
  formation_etat?: string;
  auteur_id?: number; // ✅ ajout filtre par auteur
  formation_nom?: string; // ✅ ajout filtre texte sur le nom de formation
  formation?: number;
  search?: string;
  date?: string;
  date_from?: string;
  date_to?: string;
  include_archived?: boolean;

  [key: string]: string | number | boolean | undefined;
}

// ======================================================
// 📘 Constantes & utilitaires
// ======================================================
export type CommentaireStatut = "actif" | "archive";

export const STATUTS_COMMENTAIRE: Record<CommentaireStatut, string> = {
  actif: "Actif",
  archive: "Archivé",
};
