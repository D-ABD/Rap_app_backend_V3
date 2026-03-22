import { useState, useCallback, useMemo } from "react";
import type { AxiosError } from "axios";
import api from "../api/axios";

type FetchError = {
  message?: string;
};

/**
 * 🔁 useFetch – Hook pour effectuer des requêtes GET via Axios
 *
 * Il gère :
 * - format DRF classique : { count, results }
 * - enveloppe API personnalisée : { success, data: { count, results } }
 * - objets simples ou tableaux
 *
 * @param parseWrapper - si true, extrait `data.data` (utile pour les APIs enveloppées)
 */
export default function useFetch<T>(
  url: string,
  params: Record<string, unknown> = {},
  parseWrapper: boolean = false // ✅ par défaut, ne parse pas l'enveloppe
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paramsKey = JSON.stringify(params);
  const stableParams = useMemo(() => JSON.parse(paramsKey), [paramsKey]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(url, { params: stableParams });
      const raw = response.data;

      let parsed: unknown;

      if (parseWrapper) {
        // ✅ Mode avec enveloppe : { success, data }
        if (raw && raw.success && raw.data) {
          parsed = raw.data;
        } else {
          throw new Error("Réponse inattendue : format avec enveloppe requis.");
        }
      } else {
        // 🌐 Mode classique : DRF brut ou fallback
        if ("results" in raw) {
          parsed = raw;
        } else if ("data" in raw && raw.success !== undefined && "results" in raw.data) {
          parsed = raw.data;
        } else if ("data" in raw && raw.success !== undefined) {
          parsed = raw.data;
        } else {
          parsed = raw;
        }
      }

      setData(parsed as T);
    } catch (err) {
      const axiosError = err as AxiosError<FetchError>;
      setError(axiosError.response?.data?.message || axiosError.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [url, stableParams, parseWrapper]); // ✅ ajout parseWrapper dans useCallback

  return { data, loading, error, fetchData };
}
