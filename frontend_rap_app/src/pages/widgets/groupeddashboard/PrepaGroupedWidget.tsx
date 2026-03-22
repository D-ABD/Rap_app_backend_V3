// -----------------------------------------------------------------------------
// 📊 PrepaGroupedWidget — statistiques groupées Prépa (corrigé, sans objectifs)
// -----------------------------------------------------------------------------
import * as React from "react";
import { Card, CardHeader, CardContent, Typography, Box, Button, IconButton } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";

import {
  PREPA_TYPE_LABELS,
  PrepaFilters,
  PrepaGroupBy,
  PrepaGroupRow,
  getErrorMessage,
  resolveGroupLabel,
  usePrepaGrouped,
} from "src/types/prepaStats";

// 🔹 Helpers
const fmt = (n?: number | null) => (n === undefined || n === null ? "—" : Math.round(n).toString());

type PrepaTypeKey = keyof typeof PREPA_TYPE_LABELS;

export default function PrepaGroupedWidget() {
  const initialRef = React.useRef<PrepaFilters>({
    annee: new Date().getFullYear(),
  });

  const [by, setBy] = React.useState<PrepaGroupBy>("centre");
  const [filters, setFilters] = React.useState<PrepaFilters>(initialRef.current);

  const { data: grouped, isLoading, error, refetch } = usePrepaGrouped(by, filters);

  const { data: centresGrouped } = usePrepaGrouped("centre", {
    ...filters,
    centre: undefined,
  });

  // 🔹 Options centre
  const centreOptions = React.useMemo(
    () =>
      (centresGrouped?.results ?? [])
        .map((r: PrepaGroupRow) => {
          const id =
            typeof r.group_key === "number" || typeof r.group_key === "string"
              ? r.group_key
              : undefined;
          return id != null ? { id, label: resolveGroupLabel(r) } : null;
        })
        .filter(Boolean) as Array<{ id: number | string; label: string }>,
    [centresGrouped]
  );

  const prepaTypeEntries = React.useMemo(
    () => Object.entries(PREPA_TYPE_LABELS) as Array<[PrepaTypeKey, string]>,
    []
  );

  const isDirty = React.useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(initialRef.current),
    [filters]
  );

  const reset = () => setFilters(initialRef.current);

  // 🔢 Totaux globaux
  const resultsWithTotal = React.useMemo(() => {
    if (!grouped?.results?.length) return [];

    const sum = (fn: (r: PrepaGroupRow) => number | null | undefined) =>
      grouped.results.reduce((acc, r) => acc + (fn(r) ?? 0), 0);

    const totalInscrits = sum((r) => r.nb_inscrits_prepa);
    const totalPresents = sum((r) => r.nb_presents_prepa);
    const totalAbsents = sum((r) => r.nb_absents_prepa);

    const totalRow: PrepaGroupRow = {
      group_key: "total",
      total: totalPresents,
      nb_inscrits_prepa: totalInscrits,
      nb_presents_prepa: totalPresents,
      nb_absents_prepa: totalAbsents,
      nb_presents_info: 0,
      nb_absents_info: 0,
      nb_adhesions: 0,
      taux_presence_info: null,
      taux_adhesion: null,
      taux_presence_prepa: totalInscrits > 0 ? (totalPresents / totalInscrits) * 100 : null,
      taux_retention: null,
    };

    return [...grouped.results, totalRow];
  }, [grouped]);

  return (
    <Card>
      <CardHeader
        title={
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              Activités Prépa — Statistiques groupées
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Par centre / département / type d’activité
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
                onChange={(e) => setBy(e.target.value as PrepaGroupBy)}
                style={{ padding: "6px 10px", borderRadius: 6 }}
              >
                <option value="centre">Par centre</option>
                <option value="departement">Par département</option>
                <option value="type_prepa">Par type d’activité</option>
              </select>
            </Box>

            {/* Type Prepa */}
            <Box display="flex" flexDirection="column" gap={0.5}>
              <Typography variant="caption" color="text.secondary">
                Type Prépa
              </Typography>
              <select
                value={(filters.type_prepa as string) ?? ""}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    type_prepa: e.target.value || undefined,
                  }))
                }
                style={{ padding: "6px 10px", borderRadius: 6 }}
              >
                <option value="">Tous</option>
                {prepaTypeEntries.map(([key, label]) => (
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
                minWidth: 1000,
                borderCollapse: "collapse",
                fontSize: "0.9rem",
              }}
            >
              <thead>
                <tr style={{ background: "#e3f2fd" }}>
                  <th style={{ textAlign: "left", padding: "8px" }}>Groupe</th>
                  <th>Inscrits</th>
                  <th>Présents</th>
                  <th>Absents</th>
                  <th>Taux présence %</th>
                  <th>Taux adhésion IC %</th>
                  <th>Taux rétention</th>
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
                        background: isTotal ? "#f5f5f5" : undefined,
                        fontWeight: isTotal ? 700 : 500,
                      }}
                    >
                      <td style={{ padding: "6px 8px" }}>
                        {isTotal ? "Total" : resolveGroupLabel(r)}
                      </td>

                      <td style={{ background: "#fff9c4" }}>{fmt(r.nb_inscrits_prepa)}</td>
                      <td style={{ background: "#c8e6c9" }}>{fmt(r.nb_presents_prepa)}</td>
                      <td style={{ background: "#ffcdd2" }}>{fmt(r.nb_absents_prepa)}</td>

                      <td style={{ background: "#bbdefb" }}>
                        {r.taux_presence_prepa != null
                          ? `${r.taux_presence_prepa.toFixed(1)} %`
                          : "—"}
                      </td>

                      <td style={{ background: "#fff9c4" }}>
                        {r.taux_adhesion != null ? `${r.taux_adhesion.toFixed(1)} %` : "—"}
                      </td>

                      <td style={{ background: "#d1c4e9" }}>
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
