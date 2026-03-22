// Une ligne d'historique (modification d’un champ)
export interface HistoriqueFormation {
  id: number;
  formation_id: number;
  formation_nom: string;
  centre_nom: string;
  type_offre_nom: string;
  type_offre_couleur: string;
  statut_nom: string;
  statut_couleur: string;
  numero_offre: string;

  champ_modifie: string;
  ancienne_valeur: string | null;
  nouvelle_valeur: string | null;
  commentaire: string | null;

  // Champs calculés
  saturation: number | null;
  saturation_badge: string;
  taux_transformation: number | null;
  transformation_badge: string;

  // Métadonnées
  created_by?: {
    id: number;
    nom: string;
    role: string;
    role_label: string;
  } | null;
  updated_by?: {
    id: number;
    nom: string;
    role: string;
    role_label: string;
  } | null;

  created_at: string;
}

// Historique groupé par formation
export interface HistoriqueParFormation {
  formation_id: number;
  formation_nom: string;
  centre_nom: string;
  type_offre_nom: string;
  type_offre_couleur: string;
  statut_nom: string;
  statut_couleur: string;
  numero_offre: string;
  total_modifications: number;
  derniers_historiques: {
    id: number;
    champ_modifie: string;
    ancienne_valeur: string | null;
    nouvelle_valeur: string | null;
    commentaire: string | null;
    created_at: string;
    // facultatif
    formation_id?: number;
  }[];
}

// Réponse de l’API
export interface HistoriqueFormationAPIResponse {
  success: boolean;
  message: string;
  data: HistoriqueFormation[];
}

export interface HistoriqueFormationGroupedResponse {
  success: boolean;
  message: string;
  data: HistoriqueParFormation[];
}

// Filtres utilisables
export interface HistoriqueFormationFiltres {
  formation_id?: number;
  centre_id?: number;
  type_offre_id?: number;
  statut_id?: number;
  champ_modifie?: string;
  date_min?: string;
  date_max?: string;
  texte?: string;
  [key: string]: string | number | undefined; // ✅ ajoute cette ligne
}

export interface FiltresHistoriqueValues {
  centre_id?: number;
  type_offre_id?: number;
  statut_id?: number;
  formation_id?: number;
}
