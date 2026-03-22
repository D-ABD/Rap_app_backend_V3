// src/types/commentaireStats.ts
import { useQuery } from "@tanstack/react-query";
import api from "../api/axios";

// ────────────────────────────────────────────────────────────
// Types & filtres
// ────────────────────────────────────────────────────────────
export type CommentaireFilters = {
  // Filtres temporels (sur created_at côté backend)
  date_from?: string; // "YYYY-MM-DD"
  date_to?: string; // "YYYY-MM-DD"

  // Périmètre / rattachements
  formation?: number | string; // sélection formation par id
  formation_nom?: string;
  num_offre?: string | number;
  type_offre?: string;
  centre?: number | string;
  departement?: string; // "92", "75", …

  // Auteurs & recherche
  auteur?: number | string; // user id
  search?: string; // contenu

  // Saturation
  saturation_min?: number;
  saturation_max?: number;

  // Spécifiques au flux "latest"
  limit?: number; // défaut backend: 5
  full?: boolean; // true => contenu complet, false => preview
};

export type CommentaireItem = {
  id: number;
  formation_id: number | null;
  formation_nom: string | null;
  num_offre: string | number | null;
  centre_nom: string | null;
  start_date: string | null;
  end_date: string | null;
  type_offre: string | null;
  statut: string | null;

  contenu: string; // preview ou full selon ?full=
  saturation: number | null;
  saturation_formation: number | null;

  auteur: string;
  date: string; // JJ/MM/AAAA
  heure: string; // HH:MM
  is_recent: boolean;
  is_edited: boolean;
  created_at: string | null; // ISO
  updated_at: string | null; // ISO
};

export type CommentaireLatestResponse = {
  results: CommentaireItem[];
  count: number;
  limit: number;
  filters_echo: Record<string, string>;
};

// ────────────────────────────────────────────────────────────
// Types pour les options de grouped (frontend Select)
// ────────────────────────────────────────────────────────────
export type FormationOption = {
  id: number | string;
  nom: string | null;
  num_offre: string | number | null;
  type_offre_id: string | number | null;
  type_offre_nom: string | null;
  label: string;
};

// ────────────────────────────────────────────────────────────
// Utils
// ────────────────────────────────────────────────────────────
export function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Erreur inconnue";
}

/** Transforme les booléens en string compatible query ("true"/"false"). */
function normalizeFilters(filters: CommentaireFilters) {
  const out: Record<string, unknown> = { ...filters };
  if (typeof filters.full === "boolean") out.full = filters.full ? "true" : "false";
  return out;
}

// ────────────────────────────────────────────────────────────
// API
// ────────────────────────────────────────────────────────────
export async function getCommentaireLatest(filters: CommentaireFilters = {}) {
  const params = normalizeFilters(filters);
  const { data } = await api.get<CommentaireLatestResponse>("/commentaire-stats/latest/", {
    params,
  });
  return data;
}

// ────────────────────────────────────────────────────────────
/** Hook TanStack Query — derniers commentaires */
export function useCommentaireLatest(filters: CommentaireFilters = {}) {
  return useQuery<CommentaireLatestResponse, Error>({
    queryKey: ["commentaire-stats:latest", filters],
    queryFn: () => getCommentaireLatest(filters),

    // ✅ Toujours à jour
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

// ────────────────────────────────────────────────────────────
/** Hook pour récupérer les formations groupées */

export function useFormationOptionsFromGrouped(filters: CommentaireFilters = {}) {
  type GroupedFormationResult = {
    group_key: number;
    formation_nom?: string | null;
    num_offre?: string | number | null;
    type_offre_id?: string | number | null;
    type_offre_nom?: string | null;
  };

  return useQuery<FormationOption[], Error>({
    queryKey: ["commentaires:options:formation", filters],
    queryFn: async () => {
      const { data } = await api.get<{ results: GroupedFormationResult[] }>(
        "/commentaire-stats/grouped/",
        { params: { ...normalizeFilters(filters), by: "formation" } }
      );

      return (data?.results ?? [])
        .map((r) => {
          if (!r.group_key) return null;

          const nom = r.formation_nom ?? "Formation ?";
          const num = r.num_offre ?? "?";
          const typeNom = r.type_offre_nom ?? "Type inconnu";

          return {
            id: r.group_key,
            nom,
            num_offre: r.num_offre ?? null,
            type_offre_id: r.type_offre_id ?? null,
            type_offre_nom: r.type_offre_nom ?? null,
            label: `${nom} — ${num} (${typeNom})`,
          } as FormationOption;
        })
        .filter(Boolean) as FormationOption[];
    },
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  });
}
