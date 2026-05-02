/**
 * Libellés alignés sur rap_app.models.prepa (API meta peut être vide au premier rendu).
 */

export type PrepaChoiceOption = { value: string; label: string };

export const PREPA_STATUT_PARCOURS_OPTIONS: PrepaChoiceOption[] = [
  { value: "en_attente", label: "En attente de parcours" },
  { value: "en_parcours", label: "En parcours" },
  { value: "parcours_termine", label: "Parcours terminé" },
  { value: "abandon", label: "Abandon" },
];

export const PREPA_STATUT_FORM_OPTIONS: PrepaChoiceOption[] = [
  { value: "en_attente", label: "En attente de parcours" },
  { value: "en_parcours", label: "En parcours" },
  { value: "parcours_termine", label: "Parcours terminé" },
  { value: "abandon", label: "Abandon" },
  { value: "en_attente_prochain_atelier", label: "En attente prochain atelier" },
  { value: "a_repositionner", label: "À repositionner" },
];

export const PREPA_ORIENTATION_FINALE_OPTIONS: PrepaChoiceOption[] = [
  { value: "afpa", label: "Orienté AFPA" },
  { value: "autre_centre_afpa", label: "Orienté vers un autre centre AFPA" },
  { value: "hors_afpa", label: "Autre orientation" },
];

export const PREPA_ISSUE_BILAN_OPTIONS: PrepaChoiceOption[] = [
  { value: "oriente_afpa", label: "Orienté AFPA" },
  { value: "abandon", label: "Abandon" },
  { value: "autre_sortie", label: "Autre sortie" },
];

export const PREPA_STATUT_POSITIONNEMENT_OPTIONS: PrepaChoiceOption[] = [
  { value: "a_positionner", label: "A positionner" },
  { value: "positionne", label: "Positionné" },
  { value: "en_attente", label: "En attente" },
];

/** Types atelier utilisables comme « prochain atelier » / filtres atelier (hors IC). */
export const PREPA_TYPE_ATELIER_PARCOURS_OPTIONS: PrepaChoiceOption[] = [
  { value: "atelier_1", label: "Atelier 1" },
  { value: "atelier_2", label: "Atelier 2" },
  { value: "atelier_3", label: "Atelier 3" },
  { value: "atelier_4", label: "Atelier 4" },
  { value: "atelier_5", label: "Atelier 5" },
  { value: "atelier_6", label: "Atelier 6" },
  { value: "autre", label: "Autre activité Prépa" },
];

export const PREPA_PROCHAIN_ETAPE_OPTIONS: PrepaChoiceOption[] = [
  { value: "atelier_1", label: "Atelier 1" },
  { value: "atelier_2", label: "Atelier 2" },
  { value: "atelier_3", label: "Atelier 3" },
  { value: "atelier_4", label: "Atelier 4" },
  { value: "atelier_5", label: "Atelier 5" },
  { value: "atelier_6", label: "Atelier 6" },
  { value: "bilan", label: "Bilan" },
];

export const PREPA_PILOTAGE_OPTIONS: PrepaChoiceOption[] = [
  { value: "attente_entree", label: "En attente d'entrée" },
  { value: "a_integrer_atelier_1", label: "À intégrer atelier 1" },
  { value: "attente_prochain_atelier", label: "En attente atelier suivant" },
  { value: "en_parcours_actif", label: "En parcours actif" },
  { value: "a_reprogrammer", label: "À reprogrammer" },
  { value: "parcours_termine", label: "Parcours terminé" },
  { value: "abandon", label: "Abandon" },
];

function norm(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}

/** Assure que la valeur courante du Select existe dans les MenuItem (évite warnings MUI). */
export function mergeChoiceOption<T extends string | number>(
  base: ReadonlyArray<{ value: T | string; label: string }>,
  current: T | string | null | undefined,
  fallbackLabel?: string
): Array<{ value: T | string; label: string }> {
  const s = norm(current);
  if (!s) return [...base];
  if (base.some((o) => norm(o.value) === s)) return [...base];
  return [...base, { value: current as T, label: fallbackLabel ?? s }];
}
