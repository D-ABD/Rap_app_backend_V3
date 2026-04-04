// ================================
// 🔷 AppairageComment types
// ================================

export interface AppairageCommentDTO {
  id: number;
  appairage: number;
  appairage_label: string;
  body: string;
  created_by_username: string;
  auteur_nom: string;
  created_at: string;
  updated_at: string;

  // 🔹 Champs enrichis (lecture seule)
  candidat_nom?: string | null;
  candidat_prenom?: string | null;
  partenaire_nom?: string | null;

  formation_nom?: string | null;
  formation_numero_offre?: string | null;
  formation_centre?: string | null;
  formation_type_offre?: string | null;

  statut_snapshot?: string | null;
  appairage_statut_display?: string | null;

  // ✅ Nouveaux champs alignés avec ProspectionComment
  appairage_owner?: number | null; // appairage.owner_id
  appairage_owner_username?: string | null; // appairage.owner.username
  appairage_partenaire?: number | null; // appairage.partenaire_id
  appairage_statut?: string | null; // appairage.statut brut (machine)

  // 🆕 Champs d’activité / archivage — identiques à ProspectionComment
  statut_commentaire?: "actif" | "archive"; // backend exact
  statut_commentaire_display?: string | null; // ex: "Actif", "Archivé"
  activite?: "actif" | "archive"; // alias harmonisé
  est_archive: boolean; // booléen pratique
  statut_color?: string | null; // couleur d’état (UI)
}

// ⚠️ Serializer attend appairage (clé FK directe)
export interface AppairageCommentCreateInput {
  appairage: number; // obligatoire
  body: string;
  // ✅ on garde la possibilité future d’archiver (staff only)
  statut_commentaire?: "actif" | "archive";
}

export interface AppairageCommentUpdateInput {
  body?: string;
  appairage?: number; // optionnel (déplacement)
  statut_commentaire?: "actif" | "archive"; // aligné backend
}

// ================================
// 🔍 Liste / Filtres
// ================================

export interface AppairageCommentListParams {
  appairage?: number;
  created_by?: number;
  ordering?: "created_at" | "-created_at" | "id" | "-id";

  // 🔹 Filtres additionnels (UI)
  candidat_nom?: string;
  partenaire_nom?: string;
  formation_nom?: string;
  created_by_username?: string;

  // ✅ Nouveaux filtres alignés avec ProspectionCommentViewSet
  appairage_owner?: number;
  appairage_partenaire?: number;
  appairage_statut?: string;

  // 🆕 Filtres d’état / archivage
  est_archive?: boolean | "both";
  activite?: "actif" | "archive";
  statut_commentaire?: "actif" | "archive";

  // Pagination
  page?: number;
}
