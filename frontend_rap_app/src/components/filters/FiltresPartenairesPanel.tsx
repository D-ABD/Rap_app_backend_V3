// src/components/partenaires/FiltresPartenairesPanel.tsx
import React, { useCallback, useMemo } from "react";
import { Box, Stack, Button, TextField, Typography } from "@mui/material";
import { visuallyHidden } from "@mui/utils";

import FilterTemplate, { type FieldConfig } from "./FilterTemplate";

type UserOption = { id: number; full_name: string };
type ChoiceOption = { value: string | number; label: string };

export type PartenaireFilters = {
  search?: string;
  created_by?: number;
  city?: string;
  secteur_activite?: string;
  type?: string;
  has_appairages?: string;
  has_prospections?: string;
  page?: number;
};

type Props = {
  values: PartenaireFilters;
  onChange: (next: PartenaireFilters) => void;
  users: UserOption[];
  typeOptions: ChoiceOption[];
  secteurOptions?: ChoiceOption[];
  cityOptions?: ChoiceOption[];
  showCreatedByFilter?: boolean;
  loading?: boolean;
  onRefresh?: () => void;
  onReset?: () => void;
};

const withPlaceholder = (opts: Array<{ value: string | number; label: string }>) =>
  opts.length ? opts : [{ value: "", label: "—" }];

function buildReset(values: PartenaireFilters): PartenaireFilters {
  return {
    ...values,
    search: "",
    created_by: undefined,
    city: undefined,
    secteur_activite: undefined,
    type: undefined,
    has_appairages: undefined,
    has_prospections: undefined,
    page: 1,
  };
}

export default function FiltresPartenairesPanel({
  values,
  onChange,
  users,
  typeOptions,
  secteurOptions = [],
  cityOptions = [],
  showCreatedByFilter = false,
  loading = false,
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

  const fields = useMemo<Array<FieldConfig<PartenaireFilters>>>(() => {
    const base: Array<FieldConfig<PartenaireFilters>> = [
      {
        key: "city" as const,
        label: "🏙️ Ville",
        type: "select",
        options: withPlaceholder(cityOptions),
      },
      {
        key: "secteur_activite" as const,
        label: "🏭 Secteur",
        type: "select",
        options: withPlaceholder(secteurOptions),
      },
      {
        key: "type" as const,
        label: "📦 Type",
        type: "select",
        options: withPlaceholder(typeOptions),
      },
      {
        key: "has_appairages" as const,
        label: "🔗 Appairages",
        type: "select",
        options: [{ value: "1", label: "Avec appairages (≥ 1)" }],
      },
      {
        key: "has_prospections" as const,
        label: "📞 Prospections",
        type: "select",
        options: [{ value: "1", label: "Avec prospections (≥ 1)" }],
      },
    ];

    if (showCreatedByFilter) {
      base.unshift({
        key: "created_by" as const,
        label: "👤 Créateur",
        type: "select",
        options: withPlaceholder(users.map((u) => ({ value: Number(u.id), label: u.full_name }))),
      });
    }

    return base;
  }, [cityOptions, secteurOptions, typeOptions, showCreatedByFilter, users]);

  const actions = useMemo(
    () => ({
      onRefresh,
      onReset: onReset ? onReset : () => onChange(buildReset(values)),
      resetLabel: "Réinitialiser",
      refreshLabel: "Rafraîchir",
    }),
    [onRefresh, onReset, onChange, values]
  );

  return (
    <>
      {loading ? (
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
            <label htmlFor="partenaires-search-input" style={visuallyHidden as React.CSSProperties}>
              Rechercher des partenaires
            </label>
            <Typography component="span" id="partenaires-search-help" sx={visuallyHidden}>
              Tapez votre recherche. Appuyez sur Échap pour effacer.
            </Typography>

            <TextField
              id="partenaires-search-input"
              type="search"
              size="small"
              fullWidth
              value={values.search ?? ""}
              onChange={onLocalSearchChange}
              onKeyDown={onSearchKeyDown}
              placeholder="🔎 Recherche (nom, secteur, ville, contact…)"
              inputProps={{
                "aria-describedby": "partenaires-search-help",
              }}
            />

            {values.search && (
              <Button
                variant="outlined"
                onClick={() => onChange({ ...values, search: "", page: 1 })}
              >
                ✕
              </Button>
            )}
          </Stack>

          {/* 📋 Filtres dynamiques */}
          <FilterTemplate<PartenaireFilters>
            values={values}
            onChange={(next) => onChange({ ...next, page: 1 })}
            fields={fields}
            actions={actions}
            cols={3}
          />
        </>
      )}
    </>
  );
}
