// ======================================================
// src/types/Filtres.ts
// ======================================================

export interface FiltresData {
  centres: { id: number; nom: string }[];
  statuts: { id: number; nom: string }[];
  type_offres: { id: number; nom: string }[];
  formation_etats: { value: string; label: string }[];
}

export interface FiltresValues {
  centre_id?: number;
  statut_id?: number;
  type_offre_id?: number;
  formation_etat?: string;

  /** ✅ Ajout pour filtrer ou inclure les archivés */
  include_archived?: boolean;

  /**
   * 🔧 Index signature corrigée :
   * permet toujours l’accès dynamique aux clés,
   * mais inclut le booléen pour éviter les erreurs TS(2322)
   */
  [key: string]: string | number | boolean | undefined;
}
