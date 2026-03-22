// src/components/filters/FiltresAteliersTREPanel.tsx
import React, { useCallback, useMemo } from "react";
import { Box, Stack, Button, TextField, Typography, MenuItem } from "@mui/material";
import { visuallyHidden } from "@mui/utils";

import type { Choice, AtelierTREFiltresValues, TypeAtelier } from "../../types/ateliersTre";

type Props = {
  options: { type_atelier: Choice[]; centre?: Choice[] } | undefined;
  values: AtelierTREFiltresValues;
  onChange: (next: AtelierTREFiltresValues) => void;
  onRefresh?: () => void;
  onReset?: () => void;
};

const map = <T,>(arr?: T[]) => arr ?? [];
const withPlaceholder = (opts: Array<{ value: string | number; label: string }>) =>
  opts.length ? opts : [{ value: "", label: "—" }];

function buildReset(values: AtelierTREFiltresValues): AtelierTREFiltresValues {
  return {
    ...values,
    search: "",
    type_atelier: undefined,
    centre: undefined,
    date_atelier_min: undefined,
    date_atelier_max: undefined,
    ordering: "-date_atelier",
    page: 1,
  };
}

export default function FiltresAteliersTREPanel({
  options,
  values,
  onChange,
  onRefresh,
  onReset,
}: Props) {
  const typeChoices = map(options?.type_atelier);
  const centreChoices = map(options?.centre);

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

  const actions = useMemo(
    () => ({
      onRefresh,
      onReset: onReset ?? (() => onChange(buildReset(values))),
      resetLabel: "Réinitialiser",
      refreshLabel: "Rafraîchir",
    }),
    [onRefresh, onReset, onChange, values]
  );

  const ready = Boolean(options);

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
            <label htmlFor="ateliers-search-input" style={visuallyHidden as React.CSSProperties}>
              Rechercher des ateliers
            </label>
            <Typography component="span" id="ateliers-search-help" sx={visuallyHidden}>
              Tapez votre recherche. Appuyez sur Échap pour effacer.
            </Typography>

            <TextField
              id="ateliers-search-input"
              type="search"
              size="small"
              fullWidth
              value={values.search ?? ""}
              onChange={onLocalSearchChange}
              onKeyDown={onSearchKeyDown}
              placeholder="🔎 Recherche (type, centre…)"
              inputProps={{
                "aria-describedby": "ateliers-search-help",
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

          {/* 📅 Dates */}
          <Stack direction="row" spacing={1} mb={1.5} flexWrap={{ xs: "wrap", md: "nowrap" }}>
            <TextField
              type="date"
              size="small"
              label="Date min"
              value={values.date_atelier_min ?? ""}
              onChange={(e) =>
                onChange({
                  ...values,
                  date_atelier_min: e.target.value || undefined,
                  page: 1,
                })
              }
              sx={{ minWidth: 160 }}
            />
            <TextField
              type="date"
              size="small"
              label="Date max"
              value={values.date_atelier_max ?? ""}
              onChange={(e) =>
                onChange({
                  ...values,
                  date_atelier_max: e.target.value || undefined,
                  page: 1,
                })
              }
              sx={{ minWidth: 160 }}
            />
          </Stack>

          {/* 🧩 Type atelier */}
          <TextField
            select
            size="small"
            label="🧩 Type d’atelier"
            value={values.type_atelier ?? ""}
            onChange={(e) =>
              onChange({
                ...values,
                type_atelier: e.target.value === "" ? undefined : (e.target.value as TypeAtelier), // ✅ cast
                page: 1,
              })
            }
            sx={{ minWidth: 180, mr: 2, mb: 1.5 }}
          >
            {withPlaceholder(
              typeChoices.map((o) => ({
                value: String(o.value),
                label: o.label,
              }))
            ).map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>

          {/* 🏫 Centre */}
          {centreChoices.length > 0 && (
            <TextField
              select
              size="small"
              label="🏫 Centre"
              value={values.centre ?? ""}
              onChange={(e) =>
                onChange({
                  ...values,
                  centre: e.target.value === "" ? undefined : Number(e.target.value), // ✅ conversion number
                  page: 1,
                })
              }
              sx={{ minWidth: 180, mr: 2, mb: 1.5 }}
            >
              {withPlaceholder(
                centreChoices.map((o) => ({
                  value: String(o.value),
                  label: o.label,
                }))
              ).map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
          )}

          {/* ↕️ Tri */}
          <TextField
            select
            size="small"
            label="↕️ Tri"
            value={values.ordering ?? "-date_atelier"}
            onChange={(e) => onChange({ ...values, ordering: e.target.value, page: 1 })}
            sx={{ minWidth: 200, mr: 2, mb: 1.5 }}
          >
            <MenuItem value="-date_atelier">📅 Date (récent→ancien)</MenuItem>
            <MenuItem value="date_atelier">📅 Date (ancien→récent)</MenuItem>
            <MenuItem value="type_atelier">🔤 Type (A→Z)</MenuItem>
            <MenuItem value="-type_atelier">🔤 Type (Z→A)</MenuItem>
            <MenuItem value="id"># ID (↑)</MenuItem>
            <MenuItem value="-id"># ID (↓)</MenuItem>
          </TextField>

          {/* Actions */}
          <Stack direction="row" spacing={1} mt={2}>
            <Button
              variant="outlined"
              onClick={() => (actions.onReset ? actions.onReset() : undefined)}
            >
              {actions.resetLabel}
            </Button>
            {actions.onRefresh && (
              <Button variant="outlined" onClick={actions.onRefresh}>
                {actions.refreshLabel}
              </Button>
            )}
          </Stack>
        </>
      )}
    </>
  );
}
