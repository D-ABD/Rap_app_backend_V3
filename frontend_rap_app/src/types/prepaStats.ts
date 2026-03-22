import { useQuery } from "@tanstack/react-query";
import api from "../api/axios";

// ───────────────────────────────────────────────
// 🏷️ Labels — correspondance exacte avec Prepa.TypePrepa (backend)
// ───────────────────────────────────────────────
export const PREPA_TYPE_LABELS: Record<string, string> = {
  info_collective: "Information collective",
  session_1: "Session Prépa 1",
};

export type PrepaTypeKey = keyof typeof PREPA_TYPE_LABELS;

// ───────────────────────────────────────────────
// 🎯 Filtres — identiques à _filtered_qs()
// ───────────────────────────────────────────────
export type PrepaFilters = {
  annee?: number;
  centre?: string | number;
  type_prepa?: PrepaTypeKey | string;
  departement?: string;
};

// ───────────────────────────────────────────────
// 📊 Structures de réponse — conformes au ViewSet
// ───────────────────────────────────────────────
export type PrepaGroupBy = "centre" | "departement" | "type_prepa";

export type PrepaGroupRow = {
  id?: number | string;
  group_key?: string | number | null;

  total: number;

  nb_presents_info: number;
  nb_absents_info: number;
  nb_adhesions: number;

  nb_inscrits_prepa: number;
  nb_presents_prepa: number;
  nb_absents_prepa: number;

  taux_presence_info: number | null;
  taux_adhesion: number | null;
  taux_presence_prepa: number | null;

  /** 🔹 Taux de rétention (Session 1 → Session 6) */
  taux_retention?: number | null;
};

export type PrepaGroupedResponse = {
  by: PrepaGroupBy;
  results: PrepaGroupRow[];
};

// 🧮 Synthèse & Résumé — structures alignées avec backend
export type PrepaResumeCentre = {
  centre__nom: string;
  total: number;
};

export type PrepaResumeDepartement = {
  departement: string;
  total: number;
};

export type PrepaResumeResponse = {
  annee: number;

  objectif_total: number;
  realise_total: number;
  taux_atteinte_total: number;
  reste_a_faire_total: number;

  // ---- PRESCRIPTIONS ----
  nb_prescriptions: number;
  taux_prescription: number | null;

  // ---- IC (Informations Collectives) ----
  presents_info: number;
  absents_info: number;
  taux_presence_ic: number | null;

  // ---- ATELIERS ----
  presents_ateliers: number;
  absents_ateliers: number;
  taux_presence_ateliers: number | null;

  // ---- GROUPES ----
  par_centre: PrepaResumeCentre[];
  par_departement: PrepaResumeDepartement[];
};

export type PrepaSyntheseResponse = {
  annee: number;
  objectif_total: number;
  realise_total: number;
  taux_atteinte_total: number;
  reste_a_faire_total: number;
};

// ───────────────────────────────────────────────
// 🧩 Utils
// ───────────────────────────────────────────────
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Erreur inconnue";
}

export function resolveGroupLabel(row: PrepaGroupRow): string {
  return row.group_key != null ? String(row.group_key) : "—";
}

// ───────────────────────────────────────────────
// 🧮 API Calls
// ───────────────────────────────────────────────
export async function getPrepaGrouped(by: PrepaGroupBy, filters: PrepaFilters) {
  const { data } = await api.get<PrepaGroupedResponse>("/prepa-stats/grouped/", {
    params: { ...filters, by },
  });
  return data;
}

export async function getPrepaSynthese(filters: PrepaFilters) {
  const { data } = await api.get<PrepaSyntheseResponse>("/prepa-stats/synthese/", {
    params: filters,
  });
  return data;
}

export async function getPrepaResume(filters: PrepaFilters) {
  const { data } = await api.get<PrepaResumeResponse>("/prepa-stats/resume/", {
    params: filters,
  });
  return data;
}

export async function exportPrepaXlsx(filters: PrepaFilters): Promise<Blob> {
  const response = await api.get("/prepa-stats/export-xlsx/", {
    params: filters,
    responseType: "blob",
  });
  return response.data;
}

// ───────────────────────────────────────────────
// ⚙️ Hooks React Query — version v5 compatible
// ───────────────────────────────────────────────
export function usePrepaGrouped(by: PrepaGroupBy, filters: PrepaFilters) {
  return useQuery<PrepaGroupedResponse, Error>({
    queryKey: ["prepa:grouped", by, JSON.stringify(filters)],
    queryFn: () => getPrepaGrouped(by, filters),
    staleTime: 0,
    placeholderData: (prev) => prev,
  });
}

export function usePrepaSynthese(filters: PrepaFilters) {
  return useQuery<PrepaSyntheseResponse, Error>({
    queryKey: ["prepa:synthese", JSON.stringify(filters)],
    queryFn: () => getPrepaSynthese(filters),
    staleTime: 0,
    placeholderData: (prev) => prev,
  });
}

export function usePrepaResume(filters: PrepaFilters) {
  return useQuery<PrepaResumeResponse, Error>({
    queryKey: ["prepa:resume", JSON.stringify(filters)],
    queryFn: () => getPrepaResume(filters),
    staleTime: 0,
    placeholderData: (prev) => prev,
  });
}
