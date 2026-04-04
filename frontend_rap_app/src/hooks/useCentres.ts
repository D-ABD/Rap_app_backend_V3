import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import api from "../api/axios";
import type { Centre, CentreFormData, CentreOption } from "../types/centre";

/** Pagination générique */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/* ============================================================
   🔹 1️⃣ — LISTE DES CENTRES (avec pagination et recherche)
   ============================================================ */
export function useCentres(params?: {
  search?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}) {
  const queryKey = ["centres", params];

  return useQuery({
    queryKey,
    queryFn: async (): Promise<PaginatedResponse<Centre>> => {
      const response = await api.get("/centres/", { params });
      return response.data?.data ?? response.data;
    },
    placeholderData: keepPreviousData,
  });
}

/* ============================================================
   🔹 2️⃣ — CENTRE PAR ID
   ============================================================ */
export function useCentre(id?: number | string) {
  return useQuery({
    queryKey: ["centre", id],
    queryFn: async (): Promise<Centre> => {
      const response = await api.get(`/centres/${id}/`);
      return response.data?.data ?? response.data;
    },
    enabled: !!id, // ne fait la requête que si un id est fourni
  });
}

/* ============================================================
   🔹 3️⃣ — LISTE LÉGÈRE (autocomplete)
   ============================================================ */
export function useCentresSimple(search?: string) {
  return useQuery({
    queryKey: ["centres-simple", search],
    queryFn: async (): Promise<{ results: CentreOption[] }> => {
      const response = await api.get("/centres/liste-simple/", {
        params: { search },
      });
      const payload = response.data?.data ?? response.data;
      return Array.isArray(payload) ? { results: payload } : payload;
    },
  });
}

/* ============================================================
   🔹 4️⃣ — CRÉATION D’UN CENTRE
   ============================================================ */
export function useCreateCentre() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CentreFormData): Promise<Centre> => {
      const response = await api.post("/centres/", data);
      return response.data.data ?? response.data; // compatibilité avec format custom
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centres"] });
    },
  });
}

/* ============================================================
   🔹 5️⃣ — MISE À JOUR D’UN CENTRE
   ============================================================ */
export function useUpdateCentre() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number | string;
      data: Partial<CentreFormData>;
    }): Promise<Centre> => {
      const response = await api.put(`/centres/${id}/`, data);
      return response.data.data ?? response.data;
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["centres"] });
      queryClient.invalidateQueries({ queryKey: ["centre", id] });
    },
  });
}

/* ============================================================
   🔹 6️⃣ — ARCHIVAGE D’UN CENTRE VIA DELETE LEGACY
   ============================================================ */
export function useDeleteCentre() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number | string): Promise<void> => {
      await api.delete(`/centres/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centres"] });
    },
  });
}

/* ============================================================
   🔹 7️⃣ — CONSTANTES
   ============================================================ */
export function useCentreConstants() {
  return useQuery({
    queryKey: ["centre-constants"],
    queryFn: async (): Promise<{
      nom_max_length: number;
      code_postal_length: number;
    }> => {
      const response = await api.get("/centres/constants/");
      return response.data?.data ?? response.data;
    },
  });
}
