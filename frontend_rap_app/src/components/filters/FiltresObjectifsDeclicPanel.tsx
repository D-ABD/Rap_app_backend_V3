import React, { useCallback, useMemo, useState } from "react";
import { Box, Stack, Button, TextField, MenuItem, Collapse } from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import type { Choice, ObjectifDeclicFiltresValues } from "../../types/declic";

type Props = {
  options: { annee?: Choice[]; centre?: Choice[]; departement?: Choice[] } | undefined;
  values: ObjectifDeclicFiltresValues;
  onChange: (next: ObjectifDeclicFiltresValues) => void;
  onRefresh?: () => void;
  onReset?: () => void;
};

/* ------------------------------------------------------------------ */
/* 🔧 Helpers */
/* ------------------------------------------------------------------ */
const map = <T,>(arr?: T[]) => arr ?? [];
const withPlaceholder = (opts: Array<{ value: string | number; label: string }>) =>
  opts.length ? opts : [{ value: "", label: "—" }];

function buildReset(values: ObjectifDeclicFiltresValues): ObjectifDeclicFiltresValues {
  return {
    ...values,
    search: "",
    centre: undefined,
    departement: undefined,
    annee: undefined,
    ordering: "-annee",
    page: 1,
  };
}

/* ------------------------------------------------------------------ */
/* 🧩 Composant principal */
/* ------------------------------------------------------------------ */
export default function FiltresObjectifsDeclicPanel({
  options,
  values,
  onChange,
  onRefresh,
  onReset,
}: Props) {
  const [showFilters, setShowFilters] = useState(false); // 👈 Masqué par défaut

  const anneeChoices = map(options?.annee);
  const centreChoices = map(options?.centre);
  const departementChoices = map(options?.departement);

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

  /* ------------------------------------------------------------------ */
  /* 🔽 UI avec bouton bascule */
  /* ------------------------------------------------------------------ */
  return (
    <>
      {/* Bouton pour afficher/masquer */}
      <Stack direction="row" justifyContent="flex-end" mb={1.5}>
        <Button variant="outlined" size="small" onClick={() => setShowFilters((prev) => !prev)}>
          {showFilters ? "Masquer les filtres ▲" : "Afficher les filtres ▼"}
        </Button>
      </Stack>

      <Collapse in={showFilters} timeout="auto" unmountOnExit>
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
            {/* 🔍 Recherche */}
            <Stack direction="row" spacing={1} alignItems="center" mb={1.5} flexWrap="wrap">
              <label htmlFor="objectifs-search-input" style={visuallyHidden as React.CSSProperties}>
                Rechercher un objectif Déclic
              </label>

              <TextField
                id="objectifs-search-input"
                type="search"
                size="small"
                fullWidth
                value={values.search ?? ""}
                onChange={onLocalSearchChange}
                onKeyDown={onSearchKeyDown}
                placeholder="🔎 Recherche (centre, département…)"
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

            {/* 🗓️ Année */}
            <TextField
              select
              size="small"
              label="🗓️ Année"
              value={values.annee ?? ""}
              onChange={(e) =>
                onChange({
                  ...values,
                  annee: e.target.value === "" ? undefined : Number(e.target.value),
                  page: 1,
                })
              }
              sx={{ minWidth: 140, mr: 2, mb: 1.5 }}
            >
              {withPlaceholder(
                anneeChoices.map((o) => ({ value: String(o.value), label: o.label }))
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
                    centre: e.target.value === "" ? undefined : Number(e.target.value),
                    page: 1,
                  })
                }
                sx={{ minWidth: 180, mr: 2, mb: 1.5 }}
              >
                {withPlaceholder(
                  centreChoices.map((o) => ({ value: String(o.value), label: o.label }))
                ).map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
            )}

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
                    departement: e.target.value === "" ? undefined : String(e.target.value),
                    page: 1,
                  })
                }
                sx={{ minWidth: 180, mr: 2, mb: 1.5 }}
              >
                {withPlaceholder(
                  departementChoices.map((o) => ({ value: String(o.value), label: o.label }))
                ).map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
            )}

            {/* 🧭 Actions */}
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
      </Collapse>
    </>
  );
}
