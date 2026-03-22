import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "react-toastify";
import api from "src/api/axios";
import {
  Choice,
  ObjectifPrepa,
  ObjectifPrepaSynthese,
  ObjectifPrepaFiltresValues,
} from "src/types/prepa";

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
const OBJECTIFS_PREPA_KEY = ["objectifs-prepa"];
const OBJECTIFS_PREPA_ENDPOINT = "/prepa-objectifs";

// -----------------------------------------------------------------------------
// 📥 1️⃣ Liste des Objectifs Prépa (avec pagination DRF)
// -----------------------------------------------------------------------------
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export function useObjectifsPrepa(filters?: ObjectifPrepaFiltresValues) {
  return useQuery<PaginatedResponse<ObjectifPrepa>, AxiosError>({
    queryKey: ["objectifs-prepa", filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters?.annee) params.append("annee", filters.annee.toString());
      if (filters?.centre) params.append("centre_id", filters.centre.toString());
      if (filters?.departement) params.append("departement", filters.departement);
      if (filters?.ordering) params.append("ordering", filters.ordering);
      if (filters?.page) params.append("page", filters.page.toString());
      if (filters?.search) params.append("search", filters.search);

      const { data } = await api.get(`${OBJECTIFS_PREPA_ENDPOINT}/`, { params });

      // ✅ 1️⃣ Format standard DRF
      if (data && typeof data === "object" && "results" in data) {
        return data as PaginatedResponse<ObjectifPrepa>;
      }

      // ✅ 2️⃣ Format custom { success, data: { results, count, ... } }
      if (data && typeof data === "object" && "data" in data) {
        const inner = (data as any).data;
        if (inner && typeof inner === "object" && "results" in inner) {
          return inner as PaginatedResponse<ObjectifPrepa>;
        }
      }

      return { count: 0, next: null, previous: null, results: [] };
    },
    staleTime: 1000 * 60 * 2,
    retry: false,
  });
}

// -----------------------------------------------------------------------------
// ➕ 2️⃣ Création d’un Objectif Prépa
// -----------------------------------------------------------------------------
export function useCreateObjectifPrepa() {
  const queryClient = useQueryClient();

  return useMutation<
    ObjectifPrepa,
    AxiosError<ApiErrorResponse>,
    Omit<ObjectifPrepa, "id" | "centre" | "date_prepa">
  >({
    mutationFn: async (payload) => {
      const { data } = await api.post<ObjectifPrepa>(`${OBJECTIFS_PREPA_ENDPOINT}/`, payload);
      return data;
    },
    onSuccess: () => {
      toast.success("Objectif Prépa créé avec succès ✅");
      queryClient.invalidateQueries({ queryKey: OBJECTIFS_PREPA_KEY });
    },
    onError: (error) => {
      const message =
        error.response?.data?.message ??
        error.response?.data?.detail ??
        "Erreur lors de la création de l’objectif Prépa";
      toast.error(message);
    },
  });
}

// -----------------------------------------------------------------------------
// ✏️ 3️⃣ Mise à jour d’un Objectif Prépa
// -----------------------------------------------------------------------------
export function useUpdateObjectifPrepa() {
  const queryClient = useQueryClient();

  return useMutation<
    ObjectifPrepa,
    AxiosError<ApiErrorResponse>,
    { id: number; payload: Partial<ObjectifPrepa> }
  >({
    mutationFn: async ({ id, payload }) => {
      const { data } = await api.patch<ObjectifPrepa>(
        `${OBJECTIFS_PREPA_ENDPOINT}/${id}/`,
        payload
      );
      return data;
    },
    onSuccess: (_, { id }) => {
      toast.success("Objectif Prépa mis à jour ✅");
      queryClient.invalidateQueries({ queryKey: OBJECTIFS_PREPA_KEY });
      queryClient.invalidateQueries({ queryKey: [...OBJECTIFS_PREPA_KEY, id] });
    },
    onError: (error) => {
      const message =
        error.response?.data?.message ??
        error.response?.data?.detail ??
        "Erreur lors de la mise à jour de l’objectif Prépa";
      toast.error(message);
    },
  });
}

// -----------------------------------------------------------------------------
// ❌ 4️⃣ Suppression d’un Objectif Prépa
// -----------------------------------------------------------------------------
export function useDeleteObjectifPrepa() {
  const queryClient = useQueryClient();

  return useMutation<void, AxiosError<ApiErrorResponse>, number>({
    mutationFn: async (id) => {
      await api.delete(`${OBJECTIFS_PREPA_ENDPOINT}/${id}/`);
    },
    onSuccess: () => {
      toast.success("Objectif Prépa supprimé 🗑️");
      queryClient.invalidateQueries({ queryKey: OBJECTIFS_PREPA_KEY });
    },
    onError: (error) => {
      const message =
        error.response?.data?.message ??
        error.response?.data?.detail ??
        "Erreur lors de la suppression de l’objectif Prépa";
      toast.error(message);
    },
  });
}

// -----------------------------------------------------------------------------
// 📊 5️⃣ Synthèse globale des Objectifs Prépa
// -----------------------------------------------------------------------------
export function useSyntheseObjectifsPrepa(filters?: { annee?: number }) {
  return useQuery<ObjectifPrepaSynthese[], AxiosError<ApiErrorResponse>>({
    queryKey: [...OBJECTIFS_PREPA_KEY, "synthese", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.annee) params.append("annee", filters.annee.toString());

      const { data } = await api.get<ObjectifPrepaSynthese[]>(
        `${OBJECTIFS_PREPA_ENDPOINT}/synthese/`,
        { params }
      );
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

// -----------------------------------------------------------------------------
// 🧰 6️⃣ Options de filtres (Année / Centre / Département)
// -----------------------------------------------------------------------------
export interface ObjectifsPrepaFiltersOptions {
  centre: Choice[];
  annee: Choice[];
  departement: Choice[];
}

export function useObjectifsPrepaFiltersOptions() {
  return useQuery<ObjectifsPrepaFiltersOptions, AxiosError<ApiErrorResponse>>({
    queryKey: [...OBJECTIFS_PREPA_KEY, "filters-options"],
    queryFn: async () => {
      const { data } = await api.get<ObjectifsPrepaFiltersOptions>(
        `${OBJECTIFS_PREPA_ENDPOINT}/filters/`
      );
      return data;
    },
    staleTime: 1000 * 60 * 10,
  });
}

// -----------------------------------------------------------------------------
// 📤 7️⃣ Export Excel des Objectifs Prépa
// -----------------------------------------------------------------------------
export function useExportObjectifsPrepa() {
  return useMutation<void, AxiosError<ApiErrorResponse>, ObjectifPrepaFiltresValues>({
    mutationFn: async (filters) => {
      const params = new URLSearchParams();
      if (filters?.annee) params.append("annee", filters.annee.toString());
      if (filters?.centre) params.append("centre_id", filters.centre.toString());
      if (filters?.departement) params.append("departement", filters.departement);

      const query = params.toString();
      const url = `${OBJECTIFS_PREPA_ENDPOINT}/export-xlsx/${query ? `?${query}` : ""}`;

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
      link.download = "objectifs_prepa.xlsx";
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
