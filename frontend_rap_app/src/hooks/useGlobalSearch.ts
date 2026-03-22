// src/hooks/useGlobalSearch.ts
import { useState, useCallback } from "react";
import api from "../api/axios";

// 🧩 Types de résultats par ressource (à adapter selon ton modèle réel)
type FormationResult = {
  id: number;
  nom: string;
  num_offre: string;
  centre_id: number;
  centre__nom: string;
  type_offre_id: number;
  type_offre__nom: string;
  statut_id: number;
  statut__nom: string;
};

type CommentaireResult = { id: number; contenu: string };
type CentreResult = { id: number; nom: string };
type UtilisateurResult = {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
};
type TypeOffreResult = { id: number; nom: string; autre: string };
type StatutResult = { id: number; nom: string; description_autre: string };
type PartenaireResult = { id: number; nom: string };

type PaginatedResult<T> = {
  count: number;
  results: T[];
};

type GlobalSearchResults = {
  formations?: PaginatedResult<FormationResult>;
  commentaires?: PaginatedResult<CommentaireResult>;
  centres?: PaginatedResult<CentreResult>;
  utilisateurs?: PaginatedResult<UtilisateurResult>;
  types_offre?: PaginatedResult<TypeOffreResult>;
  statuts?: PaginatedResult<StatutResult>;
  partenaires?: PaginatedResult<PartenaireResult>;
};

type GlobalSearchFilters = {
  type_offre?: number;
  statut?: number;
  centre?: number;
};

/**
 * 🔍 Hook de recherche globale avec typage strict
 */
export default function useGlobalSearch() {
  const [results, setResults] = useState<GlobalSearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (q: string, filters?: GlobalSearchFilters) => {
    if (!q.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const params = { q, ...filters };
      const res = await api.get<GlobalSearchResults>("/search/", { params });
      setResults(res.data);
    } catch (_error) {
      setError("Erreur lors de la recherche");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, search };
}
