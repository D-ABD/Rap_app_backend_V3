import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { toApiError } from "../api/httpClient";
import type {
  Evenement,
  EvenementChoice,
  EvenementFilters,
  EvenementFormData,
  EvenementListResponse,
  EvenementStatsByType,
  FormationSimpleOption,
} from "../types/evenement";

type ApiEnvelope<T> = { success?: boolean; message?: string; data: T };

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in (payload as Record<string, unknown>)) {
    return (payload as ApiEnvelope<T>).data;
  }
  return payload as T;
}

function cleanPayload(input: EvenementFormData) {
  const payload: Record<string, string | number | null | undefined> = { ...input };
  for (const key of Object.keys(payload)) {
    const value = payload[key];
    if (value === "") payload[key] = null;
  }
  return payload;
}

export function useEvenements(filters: EvenementFilters = {}, refreshKey = 0) {
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
  const [data, setData] = useState<EvenementListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const parsed = JSON.parse(filtersKey) as EvenementFilters;
      const response = await api.get<ApiEnvelope<EvenementListResponse> | EvenementListResponse>(
        "/evenements/",
        { params: parsed }
      );
      setData(unwrap<EvenementListResponse>(response.data));
      setError(null);
    } catch (err) {
      setError(toApiError(err).message || "Impossible de charger les événements.");
    } finally {
      setLoading(false);
    }
  }, [filtersKey]);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshKey]);

  return { data, loading, error, refresh };
}

export function useEvenement(id?: number | null) {
  const [data, setData] = useState<Evenement | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setData(null);
      return;
    }

    setLoading(true);
    api
      .get<ApiEnvelope<Evenement>>(`/evenements/${id}/`)
      .then((res) => {
        setData(unwrap<Evenement>(res.data));
        setError(null);
      })
      .catch((err) => setError(toApiError(err).message || "Impossible de charger l'événement."))
      .finally(() => setLoading(false));
  }, [id]);

  return { data, loading, error };
}

export function useEvenementChoices() {
  const [types, setTypes] = useState<EvenementChoice[]>([]);
  const [formations, setFormations] = useState<FormationSimpleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [typesRes, formationsRes] = await Promise.all([
        api.get<ApiEnvelope<EvenementChoice[]>>("/evenements/choices/"),
        api.get<ApiEnvelope<FormationSimpleOption[]>>("/formations/liste-simple/"),
      ]);
      setTypes(unwrap<EvenementChoice[]>(typesRes.data));
      setFormations(unwrap<FormationSimpleOption[]>(formationsRes.data));
      setError(null);
    } catch (err) {
      setError(toApiError(err).message || "Impossible de charger les choix d'événements.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { types, formations, loading, error, refresh };
}

export function useCreateEvenement() {
  const [loading, setLoading] = useState(false);

  const createEvenement = useCallback(async (values: EvenementFormData) => {
    setLoading(true);
    try {
      const response = await api.post<ApiEnvelope<Evenement>>("/evenements/", cleanPayload(values));
      return unwrap<Evenement>(response.data);
    } finally {
      setLoading(false);
    }
  }, []);

  return { createEvenement, loading };
}

export function useUpdateEvenement(id: number) {
  const [loading, setLoading] = useState(false);

  const updateEvenement = useCallback(
    async (values: EvenementFormData) => {
      setLoading(true);
      try {
        const response = await api.patch<ApiEnvelope<Evenement>>(`/evenements/${id}/`, cleanPayload(values));
        return unwrap<Evenement>(response.data);
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  return { updateEvenement, loading };
}

export function useDeleteEvenement() {
  const [loading, setLoading] = useState(false);

  const deleteEvenement = useCallback(async (id: number) => {
    setLoading(true);
    try {
      await api.delete(`/evenements/${id}/`);
    } finally {
      setLoading(false);
    }
  }, []);

  return { deleteEvenement, loading };
}

export function useEvenementStats(start?: string, end?: string) {
  const [data, setData] = useState<EvenementStatsByType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get<ApiEnvelope<EvenementStatsByType>>("/evenements/stats-par-type/", {
        params: { start: start || undefined, end: end || undefined },
      })
      .then((res) => {
        setData(unwrap<EvenementStatsByType>(res.data));
        setError(null);
      })
      .catch((err) => setError(toApiError(err).message || "Impossible de charger les statistiques événements."))
      .finally(() => setLoading(false));
  }, [end, start]);

  return { data, loading, error };
}
