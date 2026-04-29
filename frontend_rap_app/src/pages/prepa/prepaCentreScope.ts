import type { CentreLight } from "src/types/prepa";

type MetaCentre = { id?: number; value?: number; nom?: string; label?: string; departement?: string | null };
type ScopedCentre = { id: number; nom: string; departement: string | null };

export function extractScopedCentres(meta: Record<string, unknown> | null | undefined): CentreLight[] {
  const raw =
    (Array.isArray(meta?.["centres"]) ? (meta?.["centres"] as MetaCentre[]) : null) ??
    (Array.isArray(meta?.["centre_choices"]) ? (meta?.["centre_choices"] as MetaCentre[]) : null) ??
    [];

  return raw
    .map((centre) => {
      const id = typeof centre.id === "number" ? centre.id : typeof centre.value === "number" ? centre.value : undefined;
      if (typeof id !== "number") return null;
      return {
        id,
        nom: centre.nom ?? centre.label ?? `Centre #${id}`,
        departement: centre.departement ?? null,
      } satisfies ScopedCentre;
    })
    .filter((centre): centre is ScopedCentre => centre !== null);
}

export function buildCentreLabel(centre: CentreLight | null | undefined): string {
  if (!centre) return "";
  return `${centre.nom ?? `Centre #${centre.id}`}${centre.departement ? ` (${centre.departement})` : ""}`;
}
