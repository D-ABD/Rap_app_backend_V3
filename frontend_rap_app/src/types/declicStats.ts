import { useQuery } from "@tanstack/react-query";
import api from "../api/axios";

// ───────────────────────────────────────────────
// 🏷️ Labels — correspondance exacte avec Declic.TypeDeclic (backend)
// ───────────────────────────────────────────────
export const DECLIC_TYPE_LABELS: Record<string, string> = {
  atelier_1: "Atelier Déclic 1",
  atelier_2: "Atelier Déclic 2",
  atelier_3: "Atelier Déclic 3",
  atelier_4: "Atelier Déclic 4",
  atelier_5: "Atelier Déclic 5",
  atelier_6: "Atelier Déclic 6",
  autre: "Autre activité",
};

export type DeclicTypeKey = keyof typeof DECLIC_TYPE_LABELS;

// ───────────────────────────────────────────────
// 🎯 Filtres — identiques à _filtered_qs()
// ───────────────────────────────────────────────
export type DeclicFilters = {
  annee?: number;
  centre?: string | number;
  type_declic?: DeclicTypeKey | string;
  departement?: string; // ✅ Ajouté
};

// ───────────────────────────────────────────────
// 📊 Structures de réponse — conformes au ViewSet
// ───────────────────────────────────────────────
export type DeclicGroupBy = "centre" | "departement" | "type_declic";

export type DeclicGroupRow = {
  id?: number | string;
  group_key?: string | number | null;
  total: number;
  nb_inscrits_declic: number;
  nb_presents_declic: number;
  nb_absents_declic: number;
  taux_presence_declic: number | null;
  /** 🔹 Taux de rétention (Atelier 1 → Atelier 6) */
  taux_retention?: number | null;
};

export type DeclicGroupedResponse = {
  by: DeclicGroupBy;
  results: DeclicGroupRow[];
};

// 🧮 Synthèse & Résumé — structures alignées avec backend
export type DeclicResumeCentre = {
  centre__nom: string;
  total: number;
};

export type DeclicResumeDepartement = {
  departement: string;
  total: number;
};

export type DeclicResumeResponse = {
  annee: number;

  // 🔥 RÉSUMÉ GLOBAL (backend)
  objectif_total: number;
  realise_total: number;
  taux_atteinte_total: number;
  reste_a_faire_total: number;
  taux_presence_ateliers_total: number | null;
  taux_presence_declic: number; // ateliers
  taux_presence_global: number; // IC + ateliers

  taux_retention: number; // atelier 1 → atelier 6

  // 🔥 Détails
  par_centre: DeclicResumeCentre[];
  par_departement: DeclicResumeDepartement[];
};

export type DeclicSyntheseResponse = {
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

export function resolveGroupLabel(row: DeclicGroupRow): string {
  return row.group_key != null ? String(row.group_key) : "—";
}

// ───────────────────────────────────────────────
// 🧮 API Calls
// ───────────────────────────────────────────────
export async function getDeclicGrouped(by: DeclicGroupBy, filters: DeclicFilters) {
  const { data } = await api.get<DeclicGroupedResponse>("/declic-stats/grouped/", {
    params: { ...filters, by },
  });
  return data;
}

export async function getDeclicSynthese(filters: DeclicFilters) {
  const { data } = await api.get<DeclicSyntheseResponse>("/declic-stats/synthese/", {
    params: filters,
  });
  return data;
}

export async function getDeclicResume(filters: DeclicFilters) {
  const { data } = await api.get<DeclicResumeResponse>("/declic-stats/resume/", {
    params: filters,
  });
  return data;
}

export async function exportDeclicXlsx(filters: DeclicFilters): Promise<Blob> {
  const response = await api.get("/declic-stats/export-xlsx/", {
    params: filters,
    responseType: "blob",
  });
  return response.data;
}

// ───────────────────────────────────────────────
// ⚙️ Hooks React Query — version v5 compatible
// ───────────────────────────────────────────────
export function useDeclicGrouped(by: DeclicGroupBy, filters: DeclicFilters) {
  return useQuery<DeclicGroupedResponse, Error>({
    queryKey: ["declic:grouped", by, JSON.stringify(filters)],
    queryFn: () => getDeclicGrouped(by, filters),
    staleTime: 0,
    placeholderData: (prev) => prev,
  });
}

export function useDeclicSynthese(filters: DeclicFilters) {
  return useQuery<DeclicSyntheseResponse, Error>({
    queryKey: ["declic:synthese", JSON.stringify(filters)],
    queryFn: () => getDeclicSynthese(filters),
    staleTime: 0,
    placeholderData: (prev) => prev,
  });
}

export function useDeclicResume(filters: DeclicFilters) {
  return useQuery<DeclicResumeResponse, Error>({
    queryKey: ["declic:resume", JSON.stringify(filters)],
    queryFn: () => getDeclicResume(filters),
    staleTime: 0,
    placeholderData: (prev) => prev,
  });
}
