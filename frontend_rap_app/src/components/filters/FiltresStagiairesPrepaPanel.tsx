import React, { useMemo } from "react";
import { Box } from "@mui/material";
import FilterTemplate, { type FieldConfig } from "./FilterTemplate";
import type { StagiairePrepaFiltersValues, TypePrepa } from "../../types/prepa";

type Option = { value: string | number; label: string };

type Props = {
  options:
    | {
        centres?: Array<{ id: number; nom: string }>;
        statut_parcours?: Option[];
        orientation_finale?: Option[];
        type_atelier?: Option[];
        pilotage?: Option[];
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
    statut_parcours_calcule: undefined,
    atelier_en_cours: undefined,
    prochain_atelier_attendu: undefined,
    orientation_finale: undefined,
    pilotage: undefined,
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
    const centres = options?.centres ?? [];
    const statuts = options?.statut_parcours ?? [];
    const orientations = options?.orientation_finale ?? [];
    const ateliers = options?.type_atelier ?? [];
    const pilotages = options?.pilotage ?? [];
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
      key: "statut_parcours_calcule",
      label: "📍 Statut",
      type: "select",
      options: statuts,
      parse: (raw) => (raw === "" ? undefined : raw),
    });

    if (ateliers.length) {
      next.push(
        {
          key: "atelier_en_cours",
          label: "🧩 Atelier en cours",
          type: "select",
          options: ateliers,
          parse: (raw) => (raw === "" ? undefined : (raw as TypePrepa)),
        },
        {
          key: "prochain_atelier_attendu",
          label: "⏭️ Atelier à venir",
          type: "select",
          options: ateliers,
          parse: (raw) => (raw === "" ? undefined : (raw as TypePrepa)),
        }
      );
    }

    next.push(
      {
        key: "orientation_finale",
        label: "🎯 Orientation",
        type: "select",
        options: orientations,
        parse: (raw) => (raw === "" ? undefined : raw),
      },
      {
        key: "pilotage",
        label: "🧭 Pilotage",
        type: "select",
        options: pilotages,
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
  }, [options]);

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
