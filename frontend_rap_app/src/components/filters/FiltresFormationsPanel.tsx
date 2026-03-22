import React, { useMemo, useCallback } from "react";
import { Box, Stack, Button, TextField, Typography } from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import FilterTemplate, { type FieldConfig } from "./FilterTemplate";
import type { FiltresFormationsData, FiltresFormationsValues } from "../../types/formation";

type Props = {
  filtres: FiltresFormationsData | null;
  values: FiltresFormationsValues;
  onChange: (values: FiltresFormationsValues) => void;
  onReset?: () => void;
  onRefresh?: () => void;
};

// 🔹 utilitaire : unique + format {value,label}
function toOptionsUnique<T extends { id: number; nom: string }>(arr: T[] = []) {
  const seen = new Set<number>();
  return arr.reduce<Array<{ value: number; label: string }>>((acc, item) => {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      acc.push({ value: item.id, label: item.nom });
    }
    return acc;
  }, []);
}

// 🔹 placeholder si liste vide
const withPlaceholder = (opts: Array<{ value: string | number; label: string }>) =>
  opts.length ? opts : [{ value: "", label: "—" }];

// 🔹 reset par défaut
function buildReset(values: FiltresFormationsValues): FiltresFormationsValues {
  return {
    ...values,
    texte: "",
    centre: undefined,
    statut: undefined,
    annee: undefined,
    type_offre: undefined,
    activite: undefined,
    dans: undefined, // 👈 nouveau filtre “période à venir”
    avec_archivees: false,
    page: 1,
  };
}

export default function FiltresFormationsPanel({
  filtres,
  values,
  onChange,
  onReset,
  onRefresh,
}: Props) {
  // 🔍 Gestion locale de la recherche texte
  const onLocalSearchChange = useCallback<React.ChangeEventHandler<HTMLInputElement>>(
    (e) => {
      onChange({ ...values, texte: e.target.value, page: 1 });
    },
    [onChange, values]
  );

  const onSearchKeyDown = useCallback<React.KeyboardEventHandler<HTMLInputElement>>(
    (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (values.texte) {
          onChange({ ...values, texte: "", page: 1 });
        }
      }
    },
    [onChange, values]
  );

  // 🧩 Construction dynamique des filtres
  const fields = useMemo<Array<FieldConfig<FiltresFormationsValues>>>(() => {
    if (!filtres) return [];

    return [
      {
        key: "centre",
        label: "🏫 Centre",
        type: "select",
        options: withPlaceholder(toOptionsUnique(filtres.centres)),
      },
      {
        key: "statut",
        label: "📍 Statut",
        type: "select",
        options: withPlaceholder(toOptionsUnique(filtres.statuts)),
      },
      {
        key: "type_offre",
        label: "📦 Type d'offre",
        type: "select",
        options: withPlaceholder(toOptionsUnique(filtres.type_offres)),
      },
      // ⏳ Nouveau filtre : période à venir
      {
        key: "dans" as const,
        label: "⏳ Période à venir",
        type: "select",
        tooltip: "Filtrer les formations à venir (dans les 4 semaines, 3 mois, etc.)",
        options: withPlaceholder([
          { value: "", label: "Toutes les périodes" },
          ...(filtres.periodes_a_venir?.map((p) => ({
            value: p.code,
            label: p.libelle,
          })) ?? []),
        ]),
      },

      {
        key: "annee" as const,
        label: "📆 Année",
        type: "select",
        options: [
          { value: "", label: "Toutes les années" },
          { value: 2023, label: "2023" },
          { value: 2024, label: "2024" },
          { value: 2025, label: "2025" },
          { value: 2026, label: "2026" },
        ],
      },

      // ⚙️ Filtre dynamique selon l’activité renvoyée par le backend
      {
        key: "activite" as const,
        label: "⚙️ Activité",
        type: "select",
        tooltip: "Filtrer selon l’état de la formation",
        options: withPlaceholder([
          { value: "", label: "Toutes" },
          ...(filtres.activites?.map((a) => ({
            value: a.code,
            label: a.libelle,
          })) ?? []),
        ]),
      },
      // 🗃️ Inclure les archivées (option de compatibilité)
      {
        key: "avec_archivees" as const,
        label: "🗃️ Inclure les archivées",
        type: "checkbox",
        tooltip: "Afficher aussi les formations archivées dans la liste",
      },
    ];
  }, [filtres]);

  // 🔁 Boutons d’action
  const actions = useMemo(
    () => ({
      onReset:
        onReset ??
        (() => {
          onChange(buildReset(values));
        }),
      onRefresh,
      resetLabel: "Réinitialiser",
      refreshLabel: "Rafraîchir",
    }),
    [onReset, onRefresh, onChange, values]
  );

  const ready = Boolean(filtres);

  if (!ready) {
    return (
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
    );
  }

  return (
    <>
      {/* 🔎 Recherche */}
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        mb={1.5}
        flexWrap={{ xs: "wrap", md: "nowrap" }}
      >
        <label htmlFor="formations-search-input" style={visuallyHidden as React.CSSProperties}>
          Rechercher des formations
        </label>
        <Typography component="span" id="formations-search-help" sx={visuallyHidden}>
          Tapez votre recherche. Appuyez sur Échap pour effacer.
        </Typography>

        <TextField
          id="formations-search-input"
          type="search"
          size="small"
          fullWidth
          value={values.texte ?? ""}
          onChange={onLocalSearchChange}
          onKeyDown={onSearchKeyDown}
          placeholder="🔎 Recherche (nom, centre, type, statut…)"
          inputProps={{
            "aria-describedby": "formations-search-help",
          }}
        />

        {values.texte && (
          <Button variant="outlined" onClick={() => onChange({ ...values, texte: "", page: 1 })}>
            ✕
          </Button>
        )}
      </Stack>

      {/* 📋 Filtres dynamiques */}
      <FilterTemplate<FiltresFormationsValues>
        values={values}
        onChange={(next) => onChange({ ...next, page: 1 })}
        fields={fields}
        actions={actions}
        cols={4}
      />
    </>
  );
}
