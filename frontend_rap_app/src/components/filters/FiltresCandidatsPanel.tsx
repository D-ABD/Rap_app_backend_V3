// src/components/filters/FiltresCandidatsPanel.tsx
import React, { useCallback, useMemo } from "react";
import { Box, Stack, TextField, Button, Typography } from "@mui/material";
import { visuallyHidden } from "@mui/utils";

import FilterTemplate, { type FieldConfig } from "./FilterTemplate";
import type { CandidatFiltresValues, CandidatFiltresOptions } from "../../types/candidat";

type Props = {
  options: CandidatFiltresOptions | undefined; // peut arriver undefined au runtime
  values: CandidatFiltresValues;
  onChange: (next: CandidatFiltresValues) => void;
  onRefresh?: () => void;
  onReset?: () => void;
};

const map = <T,>(arr?: T[]) => arr ?? [];

const BOOL_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "true", label: "Oui" },
  { value: "false", label: "Non" },
];

const withPlaceholder = (opts: Array<{ value: string | number; label: string }>) =>
  opts.length ? opts : [{ value: "", label: "—" }];

function buildReset(values: CandidatFiltresValues): CandidatFiltresValues {
  return {
    ...values,
    search: "",
    centre: undefined,
    formation: undefined,
    ville: undefined,
    code_postal: undefined,
    statut: undefined,
    type_contrat: undefined,
    disponibilite: undefined,
    resultat_placement: undefined,
    contrat_signe: undefined,
    responsable_placement: undefined,
    rqth: undefined,
    permis_b: undefined,
    admissible: undefined,
    has_osia: undefined,
    entretien_done: undefined,
    test_is_ok: undefined,
    page: 1,
  };
}

