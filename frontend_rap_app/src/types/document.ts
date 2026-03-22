// src/types/document.ts

export interface Document {
  id: number;
  nom_fichier: string;
  fichier?: string;
  type_document: string;
  type_document_display: string;
  taille_fichier?: number | null;
  taille_readable?: string;
  mime_type?: string;
  extension?: string;
  icon_class?: string;
  download_url?: string;
  created_at?: string;
  created_by?: string;
  updated_at?: string;
  is_viewable_in_browser?: boolean;

  // 🔗 Liaison formation
  formation: number | null;
  formation_nom?: string;
  formation_num_offre?: string;
  formation_start_date?: string;
  formation_end_date?: string;
  formation_centre_nom?: string;
  formation_type_offre_libelle?: string;

  formation_statut?: {
    id: number;
    nom: string;
    libelle: string;
    couleur: string;
  };
}

// Données envoyées à l'API pour créer ou modifier un document
export interface DocumentFormData {
  nom_fichier: string;
  fichier?: File | null;
  type_document: string;
  formation: number | null;
  download_url?: string;
  type_document_label?: string;
  [key: string]: unknown;
}

// Données initiales injectées dans le formulaire d'édition
export interface DocumentFormInitialValues {
  nom_fichier: string;
  fichier: File | null;
  type_document: string;
  type_document_display?: string;
  formation: number | null;
  formation_nom?: string;
  download_url?: string;
  taille_readable?: string;
  mime_type?: string;
  extension?: string;
  icon_class?: string;
  is_viewable_in_browser?: boolean;

  // ✅ Nouveaux champs enrichis
  formation_centre_nom?: string;
  formation_type_offre_libelle?: string;
  formation_num_offre?: string;
  formation_start_date?: string;
  formation_end_date?: string;
  formation_statut?: {
    id: number;
    nom: string;
    libelle: string;
    couleur: string;
  };
}

export interface TypeDocumentChoice {
  value: string;
  label: string;
}

export interface DocumentQueryParams {
  search?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
  formation?: number;
  type_document?: string;
}

export interface DocumentAPIResponse {
  success: boolean;
  message: string;
  data: Document;
}

export interface DocumentsListAPIResponse {
  success: boolean;
  message: string;
  data: {
    count: number;
    results: Document[];
  };
}
