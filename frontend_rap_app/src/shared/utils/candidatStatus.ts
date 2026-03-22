import type { Candidat } from "../../types/candidat";

export const BUSINESS_STATUS_LABELS: Record<string, string> = {
  candidat: "Candidat",
  non_admissible: "Candidat non admissible",
  admissible: "Candidat admissible",
  en_accompagnement_tre: "En accompagnement TRE",
  en_appairage: "En appairage",
  inscrit_gespers: "Inscrit GESPERS",
  en_formation: "En formation",
  abandon: "Abandon",
};

export function getCandidatBusinessStatusLabelFromValue(value?: string | null): string {
  if (!value) return "—";
  return BUSINESS_STATUS_LABELS[value] ?? value;
}

export function getCandidatBusinessStatusLabel(candidat?: Candidat | null): string {
  if (!candidat) return "—";

  const explicit = candidat.statut_metier_display?.trim();
  if (explicit) return explicit;

  if (candidat.statut_metier_calcule) {
    return getCandidatBusinessStatusLabelFromValue(candidat.statut_metier_calcule);
  }

  if (candidat.parcours_phase_display?.trim()) return candidat.parcours_phase_display;
  if (candidat.statut_display?.trim()) return candidat.statut_display;
  if (candidat.statut?.trim()) return candidat.statut;

  return "—";
}

export function getCandidatBusinessStatusColorByValue(
  value?: string | null
): "default" | "success" | "warning" | "error" | "info" | "secondary" {
  const label = getCandidatBusinessStatusLabelFromValue(value);
  return getCandidatBusinessStatusColor(label);
}

export function getCandidatBusinessStatusColor(
  label: string
): "default" | "success" | "warning" | "error" | "info" | "secondary" {
  if (label === "Candidat") return "default";
  if (label === "Candidat non admissible") return "error";
  if (label === "Candidat admissible") return "info";
  if (label === "En accompagnement TRE") return "secondary";
  if (label === "En appairage") return "warning";
  if (label === "Inscrit GESPERS") return "info";
  if (label === "En formation") return "success";
  if (label === "Abandon") return "error";
  return "default";
}