export default function FiltresCandidatsPanel({
  options,
  values,
  onChange,
  onRefresh,
  onReset,
}: Props) {
  const onLocalSearchChange = useCallback<React.ChangeEventHandler<HTMLInputElement>>(
    (e) => {
      onChange({ ...values, search: e.target.value, page: 1 });
    },
    [onChange, values]
  );

  const onSearchKeyDown = useCallback<React.KeyboardEventHandler<HTMLInputElement>>(
    (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (values.search) {
          onChange({ ...values, search: "", page: 1 });
        }
      }
    },
    [onChange, values]
  );

  const fields = useMemo<Array<FieldConfig<CandidatFiltresValues>>>(() => {
    return [
      ...(options?.centre?.length
        ? [
            {
              key: "centre" as const,
              label: "🏫 Centre",
              type: "select" as const,
              options: map(options?.centre).map((o) => ({
                value: Number(o.value),
                label: o.label,
              })),
            },
          ]
        : []),

      ...(options?.formation?.length
        ? [
            {
              key: "formation" as const,
              label: "🎓 Formation",
              type: "select" as const,
              options: map(options?.formation).map((o) => ({
                value: Number(o.value),
                label: o.label,
              })),
            },
          ]
        : []),

      {
        key: "statut" as const,
        label: "📍 Statut",
        type: "select" as const,
        options: withPlaceholder(
          map(options?.statut).map((o) => ({
            value: String(o.value),
            label: o.label,
          }))
        ),
      },

      {
        key: "type_contrat" as const,
        label: "📄 Type de contrat",
        type: "select" as const,
        options: withPlaceholder(
          map(options?.type_contrat).map((o) => ({
            value: String(o.value),
            label: o.label,
          }))
        ),
      },

      ...(options?.disponibilite?.length
        ? [
            {
              key: "disponibilite" as const,
              label: "🕘 Disponibilité",
              type: "select" as const,
              options: map(options?.disponibilite).map((o) => ({
                value: String(o.value),
                label: o.label,
              })),
            },
          ]
        : []),

      {
        key: "entretien_done" as const,
        label: "📝 Entretien fait",
        type: "select" as const,
        options: BOOL_OPTIONS,
      },
      {
        key: "test_is_ok" as const,
        label: "✅ Test OK",
        type: "select" as const,
        options: BOOL_OPTIONS,
      },
      {
        key: "rqth" as const,
        label: "♿ RQTH",
        type: "select" as const,
        options: BOOL_OPTIONS,
      },
      {
        key: "permis_b" as const,
        label: "🚗 Permis B",
        type: "select" as const,
        options: BOOL_OPTIONS,
      },
      {
        key: "admissible" as const,
        label: "🟢 Admissible",
        type: "select" as const,
        options: BOOL_OPTIONS,
      },
      {
        key: "has_osia" as const,
        label: "🔢 A un OSIA",
        type: "select" as const,
        options: BOOL_OPTIONS,
      },

      ...(options?.resultat_placement?.length
        ? [
            {
              key: "resultat_placement" as const,
              label: "🤝 Résultat placement",
              type: "select" as const,
              options: map(options?.resultat_placement).map((o) => ({
                value: String(o.value),
                label: o.label,
              })),
            },
          ]
        : []),
      ...(options?.contrat_signe?.length
        ? [
            {
              key: "contrat_signe" as const,
              label: "✍️ Contrat signé",
              type: "select" as const,
              options: map(options?.contrat_signe).map((o) => ({
                value: String(o.value),
                label: o.label,
              })),
            },
          ]
        : []),

      {
        key: "ordering" as const,
        label: "↕️ Tri",
        type: "select" as const,
        options: [
          {
            value: "-date_inscription",
            label: "📅 Inscription (récent→ancien)",
          },
          {
            value: "date_inscription",
            label: "📅 Inscription (ancien→récent)",
          },
          { value: "nom", label: "🔤 Nom A→Z" },
          { value: "-nom", label: "🔤 Nom Z→A" },
          { value: "-nb_appairages_calc", label: "🤝 Appairages (↓)" },
          { value: "nb_appairages_calc", label: "🤝 Appairages (↑)" },
          { value: "-nb_prospections_calc", label: "📞 Prospections (↓)" },
          { value: "nb_prospections_calc", label: "📞 Prospections (↑)" },
        ],
      },
    ];
  }, [options]);

  const actions = useMemo(
    () => ({
      onRefresh,
      onReset: onReset ? onReset : () => onChange(buildReset(values)),
      resetLabel: "Réinitialiser",
      refreshLabel: "Rafraîchir",
    }),
    [onRefresh, onReset, onChange, values]
  );

  const ready = Boolean(options);

  return !ready ? (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        p: "0.75rem 1rem",
        border: "1px dashed",
        borderColor: "divider",
        borderRadius: 2,
        color: "text.secondary",
        bgcolor: "grey.50",
        mb: 2,
        textAlign: "center",
      }}
    >
      Chargement des filtres…
    </Box>
  ) : (
    <>
      {/* 🔎 Champ de recherche */}
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        mb={1.5}
        flexWrap={{ xs: "wrap", md: "nowrap" }}
      >
        <label htmlFor="candidats-search-input" style={visuallyHidden as React.CSSProperties}>
          Rechercher des candidats
        </label>
        <Typography component="span" id="candidats-search-help" sx={visuallyHidden}>
          Tapez votre recherche. Appuyez sur Échap pour effacer.
        </Typography>

        <TextField
          id="candidats-search-input"
          type="search"
          size="small"
          fullWidth
          value={values.search ?? ""}
          onChange={onLocalSearchChange}
          onKeyDown={onSearchKeyDown}
          placeholder="🔎 Recherche (nom, email, ville, OSIA…)"
          inputProps={{
            "aria-describedby": "candidats-search-help",
          }}
        />

        {values.search && (
          <Button variant="outlined" onClick={() => onChange({ ...values, search: "", page: 1 })}>
            ✕
          </Button>
        )}
      </Stack>

      {/* 📋 Filtres dynamiques */}
      <FilterTemplate<CandidatFiltresValues>
        values={values}
        onChange={(next) => onChange({ ...next, page: 1 })}
        fields={fields}
        actions={actions}
        cols={6}
      />
    </>
  );
}
