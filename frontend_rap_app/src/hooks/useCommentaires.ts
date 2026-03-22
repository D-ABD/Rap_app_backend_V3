// ======================================================
// src/hooks/useCommentaires.ts
// Aligné avec CommentaireViewSet + Serializer + Types enrichis
// ======================================================

import { useState, useEffect, useCallback } from "react";
import { AxiosError } from "axios";
import api from "../api/axios";
import type {
  Commentaire,
  CommentaireFormData,
  CommentaireFiltresValues,
  CommentaireFiltresData,
} from "../types/commentaire";

interface WrappedResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

/* ------------------------------
   🔹 Liste des commentaires d’une formation
-------------------------------- */
export function useCommentaires(
  formationId?: number,
  statut: "actif" | "archive" | "all" = "actif",
  filtres?: Partial<CommentaireFiltresValues>
) {
  const [commentaires, setCommentaires] = useState<Commentaire[]>([]);
  const [loading, setLoading] = useState<boolean>(!!formationId);
  const [error, setError] = useState<AxiosError | null>(null);

  const fetchCommentaires = useCallback(async () => {
    if (!formationId) return;
    setLoading(true);

    try {
      // ✅ Construit dynamiquement les paramètres d’URL
      const params: Record<string, string | number | boolean> = {
        formation: formationId,
        statut,
      };

      if (filtres) {
        if (filtres.centre_id) params.centre_id = filtres.centre_id;
        if (filtres.statut_id) params.statut_id = filtres.statut_id;
        if (filtres.type_offre_id) params.type_offre_id = filtres.type_offre_id;
        if (filtres.formation_etat) params.formation_etat = filtres.formation_etat;
        if (filtres.auteur_id) params.auteur_id = filtres.auteur_id; // ✅ nouveau
        if (filtres.formation_nom) params.formation_nom = filtres.formation_nom; // ✅ nouveau
        if (typeof filtres.include_archived === "boolean") {
          params.include_archived = filtres.include_archived;
        }
      }

      const res = await api.get("/commentaires/", { params });

      const payload = res.data;
      let data: Commentaire[] = [];

      if (Array.isArray(payload?.data)) {
        data = payload.data;
      } else if (Array.isArray(payload?.results)) {
        data = payload.results;
      } else if (Array.isArray(payload?.data?.results)) {
        data = payload.data.results;
      }

      setCommentaires(data);
      setError(null);
    } catch (err) {
      setError(err as AxiosError);
    } finally {
      setLoading(false);
    }
  }, [formationId, statut, filtres]);

  useEffect(() => {
    fetchCommentaires();
  }, [fetchCommentaires]);

  return { commentaires, loading, error, refetch: fetchCommentaires };
}

/* ------------------------------
   🔹 Création d’un commentaire
-------------------------------- */
export function useCreateCommentaire() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AxiosError | null>(null);

  const createCommentaire = async (
    formationId: number,
    payload: Omit<CommentaireFormData, "formation">
  ): Promise<Commentaire> => {
    setLoading(true);
    try {
      const res = await api.post<WrappedResponse<Commentaire>>(`/commentaires/`, {
        formation: formationId,
        ...payload,
      });
      setError(null);
      return res.data.data;
    } catch (err) {
      setError(err as AxiosError);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createCommentaire, loading, error };
}

/* ------------------------------
   🔹 Mise à jour d’un commentaire
-------------------------------- */
export function useUpdateCommentaire(id: number) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AxiosError | null>(null);

  const updateCommentaire = async (payload: Partial<CommentaireFormData>): Promise<Commentaire> => {
    setLoading(true);
    try {
      const res = await api.put<WrappedResponse<Commentaire>>(`/commentaires/${id}/`, payload);
      setError(null);
      return res.data.data;
    } catch (err) {
      setError(err as AxiosError);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updateCommentaire, loading, error };
}

/* ------------------------------
   🔹 Suppression d’un commentaire
-------------------------------- */
export function useDeleteCommentaire() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AxiosError | null>(null);

  const deleteCommentaire = async (id: number): Promise<boolean> => {
    setLoading(true);
    try {
      await api.delete(`/commentaires/${id}/`);
      setError(null);
      return true;
    } catch (err) {
      setError(err as AxiosError);
      if (import.meta.env.MODE !== "production") {
        // eslint-disable-next-line no-console
        console.error("Erreur API suppression commentaire :", err);
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { deleteCommentaire, loading, error };
}
/* ------------------------------
   🔹 Archivage / Désarchivage logique
-------------------------------- */
export function useArchiveCommentaire(id: number) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AxiosError | null>(null);

  const archiver = async (): Promise<Commentaire> => {
    setLoading(true);
    try {
      const res = await api.post<WrappedResponse<Commentaire>>(`/commentaires/${id}/archiver/`);
      setError(null);
      return res.data.data;
    } catch (err) {
      setError(err as AxiosError);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const desarchiver = async (): Promise<Commentaire> => {
    setLoading(true);
    try {
      const res = await api.post<WrappedResponse<Commentaire>>(`/commentaires/${id}/desarchiver/`);
      setError(null);
      return res.data.data;
    } catch (err) {
      setError(err as AxiosError);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { archiver, desarchiver, loading, error };
}

/* ------------------------------
   🔹 Dernier commentaire d’une formation
-------------------------------- */
export function useDernierCommentaire(formationId?: number, pollingMs?: number) {
  const [dernier, setDernier] = useState<Commentaire | null>(null);
  const [loading, setLoading] = useState<boolean>(!!formationId);
  const [error, setError] = useState<AxiosError | null>(null);

  const fetchDernier = useCallback(async () => {
    if (!formationId) return;
    setLoading(true);
    try {
      const res = await api.get(`/commentaires/?formation=${formationId}&limit=1`);
      const payload = res.data;
      let data: Commentaire[] = [];

      if (Array.isArray(payload?.data)) {
        data = payload.data;
      } else if (Array.isArray(payload?.results)) {
        data = payload.results;
      } else if (Array.isArray(payload?.data?.results)) {
        data = payload.data.results;
      }

      setDernier(data.length > 0 ? data[0] : null);
      setError(null);
    } catch (err) {
      setError(err as AxiosError);
    } finally {
      setLoading(false);
    }
  }, [formationId]);

  useEffect(() => {
    fetchDernier();

    if (pollingMs) {
      const interval = setInterval(fetchDernier, pollingMs);
      return () => clearInterval(interval);
    }
  }, [fetchDernier, pollingMs]);

  return { dernier, loading, error, refetch: fetchDernier };
}

/* ------------------------------
   🔹 Chargement des filtres disponibles
-------------------------------- */
export function useCommentairesFiltres() {
  const [filtres, setFiltres] = useState<CommentaireFiltresData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AxiosError | null>(null);

  const fetchFiltres = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<WrappedResponse<CommentaireFiltresData>>(
        "/commentaires/filter-options/"
      );
      setFiltres(res.data.data);
      setError(null);
    } catch (err) {
      setError(err as AxiosError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiltres();
  }, [fetchFiltres]);

  return { filtres, loading, error, refetch: fetchFiltres };
}
