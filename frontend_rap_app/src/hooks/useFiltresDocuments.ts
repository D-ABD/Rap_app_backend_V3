import { useEffect, useState } from "react";
import api from "../api/axios";
import type { FiltresData } from "../types/Filtres";

export default function useFiltresDocuments() {
  const [filtres, setFiltres] = useState<FiltresData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/documents/filtres/")
      .then((res) => {
        if (res.data?.success && res.data.data) {
          setFiltres(res.data.data);
        } else {
          setError("Réponse invalide");
        }
      })
      .catch(() => {
        setError("Erreur réseau");
      })
      .finally(() => setLoading(false));
  }, []);

  return { filtres, loading, error };
}
