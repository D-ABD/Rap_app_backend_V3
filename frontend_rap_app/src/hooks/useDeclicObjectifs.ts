import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "react-toastify";
import api from "src/api/axios";
import {
  Choice,
  ObjectifDeclic,
  ObjectifDeclicSynthese,
  ObjectifDeclicFiltresValues,
} from "src/types/declic";

// -----------------------------------------------------------------------------
// ⚙️ Types utilitaires
// -----------------------------------------------------------------------------
type ApiErrorResponse = {
  message?: string;
  detail?: string;
  [key: string]: unknown;
};

// -----------------------------------------------------------------------------
// 🧩 Clés & Endpoints
// -----------------------------------------------------------------------------
const OBJECTIFS_DECLIC_KEY = ["objectifs-declic"];
const OBJECTIFS_DECLIC_ENDPOINT = "/objectifs-declic";

// -----------------------------------------------------------------------------
// 📥 1️⃣ Liste des Objectifs Déclic (pagination DRF)
// -----------------------------------------------------------------------------
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export function useObjectifsDeclic(filters?: ObjectifDeclicFiltresValues) {
  return useQuery<PaginatedResponse<ObjectifDeclic>, AxiosError>({
    queryKey: ["objectifs-declic", filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters?.annee) params.append("annee", filters.annee.toString());
      if (filters?.centre) params.append("centre_id", filters.centre.toString());
      if (filters?.departement) params.append("departement", filters.departement);
      if (filters?.ordering) params.append("ordering", filters.ordering);
      if (filters?.page) params.append("page", filters.page.toString());
      if (filters?.search) params.append("search", filters.search);

      const { data } = await api.get(`${OBJECTIFS_DECLIC_ENDPOINT}/`, { params });

      // Format standard DRF
      if (data && typeof data === "object" && "results" in data) {
        return data as PaginatedResponse<ObjectifDeclic>;
      }

      // Format custom { data: { results, count } }
      if (data && typeof data === "object" && "data" in data) {
        const inner = (data as any).data;
        if (inner && typeof inner === "object" && "results" in inner) {
          return inner as PaginatedResponse<ObjectifDeclic>;
        }
      }

      return { count: 0, next: null, previous: null, results: [] };
    },
    staleTime: 1000 * 60 * 2,
    retry: false,
  });
}

// -----------------------------------------------------------------------------
// ➕ 2️⃣ Création
// -----------------------------------------------------------------------------
export function useCreateObjectifDeclic() {
  const queryClient = useQueryClient();

  return useMutation<
    ObjectifDeclic,
    AxiosError<ApiErrorResponse>,
    Omit<ObjectifDeclic, "id" | "centre" | "data_declic">
  >({
    mutationFn: async (payload) => {
      const { data } = await api.post<ObjectifDeclic>(`${OBJECTIFS_DECLIC_ENDPOINT}/`, payload);
      return data;
    },
    onSuccess: () => {
      toast.success("Objectif Déclic créé avec succès ✅");
      queryClient.invalidateQueries({ queryKey: OBJECTIFS_DECLIC_KEY });
    },
    onError: (error) => {
      const message =
        error.response?.data?.message ??
        error.response?.data?.detail ??
        "Erreur lors de la création de l’objectif Déclic";
      toast.error(message);
    },
  });
}

// -----------------------------------------------------------------------------
// ✏️ 3️⃣ Mise à jour
// -----------------------------------------------------------------------------
export function useUpdateObjectifDeclic() {
  const queryClient = useQueryClient();

  return useMutation<
    ObjectifDeclic,
    AxiosError<ApiErrorResponse>,
    { id: number; payload: Partial<ObjectifDeclic> }
  >({
    mutationFn: async ({ id, payload }) => {
      const { data } = await api.patch<ObjectifDeclic>(
        `${OBJECTIFS_DECLIC_ENDPOINT}/${id}/`,
        payload
      );
      return data;
    },
    onSuccess: (_, { id }) => {
      toast.success("Objectif Déclic mis à jour ✅");
      queryClient.invalidateQueries({ queryKey: OBJECTIFS_DECLIC_KEY });
      queryClient.invalidateQueries({ queryKey: [...OBJECTIFS_DECLIC_KEY, id] });
    },
    onError: (error) => {
      const message =
        error.response?.data?.message ??
        error.response?.data?.detail ??
        "Erreur lors de la mise à jour de l’objectif Déclic";
      toast.error(message);
    },
  });
}

