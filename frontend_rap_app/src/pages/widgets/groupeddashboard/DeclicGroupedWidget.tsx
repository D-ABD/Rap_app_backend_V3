// -----------------------------------------------------------------------------
// 📊 DeclicGroupedWidget — version corrigée et complète (Atelier 1, rétention, totaux justes)
// -----------------------------------------------------------------------------
import * as React from "react";
import { Card, CardHeader, CardContent, Typography, Box, Button, IconButton, useTheme } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import type { AppTheme } from "../../../theme";

import {
  DECLIC_TYPE_LABELS,
  DeclicFilters,
  DeclicGroupBy,
  DeclicGroupRow,
  getErrorMessage,
  resolveGroupLabel,
  useDeclicGrouped,
} from "src/types/declicStats"; // ✅ veille à pointer vers ton fichier dans src/api ou src/hooks selon ton projet

// 🔹 Helpers d’affichage
const fmt = (n?: number | null) => (n === undefined || n === null ? "—" : Math.round(n).toString());

type DeclicTypeKey = keyof typeof DECLIC_TYPE_LABELS;

export default function DeclicGroupedWidget() {
  const theme = useTheme<AppTheme>();
  const initialRef = React.useRef<DeclicFilters>({
    annee: new Date().getFullYear(),
  });

  const [by, setBy] = React.useState<DeclicGroupBy>("centre");
  const [filters, setFilters] = React.useState<DeclicFilters>(initialRef.current);

  const { data: grouped, isLoading, error, refetch } = useDeclicGrouped(by, filters);

  const { data: centresGrouped } = useDeclicGrouped("centre", {
    ...filters,
    centre: undefined,
  });

  // 🔹 Options de sélection de centre
  const centreOptions = React.useMemo(
    () =>
      (centresGrouped?.results ?? [])
        .map((r: DeclicGroupRow) => {
          const id =
            typeof r.group_key === "number" || typeof r.group_key === "string"
              ? r.group_key
              : undefined;
          return id != null ? { id, label: resolveGroupLabel(r) } : null;
        })
        .filter(Boolean) as Array<{ id: number | string; label: string }>,
    [centresGrouped]
  );

  const declicTypeEntries = React.useMemo(
    () => Object.entries(DECLIC_TYPE_LABELS) as Array<[DeclicTypeKey, string]>,
    []
  );

  const isDirty = React.useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(initialRef.current),
    [filters]
  );
  const tableHeaderBackground =
    theme.palette.mode === "light"
      ? theme.custom.table.header.background.light
      : theme.custom.table.header.background.dark;
  const tableRowTotalBackground =
    theme.palette.mode === "light"
      ? theme.custom.table.row.stripedEven.light
      : theme.custom.table.row.stripedEven.dark;

  const reset = () => setFilters(initialRef.current);

  // ============================================================
  // 🔢 Recalcule les totaux et les taux globalement cohérents
  // ============================================================
  const resultsWithTotal = React.useMemo(() => {
    if (!grouped?.results?.length) return [];

    const sum = (fn: (r: DeclicGroupRow) => number | null | undefined) =>
      grouped.results.reduce((acc, r) => acc + (fn(r) ?? 0), 0);

    const nbAt1 = sum((r) => r.nb_presents_declic); // 🧩 Référence Atelier 1 = “total accueillis”
    const nbAt6 = sum((r) => r.nb_absents_declic); // on utilisera pour le taux rétention si dispo

    const totalRow: DeclicGroupRow = {
      group_key: "total",
      total: nbAt1,
      nb_inscrits_declic: sum((r) => r.nb_inscrits_declic),
      nb_presents_declic: nbAt1,
      nb_absents_declic: nbAt6,
      taux_presence_declic: null,
      taux_retention: nbAt1 > 0 && nbAt6 > 0 ? (nbAt6 / nbAt1) * 100 : null, // 🧮 taux rétention global
    };

    return [...grouped.results, totalRow];
  }, [grouped]);

  return (
    <Card>
      <CardHeader
        title={
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              Activités Déclic — Statistiques groupées
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Par centre / département / type d’activité (basées sur Atelier 1)
            </Typography>
          </Box>
        }
        action={
          <Box display="flex" flexWrap="wrap" gap={1.5} alignItems="flex-end">
            {/* Regrouper par */}
            <Box display="flex" flexDirection="column" gap={0.5}>
              <Typography variant="caption" color="text.secondary">
                Regrouper par
              </Typography>
              <select
                value={by}
                onChange={(e) => setBy(e.target.value as DeclicGroupBy)}
                style={{ padding: "6px 10px", borderRadius: 6 }}
              >
                <option value="centre">Par centre</option>
                <option value="departement">Par département</option>
                <option value="type_declic">Par type d’activité</option>
              </select>
            </Box>

            {/* Type Déclic */}
            <Box display="flex" flexDirection="column" gap={0.5}>
              <Typography variant="caption" color="text.secondary">
                Type d’activité
              </Typography>
              <select
                value={(filters.type_declic as string) ?? ""}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    type_declic: e.target.value || undefined,
                  }))
                }
                style={{ padding: "6px 10px", borderRadius: 6 }}
              >
                <option value="">Tous</option>
                {declicTypeEntries.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </Box>

            {/* Centre */}
            <Box display="flex" flexDirection="column" gap={0.5}>
              <Typography variant="caption" color="text.secondary">
                Centre
              </Typography>
              <select
                value={filters.centre ?? ""}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    centre: e.target.value || undefined,
                  }))
                }
                style={{ padding: "6px 10px", borderRadius: 6 }}
              >
                <option value="">Tous</option>
                {centreOptions.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Box>

            <Button variant="outlined" size="small" onClick={reset} disabled={!isDirty}>
              Réinitialiser
            </Button>

            <IconButton onClick={() => refetch()} title="Rafraîchir">
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Box>
        }
      />

      <CardContent>
        {isLoading ? (
          <Typography color="text.secondary">Chargement…</Typography>
        ) : error ? (
          <Typography color="error">Erreur : {getErrorMessage(error)}</Typography>
        ) : !grouped ? null : (
          <Box sx={{ overflowX: "auto", maxHeight: "70vh" }}>
            <table
              style={{
                width: "100%",
                minWidth: 1200,
                borderCollapse: "collapse",
                fontSize: "0.9rem",
              }}
            >
              <thead>
                <tr style={{ background: tableHeaderBackground }}>
                  <th style={{ textAlign: "left", padding: "8px" }}>Groupe</th>
                  <th>Présents (IC)</th>
                  <th>Absents (IC)</th>
                  <th>Adhésions</th>
                  <th>Taux adhésion %</th>
                  <th>Présents (Atelier 1)</th>
                  <th>Absents (Atelier 6)</th>
                  <th>Taux présence IC %</th>
                  <th>Taux présence ateliers %</th>
                  <th>Taux rétention (At1→At6)</th>
                  <th>Total global</th>
                </tr>
              </thead>
              <tbody>
                {resultsWithTotal.map((r, idx) => {
                  const isTotal =
                    typeof r.group_key === "string" && r.group_key.toLowerCase() === "total";
                  return (
                    <tr
                      key={idx}
                      style={{
                        background: isTotal ? tableRowTotalBackground : undefined,
                        fontWeight: isTotal ? 700 : 500,
                      }}
                    >
                      <td style={{ padding: "6px 8px" }}>
                        {isTotal ? "Total" : resolveGroupLabel(r)}
                      </td>
                      <td style={{ background: theme.palette.success.light }}>{fmt(r.nb_presents_declic)}</td>
                      <td style={{ background: theme.palette.error.light }}>{fmt(r.nb_absents_declic)}</td>

                      <td style={{ background: theme.palette.info.light }}>
                        {r.taux_presence_declic != null
                          ? `${r.taux_presence_declic.toFixed(1)} %`
                          : "—"}
                      </td>
                      <td style={{ background: theme.palette.secondary.light }}>
                        {r.taux_retention != null ? `${r.taux_retention.toFixed(1)} %` : "—"}
                      </td>
                      <td style={{ fontWeight: isTotal ? 700 : 500 }}>{fmt(r.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {grouped.results.length === 0 && (
              <Typography color="text.secondary" sx={{ p: 2 }}>
                Aucun résultat pour les filtres sélectionnés.
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
