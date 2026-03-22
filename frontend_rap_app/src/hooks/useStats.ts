import { useQuery } from "@tanstack/react-query";

export type StatsResponse = {
  kpis: Record<string, number | null>;
  repartition?: Record<string, unknown>;
  filters_echo?: Record<string, unknown>;
  group_by?: string;
  results?: unknown[];
  count?: number;
};

function normalizeStatsResponse(raw: any): StatsResponse {
  return {
    kpis: raw?.kpis ?? {},
    repartition: raw?.repartition ?? {},
    filters_echo: raw?.filters_echo ?? {},
    group_by: raw?.group_by,
    results: raw?.results ?? [],
    count: raw?.count ?? 0,
  };
}

export function useStats(endpoint: string, params: Record<string, any> = {}) {
  return useQuery<StatsResponse>({
    queryKey: [endpoint, params],
    queryFn: async () => {
      const qs = new URLSearchParams(params as any).toString();
      const res = await fetch(`/api/${endpoint}-stats/?${qs}`);
      if (!res.ok) throw new Error("Erreur API stats");
      const data = await res.json();
      return normalizeStatsResponse(data);
    },
  });
}
