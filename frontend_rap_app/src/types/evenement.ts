export interface Evenement {
  id: number;
  formation_id: number;
  formation_nom: string;
  type_evenement: string;
  type_evenement_display: string;
  description_autre?: string | null;
  details?: string;
  event_date: string;
  event_date_formatted: string;
  lieu?: string;
  participants_prevus?: number;
  participants_reels?: number;
  taux_participation: number;
  status: string;
  status_label: string;
  status_color: string;
  created_at: string;
  updated_at: string;
}
