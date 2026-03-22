// =======================================================
// CVTHEQUE TYPES — VERSION CLEAN & OFFICIELLE
// ALIGNÉE À 100% AVEC LE BACKEND SECURISÉ
// =======================================================

// -------------------------------
// DOCUMENT TYPES
// -------------------------------
export type DocumentType = "CV" | "LM" | "DIPLOME" | "AUTRE";

// -------------------------------
// SIMPLE CHOICE (dropdowns)
// -------------------------------
export interface SimpleChoice {
  value: number;
  label: string;
}

// -------------------------------
// ITEM (LIST + PART DETAIL)
// -------------------------------
export interface CVThequeItem {
  id: number;
  titre: string;
  document_type: DocumentType;
  date_depot: string;
  est_public: boolean;
  mots_cles?: string;

  // 🌐 URLs SÉCURISÉES
  preview_url: string | null;   // <iframe>
  download_url: string | null;  // bouton DL

  extension: string;
  taille: string;

  // --- CANDIDAT MINI ---
  candidat: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
    ville: string | null;
    code_postal: string | null;
    statut: string | null;
    cv_statut?: string;
    type_contrat?: string;
  };

  // --- Formation ---
  formation_nom?: string;
  formation_centre?: string;
  formation_type_offre?: string;
  formation_num_offre?: string;
}

// -------------------------------
// DETAIL (hérite de Item)
// -------------------------------
export interface CVThequeDetail extends CVThequeItem {
  formation_statut?: string | null;
  formation_start_date?: string | null;
  formation_end_date?: string | null;
  formation_resume?: string | null;

  // obligatoire dans le détail
  mots_cles: string;
}

// -------------------------------
// CREATE / UPDATE PAYLOAD
// -------------------------------
export interface CVThequePayload {
  candidat?: number | null;
  titre: string;
  document_type: DocumentType;
  est_public?: boolean;
  mots_cles?: string;
  fichier?: File | null;
}

// -------------------------------
// PAGINATION
// -------------------------------
export interface CVThequeFilters {
  document_types: { value: DocumentType; label: string }[];
  centres: { value: number; label: string }[];
  formations: {
    id: number;
    nom: string;
    centre: string;
    type_offre: string;
    statut: string;
  }[];
  type_offres: { value: number; label: string }[];
  statuts_formation: { value: number; label: string }[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
  filters?: CVThequeFilters;
}

// -------------------------------
// CHOICES
// -------------------------------
export interface CVChoicesResponse {
  candidates: SimpleChoice[];
  document_types: { value: DocumentType; label: string }[];
}