// -----------------------------------------------------------------------------
// ❌ 4️⃣ Suppression
// -----------------------------------------------------------------------------
export function useDeleteObjectifDeclic() {
  const queryClient = useQueryClient();

  return useMutation<void, AxiosError<ApiErrorResponse>, number>({
    mutationFn: async (id) => {
      await api.delete(`${OBJECTIFS_DECLIC_ENDPOINT}/${id}/`);
    },
    onSuccess: () => {
      toast.success("Objectif Déclic supprimé 🗑️");
      queryClient.invalidateQueries({ queryKey: OBJECTIFS_DECLIC_KEY });
    },
    onError: (error) => {
      const message =
        error.response?.data?.message ??
        error.response?.data?.detail ??
        "Erreur lors de la suppression de l’objectif Déclic";
      toast.error(message);
    },
  });
}

// -----------------------------------------------------------------------------
// 📊 5️⃣ Synthèse globale
// -----------------------------------------------------------------------------
export function useSyntheseObjectifsDeclic(filters?: { annee?: number }) {
  return useQuery<ObjectifDeclicSynthese[], AxiosError<ApiErrorResponse>>({
    queryKey: [...OBJECTIFS_DECLIC_KEY, "synthese", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.annee) params.append("annee", filters.annee.toString());

      const { data } = await api.get<ObjectifDeclicSynthese[]>(
        `${OBJECTIFS_DECLIC_ENDPOINT}/synthese/`,
        { params }
      );
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

// -----------------------------------------------------------------------------
// 🧰 6️⃣ Options filtres
// -----------------------------------------------------------------------------
export interface ObjectifsDeclicFiltersOptions {
  centre: Choice[];
  annee: Choice[];
  departement: Choice[];
}

export function useObjectifsDeclicFiltersOptions() {
  return useQuery<ObjectifsDeclicFiltersOptions, AxiosError<ApiErrorResponse>>({
    queryKey: [...OBJECTIFS_DECLIC_KEY, "filters-options"],
    queryFn: async () => {
      const { data } = await api.get<ObjectifsDeclicFiltersOptions>(
        `${OBJECTIFS_DECLIC_ENDPOINT}/filters/`
      );
      return data;
    },
    staleTime: 1000 * 60 * 10,
  });
}

// -----------------------------------------------------------------------------
// 📤 7️⃣ Export Excel
// -----------------------------------------------------------------------------
export function useExportObjectifsDeclic() {
  return useMutation<void, AxiosError<ApiErrorResponse>, ObjectifDeclicFiltresValues>({
    mutationFn: async (filters) => {
      const params = new URLSearchParams();
      if (filters?.annee) params.append("annee", filters.annee.toString());
      if (filters?.centre) params.append("centre_id", filters.centre.toString());
      if (filters?.departement) params.append("departement", filters.departement);

      const query = params.toString();
      const url = `${OBJECTIFS_DECLIC_ENDPOINT}/export-xlsx/${query ? `?${query}` : ""}`;

      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Erreur lors de l’export XLSX");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "objectifs_declic.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    },
    onSuccess: () => {
      toast.success("Export Excel généré ✅");
    },
    onError: (error) => {
      const message =
        (error as any)?.response?.data?.detail ??
        (error as any)?.message ??
        "Erreur lors de l’export Excel";
      toast.error(message);
    },
  });
}
