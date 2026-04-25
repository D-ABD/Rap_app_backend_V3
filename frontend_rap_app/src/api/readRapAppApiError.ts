import type { AxiosError } from "axios";

/** Clés d’erreur DRF / RapApp reconnues pour l’écran plan d’action. */
const CHAMP_RAPPEL: Record<string, string> = {
  titre: "Titre",
  date_debut: "Date de début",
  date_fin: "Date de fin",
  periode_type: "Type de période",
  centre: "Centre",
  formation: "Formation",
  synthese: "Synthèse",
  resume_points_cles: "Points clés",
  plan_action: "Plan d’action",
  statut: "Statut",
  metadata: "Périmètre centres",
  commentaire_ids: "Commentaires sources",
  plan_action_structured: "Plan d’action structuré",
  non_field_errors: "",
};

/**
 * Extrait un message lisible d’une erreur API (enveloppe RapApp ou erreur DRF nue).
 */
export function readRapAppApiError(err: unknown, fallback = "Une erreur est survenue."): string {
  const ax = err as AxiosError<Record<string, unknown>>;
  const d = ax.response?.data;
  if (!d || typeof d !== "object") {
    if (ax.message) return ax.message;
    return fallback;
  }

  const msg = d.message;
  if (typeof msg === "string" && msg.trim()) {
    return msg.trim();
  }

  const nested = d.errors;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const lines: string[] = [];
    for (const [k, v] of Object.entries(nested as Record<string, unknown>)) {
      if (k === "detail" || v == null) continue;
      const label = CHAMP_RAPPEL[k] ?? k.replace(/_/g, " ");
      if (k === "non_field_errors" || label === "") {
        if (Array.isArray(v)) {
          v.forEach((x) => lines.push(String(x)));
        } else {
          lines.push(String(v));
        }
        continue;
      }
      if (Array.isArray(v)) {
        v.forEach((x) => lines.push(`${label} : ${String(x)}`));
      } else {
        lines.push(`${label} : ${String(v)}`);
      }
    }
    if (lines.length) {
      return lines.length === 1 ? lines[0] : lines.join(" — ");
    }
  }

  if (Array.isArray(d.non_field_errors) && d.non_field_errors[0] != null) {
    return String((d.non_field_errors as string[])[0]);
  }
  for (const [k, val] of Object.entries(d)) {
    if (k === "success" || k === "data") continue;
    if (k === "detail" && typeof val === "string" && val) return val;
    if (k === "errors") continue;
    if (Array.isArray(val) && val[0] != null) {
      return `${k} : ${String(val[0])}`;
    }
  }
  if (typeof d.detail === "string" && d.detail) {
    return d.detail;
  }
  if (Array.isArray(d.detail) && d.detail[0] != null) {
    return String(d.detail[0]);
  }
  if (ax.message) return ax.message;
  return fallback;
}
