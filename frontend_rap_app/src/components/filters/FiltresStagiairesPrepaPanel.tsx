import React, { useMemo } from "react";
import { Box } from "@mui/material";
import FilterTemplate, { type FieldConfig } from "./FilterTemplate";
import type { ProchainEtapePrepa, StagiairePrepaFiltersValues, TypePrepa } from "../../types/prepa";
import {
  PREPA_ORIENTATION_FINALE_OPTIONS,
  PREPA_PROCHAIN_ETAPE_OPTIONS,
  PREPA_STATUT_PARCOURS_OPTIONS,
  PREPA_TYPE_ATELIER_PARCOURS_OPTIONS,
  mergeChoiceOption,
} from "../../constants/prepaChoices";

type Option = { value: string | number; label: string };

type Props = {
  options:
    | {
        centres?: Array<{ id: number; nom: string }>;
        statut_parcours?: Option[];
        statut_parcours_courant?: Option[];
        orientation_finale?: Option[];
        type_atelier?: Option[];
        prochain_etape?: Option[];
      }
    | undefined;
  values: StagiairePrepaFiltersValues;
  onChange: (next: StagiairePrepaFiltersValues) => void;
  onRefresh?: () => void;
  onReset?: () => void;
};

function buildReset(values: StagiairePrepaFiltersValues): StagiairePrepaFiltersValues {
  return {
    ...values,
    centre: undefined,
    statut_parcours_courant: undefined,
    atelier_en_cours: undefined,
    prochain_etape: undefined,
    orientation_finale: undefined,
    date_ic_min: undefined,
    date_ic_max: undefined,
    page: 1,
  };
}

export default function FiltresStagiairesPrepaPanel({
  options,
  values,
  onChange,
  onRefresh,
  onReset,
}: Props) {
  const fields = useMemo(() => {
    const centresRaw = options?.centres ?? [];
    const centreId = values.centre;
    const centres =
      typeof centreId === "number" && !centresRaw.some((c) => c.id === centreId)
        ? [...centresRaw, { id: centreId, nom: `Centre #${centreId}` }]
        : centresRaw;

    const statuts = mergeChoiceOption(
      options?.statut_parcours_courant?.length ? options.statut_parcours_courant : PREPA_STATUT_PARCOURS_OPTIONS,
      values.statut_parcours_courant
    );

    let ateliers = options?.type_atelier?.length ? options.type_atelier : PREPA_TYPE_ATELIER_PARCOURS_OPTIONS;
    ateliers = mergeChoiceOption(ateliers, values.atelier_en_cours);

    let prochainesEtapes: Array<{ value: string | number; label: string }> =
      options?.prochain_etape?.length ? [...options.prochain_etape] : [...PREPA_PROCHAIN_ETAPE_OPTIONS];
    prochainesEtapes = mergeChoiceOption(prochainesEtapes, values.prochain_etape);

    const orientations = mergeChoiceOption(
      options?.orientation_finale?.length ? options.orientation_finale : PREPA_ORIENTATION_FINALE_OPTIONS,
      values.orientation_finale
    );

    const next: Array<FieldConfig<StagiairePrepaFiltersValues>> = [];

    if (centres.length) {
      next.push({
        key: "centre",
        label: "🏫 Centre",
        type: "select",
        options: centres.map((centre) => ({ value: centre.id, label: centre.nom })),
        parse: (raw) => (raw === "" ? undefined : Number(raw)),
      });
    }

    next.push({
      key: "statut_parcours_courant",
      label: "📍 Statut",
      type: "select",
      options: statuts,
      parse: (raw) => (raw === "" ? undefined : raw),
    });

    next.push(
      {
        key: "atelier_en_cours",
        label: "🧩 Atelier en cours",
        type: "select",
        options: ateliers,
        parse: (raw) => (raw === "" ? undefined : (raw as TypePrepa)),
      },
      {
        key: "prochain_etape",
        label: "⏭️ Étape à venir",
        type: "select",
        options: prochainesEtapes,
        parse: (raw) => (raw === "" ? undefined : (raw as ProchainEtapePrepa)),
      }
    );

    next.push(
      {
        key: "orientation_finale",
        label: "🎯 Orientation",
        type: "select",
        options: orientations,
        parse: (raw) => (raw === "" ? undefined : raw),
      },
      {
        key: "date_ic_min",
        label: "📅 Date IC du",
        type: "date",
        parse: (raw) => (raw === "" ? undefined : raw),
      },
      {
        key: "date_ic_max",
        label: "📅 Date IC au",
        type: "date",
        parse: (raw) => (raw === "" ? undefined : raw),
      }
    );
    return next;
  }, [options, values]);

  return (
    <Box>
      <FilterTemplate<StagiairePrepaFiltersValues>
        values={values}
        onChange={(next) => onChange({ ...next, page: 1 })}
        fields={fields}
        actions={{
          onReset: onReset ? onReset : () => onChange(buildReset(values)),
          onRefresh,
          resetLabel: "Réinitialiser",
          refreshLabel: "Rafraîchir",
        }}
        cols={4}
        title="Filtres Stagiaires Prépa"
      />
    </Box>
  );
}
