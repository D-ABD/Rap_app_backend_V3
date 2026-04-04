import React, { useCallback, useMemo } from "react";
import { Box, Stack, Button, TextField, MenuItem } from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import type { Choice, DeclicFiltresValues, TypeDeclic } from "../../types/declic";

type Props = {
  options:
    | {
        type_declic: Choice[];
        centres?: (Choice & { code_postal?: string | null; departement?: string | null })[];
        annees?: number[];
        departements?: Choice[];
      }
    | undefined;
  values: DeclicFiltresValues;
  onChange: (next: DeclicFiltresValues) => void;
  onRefresh?: () => void;
  onReset?: () => void;
  hideSearch?: boolean;
};

/* ------------------------------------------------------------------ */
/* 🔧 Helpers */
/* ------------------------------------------------------------------ */
const map = <T,>(arr?: T[]) => arr ?? [];
const withPlaceholder = (opts: Array<{ value: string | number; label: string }>) =>
  opts.length ? opts : [{ value: "", label: "—" }];

function buildReset(values: DeclicFiltresValues): DeclicFiltresValues {
  return {
    ...values,
    search: "",
    type_declic: undefined,
    centre: undefined,
    departement: undefined,
    annee: undefined,
    date_min: undefined,
    date_max: undefined,
    ordering: "-date_declic",
    page: 1,
  };
}

/* ------------------------------------------------------------------ */
/* 🧩 Composant principal */
/* ------------------------------------------------------------------ */
export default function FiltresDeclicPanel({
  options,
  values,
  onChange,
  onRefresh,
  onReset,
  hideSearch = false,
}: Props) {
  const typeChoices = map(options?.type_declic);
  const centreChoices = map(options?.centres);
  const departementChoices = map(options?.departements);
  const anneesChoices = map(options?.annees?.map((a) => ({ value: a, label: String(a) })));

  const onLocalSearchChange = useCallback<React.ChangeEventHandler<HTMLInputElement>>(
    (e) => onChange({ ...values, search: e.target.value, page: 1 }),
    [onChange, values]
  );

  const onSearchKeyDown = useCallback<React.KeyboardEventHandler<HTMLInputElement>>(
    (e) => {
      if (e.key === "Escape" && values.search) {
        e.preventDefault();
        onChange({ ...values, search: "", page: 1 });
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
          {!hideSearch && (
            <Stack direction="row" spacing={1} alignItems="center" mb={1.5} flexWrap="wrap">
              <label htmlFor="declic-search-input" style={visuallyHidden as React.CSSProperties}>
                Rechercher des activités Déclic
              </label>

              <TextField
                id="declic-search-input"
                type="search"
                size="small"
                fullWidth
                value={values.search ?? ""}
                onChange={onLocalSearchChange}
                onKeyDown={onSearchKeyDown}
                placeholder="🔎 Recherche (type, centre, département…)"
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
          )}

          {/* 📆 Année / Type / Département / Centre */}
          <Stack direction="row" spacing={2} mb={1.5} flexWrap="wrap">
            {/* 📅 Année */}
            <TextField
              select
              size="small"
              label="📅 Année"
              value={values.annee ?? ""}
              onChange={(e) =>
                onChange({
                  ...values,
                  annee: e.target.value === "" ? undefined : Number(e.target.value),
                  page: 1,
                })
              }
              sx={{ minWidth: 120 }}
            >
              {withPlaceholder(anneesChoices).map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>

            {/* 🧩 Type d’activité */}
            <TextField
              select
              size="small"
              label="🧩 Type d’activité"
              value={values.type_declic ?? ""}
              onChange={(e) =>
                onChange({
                  ...values,
                  type_declic: e.target.value === "" ? undefined : (e.target.value as TypeDeclic),
                  page: 1,
                })
              }
              sx={{ minWidth: 180 }}
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

            {/* 🏙️ Département */}
            {departementChoices.length > 0 && (
              <TextField
                select
                size="small"
                label="🏙️ Département"
                value={values.departement ?? ""}
                onChange={(e) =>
                  onChange({
                    ...values,
                    departement: e.target.value === "" ? undefined : e.target.value,
                    page: 1,
                  })
                }
                sx={{ minWidth: 160 }}
              >
                {withPlaceholder(departementChoices).map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
            )}

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
                    centre: e.target.value === "" ? undefined : Number(e.target.value),
                    page: 1,
                  })
                }
                sx={{ minWidth: 200 }}
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
          </Stack>

          {/* 📅 Dates */}
          <Stack direction="row" spacing={2} mb={1.5} flexWrap="wrap">
            <TextField
              type="date"
              size="small"
              label="📅 Du"
              InputLabelProps={{ shrink: true }}
              inputProps={{ autoComplete: "off" }}
              autoComplete="new-password"
              value={values.date_min ?? ""}
              onChange={(e) =>
                onChange({
                  ...values,
                  date_min: e.target.value || undefined,
                  page: 1,
                })
              }
              sx={{ minWidth: 180 }}
            />
            <TextField
              type="date"
              size="small"
              label="📅 Au"
              InputLabelProps={{ shrink: true }}
              inputProps={{ autoComplete: "off" }}
              autoComplete="new-password"
              value={values.date_max ?? ""}
              onChange={(e) =>
                onChange({
                  ...values,
                  date_max: e.target.value || undefined,
                  page: 1,
                })
              }
              sx={{ minWidth: 180 }}
            />
          </Stack>

          {/* 🔁 Actions */}
          <Stack direction="row" spacing={1} mt={2}>
            <Button variant="outlined" onClick={() => actions.onReset()}>
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
