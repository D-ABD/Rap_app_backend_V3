import React, { useCallback, useMemo } from "react";
import { Box, Button, Stack, TextField } from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import FilterTemplate, { type FieldConfig } from "./FilterTemplate";
import type { Choice, PrepaFiltresValues, TypePrepa } from "../../types/prepa";

type Props = {
  options:
    | {
        type_prepa: Choice[];
        centres?: (Choice & { code_postal?: string | null; departement?: string | null })[];
        annees?: number[];
        departements?: Choice[];
      }
    | undefined;
  values: PrepaFiltresValues;
  onChange: (next: PrepaFiltresValues) => void;
  onRefresh?: () => void;
  onReset?: () => void;
  hideSearch?: boolean;
  hideType?: boolean;
  dateLabelPrefix?: string;
};

const map = <T,>(arr?: T[]) => arr ?? [];
const withPlaceholder = (opts: Array<{ value: string | number; label: string }>) =>
  opts.length ? opts : [{ value: "", label: "—" }];

function buildReset(values: PrepaFiltresValues): PrepaFiltresValues {
  return {
    ...values,
    search: "",
    type_prepa: undefined,
    centre: undefined,
    departement: undefined,
    annee: undefined,
    date_min: undefined,
    date_max: undefined,
    ordering: "-date_prepa",
    page: 1,
  };
}

export default function FiltresPrepaPanel({
  options,
  values,
  onChange,
  onRefresh,
  onReset,
  hideSearch = false,
  hideType = false,
  dateLabelPrefix = "Date",
}: Props) {
  const typeChoices = map(options?.type_prepa);
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

  const fields = useMemo<Array<FieldConfig<PrepaFiltresValues>>>(() => {
    const next: Array<FieldConfig<PrepaFiltresValues>> = [
      {
        key: "annee",
        label: "📅 Année",
        type: "select",
        options: withPlaceholder(anneesChoices),
        parse: (raw) => (raw === "" ? undefined : Number(raw)),
      },
    ];

    if (!hideType) {
      next.push({
        key: "type_prepa",
        label: "🧩 Type d’activité Prépa",
        type: "select",
        options: withPlaceholder(
          typeChoices.map((o) => ({
            value: String(o.value),
            label: o.label,
          }))
        ),
        parse: (raw) => (raw === "" ? undefined : (raw as TypePrepa)),
      });
    }

    if (departementChoices.length > 0) {
      next.push({
        key: "departement",
        label: "🏙️ Département",
        type: "select",
        options: withPlaceholder(departementChoices),
        parse: (raw) => (raw === "" ? undefined : raw),
      });
    }

    if (centreChoices.length > 0) {
      next.push({
        key: "centre",
        label: "🏫 Centre",
        type: "select",
        options: withPlaceholder(
          centreChoices.map((o) => ({
            value: String(o.value),
            label: o.label,
          }))
        ),
        parse: (raw) => (raw === "" ? undefined : Number(raw)),
      });
    }

    next.push(
      {
        key: "date_min",
        label: `📅 ${dateLabelPrefix} du`,
        type: "date",
        parse: (raw) => (raw === "" ? undefined : raw),
      },
      {
        key: "date_max",
        label: `📅 ${dateLabelPrefix} au`,
        type: "date",
        parse: (raw) => (raw === "" ? undefined : raw),
      }
    );

    return next;
  }, [anneesChoices, centreChoices, dateLabelPrefix, departementChoices, hideType, typeChoices]);

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
              <label htmlFor="prepa-search-input" style={visuallyHidden as React.CSSProperties}>
                Rechercher des activités Prépa
              </label>

              <TextField
                id="prepa-search-input"
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

          <FilterTemplate<PrepaFiltresValues>
            values={values}
            onChange={(next) => onChange({ ...next, page: 1 })}
            fields={fields}
            actions={actions}
            cols={4}
            loading={!ready}
            title="Filtres Prépa"
          />
        </>
      )}
    </>
  );
}
