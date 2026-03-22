export interface Evenement {
  id: number;
  formation_id: number | null;
  formation_nom: string | null;
  type_evenement: string;
  type_evenement_display: string;
  description_autre?: string | null;
  details?: string | null;
  event_date: string | null;
  event_date_formatted: string | null;
  lieu?: string | null;
  participants_prevus?: number | null;
  participants_reels?: number | null;
  taux_participation: number | null;
  status: string;
  status_label: string;
  status_color: string;
  created_at: string;
  updated_at: string;
}

export interface EvenementChoice {
  value: string;
  label: string;
}

export interface FormationSimpleOption {
  id: number;
  nom: string;
  num_offre?: string | null;
}

export interface EvenementFormData {
  formation_id: number | null;
  type_evenement: string;
  description_autre?: string | null;
  details?: string | null;
  event_date: string | null;
  lieu?: string | null;
  participants_prevus?: number | null;
  participants_reels?: number | null;
}

export interface EvenementFilters {
  formation?: number;
  type_evenement?: string;
  date_min?: string;
  date_max?: string;
  page?: number;
  page_size?: number;
}

export interface EvenementListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Evenement[];
}

export type EvenementStatsByType = Record<
  string,
  {
    label?: string;
    count: number;
    total_prevus?: number | null;
    total_reels?: number | null;
    taux_moyen?: number | null;
  }
>;

