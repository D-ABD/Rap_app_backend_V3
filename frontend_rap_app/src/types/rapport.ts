import type { PaginatedResponse, WrappedResponse } from "./api";

export type RapportFormat = "pdf" | "excel" | "csv" | "html";

export interface ChoiceOption<T extends string | number = string | number> {
  value: T;
  label: string;
}

export interface Rapport {
  id: number;
  nom: string;
  type_rapport: string;
  type_rapport_display?: string;
  periode: string;
  periode_display?: string;
  date_debut: string;
  date_fin: string;
  format: RapportFormat;
  format_display?: string;
  centre?: number | null;
  centre_nom?: string | null;
  type_offre?: number | null;
  type_offre_nom?: string | null;
  statut?: number | null;
  statut_nom?: string | null;
  formation?: number | null;
  formation_nom?: string | null;
  donnees?: Record<string, unknown>;
  temps_generation?: number | null;
  created_at?: string;
  created_by?: number | null;
  updated_at?: string;
  updated_by?: number | null;
  is_active?: boolean;
}

export interface RapportFormData {
  nom: string;
  type_rapport: string;
  periode: string;
  date_debut: string;
  date_fin: string;
  format: RapportFormat;
  centre: number | "";
  type_offre: number | "";
  statut: number | "";
  formation: number | "";
}

export interface RapportChoices {
  type_rapport: ChoiceOption[];
  periode: ChoiceOption[];
  format: ChoiceOption<RapportFormat>[];
  parcours_phase: ChoiceOption[];
  centres: ChoiceOption<number>[];
  type_offres: ChoiceOption<number>[];
  statuts: ChoiceOption<number>[];
  formations: ChoiceOption<number>[];
  reporting_contract?: Record<string, unknown>;
}

export interface RapportListResponse extends PaginatedResponse<Rapport> {}

export type WrappedRapportListResponse = WrappedResponse<RapportListResponse>;

