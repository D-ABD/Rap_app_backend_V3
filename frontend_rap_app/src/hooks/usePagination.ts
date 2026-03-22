// src/hooks/usePagination.ts
import { useState, useMemo } from "react";

/**
 * 📚 usePagination (avancé)
 *
 * Hook personnalisé pour gérer la pagination dans une liste.
 *
 * Il permet :
 * - de suivre la page actuelle (`page`)
 * - de définir le nombre total d’éléments (`count`)
 * - de définir dynamiquement la taille de page (`pageSize`)
 * - de connaître si une page précédente / suivante existe
 *
 * Fournit :
 * - `page` : page actuelle
 * - `setPage` : setter pour changer la page
 * - `count` : nombre total d’éléments
 * - `setCount` : setter pour définir le total d’éléments
 * - `pageSize` : nombre d’éléments par page
 * - `setPageSize` : setter pour changer la taille de page dynamiquement
 * - `totalPages` : nombre total de pages (calculé automatiquement)
 * - `hasNext` : `true` si une page suivante est disponible
 * - `hasPrev` : `true` si une page précédente est disponible
 *
 * @param initialPage - Page de départ (par défaut : 1)
 * @param initialPageSize - Taille de page par défaut (par défaut : 10)
 * @param externalCount - (optionnel) Count externe (ex : data.count depuis useFetch)
 *
 * @returns Un objet avec les propriétés utiles pour la pagination
 */
export default function usePagination(
  initialPage = 1,
  initialPageSize = 10,
  externalCount?: number
) {
  const [internalCount, setCount] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const effectiveCount = externalCount !== undefined ? externalCount : internalCount;

  const totalPages = useMemo(
    () => Math.ceil(effectiveCount / pageSize),
    [effectiveCount, pageSize]
  );
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    page,
    setPage,
    count: effectiveCount,
    setCount, // 👈 toujours disponible pour cas manuels
    pageSize,
    setPageSize,
    totalPages,
    hasNext,
    hasPrev,
  };
}
