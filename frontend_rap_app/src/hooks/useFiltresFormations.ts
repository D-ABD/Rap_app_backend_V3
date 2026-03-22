import { useEffect, useState } from "react";
import api from "../api/axios";
import type { FiltresFormationsData } from "../types/formation";

export default function useFiltresFormations() {
  const [filtres, setFiltres] = useState<FiltresFormationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFiltres = async () => {
      try {
        const res = await api.get("/formations/filtres/");
        if (res.data?.success && res.data.data) {
          setFiltres(res.data.data);
        } else {
          setError("Réponse invalide");
        }
      } catch {
        setError("Erreur lors du chargement des filtres");
      } finally {
        setLoading(false);
      }
    };

    fetchFiltres();
  }, []);

  return { filtres, loading, error };
}

export function toRecord<T extends object>(obj: T): Record<string, string | number | undefined> {
  const record: Record<string, string | number | undefined> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string" || typeof value === "number" || value === undefined) {
      record[key] = value;
    }
  }
  return record;
}
