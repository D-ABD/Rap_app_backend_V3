// src/components/filters/FiltresAppairagePanel.tsx
import React, { useCallback, useMemo } from "react";
import { Box, Stack, Button, TextField, Typography } from "@mui/material";
import { visuallyHidden } from "@mui/utils";

import {
  AppairageFiltresValues,
  AppairageMeta,
  AppairageActivite,
  AppairageActiviteLabels,
} from "../../types/appairage";
import FilterTemplate, { FieldConfig } from "./FilterTemplate";

type WithSearchAndCentre = AppairageFiltresValues & {
  search?: string;
  centre?: number;
};
type MetaWithCentre = AppairageMeta & {
  centre_choices?: Array<{ value: number; label: string }>;
};

interface Props {
  values: WithSearchAndCentre;
  onChange: (val: WithSearchAndCentre) => void;
  meta: MetaWithCentre | null;
  loading: boolean;
  onRefresh?: () => void;
  onReset?: () => void;
}

const map = <T extends { value: string | number; label: string }>(arr?: T[]) => arr ?? [];

const withPlaceholder = (opts: Array<{ value: string | number; label: string }>) =>
  opts.length ? opts : [{ value: "", label: "—" }];

function buildReset(values: WithSearchAndCentre, meta: MetaWithCentre): WithSearchAndCentre {
  const next: WithSearchAndCentre = { ...values };
  if (meta.statut_choices) next.statut = undefined;
  if (meta.formation_choices) next.formation = undefined;
  if (meta.candidat_choices) next.candidat = undefined;
  if (meta.partenaire_choices) next.partenaire = undefined;
  if (meta.user_choices) next.created_by = undefined;
  if (meta.centre_choices) next.centre = undefined;
  next.search = undefined;
  next.avec_archivees = false;
  next.activite = undefined;
  return next;
}

export const AppairageFilters: React.FC<Props> = ({
  values,
  onChange,
  meta,
  loading,
  onRefresh,
  onReset,
}) => {
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
          onChange({ ...values, search: undefined, page: 1 });
        }
      }
    },
    [onChange, values]
  );

  const fields = useMemo<Array<FieldConfig<WithSearchAndCentre>>>(() => {
    return [
      {
        key: "statut" as const,
        label: "📍 Statut",
        type: "select" as const,
        options: withPlaceholder(
          map(meta?.statut_choices).map((o) => ({
            value: String(o.value),
            label: o.label,
          }))
        ),
      },
      ...(meta?.formation_choices
        ? [
            {
              key: "formation" as const,
              label: "🎓 Formation",
              type: "select" as const,
              options: map(meta.formation_choices).map((o) => ({
                value: Number(o.value),
                label: o.label,
              })),
            },
          ]
        : []),
      ...(meta?.centre_choices
        ? [
            {
              key: "centre" as const,
              label: "🏫 Centre",
              type: "select" as const,
              options: map(meta.centre_choices).map((o) => ({
                value: Number(o.value),
                label: o.label,
              })),
            },
          ]
        : []),
      ...(meta?.candidat_choices
        ? [
            {
              key: "candidat" as const,
              label: "🧑 Candidat",
              type: "select" as const,
              options: map(meta.candidat_choices).map((o) => ({
                value: Number(o.value),
                label: o.label,
              })),
            },
          ]
        : []),
      ...(meta?.partenaire_choices
        ? [
            {
              key: "partenaire" as const,
              label: "🏢 Partenaire",
              type: "select" as const,
              options: map(meta.partenaire_choices).map((o) => ({
                value: Number(o.value),
                label: o.label,
              })),
            },
          ]
        : []),
      ...(meta?.user_choices
        ? [
            {
              key: "created_by" as const,
              label: "👤 Créé par",
              type: "select" as const,
              options: map(meta.user_choices).map((o) => ({
                value: Number(o.value),
                label: o.label,
              })),
            },
          ]
        : []),

      // 📅 🔥 FILTRE PAR ANNÉE
      {
        key: "annee",
        label: "📅 Année",
        type: "select",
        options: [
          { value: "", label: "— Toutes —" },
          { value: 2023, label: "2023" },
          { value: 2024, label: "2024" },
          { value: 2025, label: "2025" },
          { value: 2026, label: "2026" },
        ],
        tooltip: "Filtrer selon l’année de l’appairage",
      },

      // 📆 DATE MIN
      {
        key: "date_min",
        label: "📆 Date min",
        type: "date",
        tooltip: "Afficher les appairages après cette date",
      },

      // 📆 DATE MAX
      {
        key: "date_max",
        label: "📆 Date max",
        type: "date",
        tooltip: "Afficher les appairages avant cette date",
      },

      // ✅ Nouveau sélecteur activité : Actif / Archivé / Tous
      {
        key: "activite" as const,
        label: "🗃️ Activité",
        type: "select" as const,
        options: [
          { value: "", label: "— Tous —" },
          {
            value: "actif" satisfies AppairageActivite,
            label: AppairageActiviteLabels.actif,
          },
          {
            value: "archive" satisfies AppairageActivite,
            label: AppairageActiviteLabels.archive,
          },
        ],
        tooltip: "Filtrer selon le statut d’activité (actif ou archivé)",
      },

      // ✅ Case à cocher “Inclure les archivés”
      {
        key: "avec_archivees",
        label: "📦 Inclure les archivés",
        type: "checkbox" as const,
        tooltip: "Afficher aussi les appairages archivés (sans filtrer exclusivement)",
      },
    ];
  }, [meta]);

  const actions = useMemo(
    () => ({
      onRefresh,
      onReset:
        onReset ??
        (() => {
          if (meta) onChange(buildReset(values, meta));
        }),
      resetLabel: "Réinitialiser",
      refreshLabel: "Rafraîchir",
    }),
    [onRefresh, onReset, onChange, values, meta]
  );

  const ready = !loading && Boolean(meta?.statut_choices);

  return (
    <>
      {!ready ? (
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
          {/* 🔎 Recherche */}
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            mb={1.5}
            flexWrap={{ xs: "wrap", md: "nowrap" }}
          >
            <label htmlFor="appairages-search-input" style={visuallyHidden as React.CSSProperties}>
              Rechercher des appairages
            </label>
            <Typography component="span" id="appairages-search-help" sx={visuallyHidden}>
              Tapez votre recherche. Appuyez sur Échap pour effacer.
            </Typography>

            <TextField
              id="appairages-search-input"
              type="search"
              size="small"
              fullWidth
              value={values.search ?? ""}
              onChange={onLocalSearchChange}
              onKeyDown={onSearchKeyDown}
              placeholder="🔎 Recherche (nom, partenaire, formation, créateur…)"
              inputProps={{
                "aria-describedby": "appairages-search-help",
              }}
            />

            {values.search && (
              <Button
                variant="outlined"
                onClick={() => onChange({ ...values, search: undefined, page: 1 })}
              >
                ✕
              </Button>
            )}
          </Stack>

          {/* 📋 Filtres dynamiques */}
          <FilterTemplate<WithSearchAndCentre>
            values={values}
            onChange={onChange}
            fields={fields}
            actions={actions}
            cols={6}
          />
        </>
      )}
    </>
  );
};
