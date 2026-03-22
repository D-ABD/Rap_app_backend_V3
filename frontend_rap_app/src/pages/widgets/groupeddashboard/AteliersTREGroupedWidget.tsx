import * as React from "react";
import { Card, CardHeader, CardContent, Typography, Box, Button, IconButton } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  ATELIER_TYPE_LABELS,
  AtelierTREFilters,
  AtelierTREGroupBy,
  AtelierTREGroupRow,
  getErrorMessage,
  resolveGroupLabel,
  useAtelierTREGrouped,
} from "../../../types/atelierTreStats";

const fmt = (n?: number | null) => (n === undefined || n === null ? "—" : Math.round(n).toString());

type AtelierTypeKey = keyof typeof ATELIER_TYPE_LABELS;

export default function AteliersTREGroupedWidget() {
  const initialRef = React.useRef<AtelierTREFilters>({});
  const [by, setBy] = React.useState<AtelierTREGroupBy>("centre");
  const [filters, setFilters] = React.useState<AtelierTREFilters>(initialRef.current);

  const { data: grouped, isLoading, error, refetch } = useAtelierTREGrouped(by, filters);

  // Centres
  const { data: centresGrouped } = useAtelierTREGrouped("centre", {
    ...filters,
    centre: undefined,
  });

  const centreOptions = React.useMemo(
    () =>
      (centresGrouped?.results ?? [])
        .map((r: AtelierTREGroupRow) => {
          const id =
            (typeof r.centre_id === "number" ? r.centre_id : undefined) ??
            (typeof r.group_key === "number" || typeof r.group_key === "string"
              ? r.group_key
              : undefined);
          return id != null ? { id, label: resolveGroupLabel(r) } : null;
        })
        .filter(Boolean) as Array<{ id: number | string; label: string }>,
    [centresGrouped]
  );

  const atelierTypeEntries = React.useMemo(
    () => Object.entries(ATELIER_TYPE_LABELS) as Array<[AtelierTypeKey, string]>,
    []
  );

  const isDirty = React.useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(initialRef.current),
    [filters]
  );

  const reset = () => setFilters(initialRef.current);

  // Ajout d'une ligne de total si non présente
  const resultsWithTotal = React.useMemo(() => {
    if (!grouped?.results) return [];
    const alreadyHasTotal = grouped.results.some(
      (r) => String(r.group_key).toLowerCase() === "total"
    );
    if (alreadyHasTotal) return grouped.results;

    const totalRow: AtelierTREGroupRow = {
      group_key: "total",
      nb_ateliers: grouped.results.reduce((acc, r) => acc + (r.nb_ateliers ?? 0), 0),
      candidats_uniques: grouped.results.reduce((acc, r) => acc + (r.candidats_uniques ?? 0), 0),
      presences_total: grouped.results.reduce((acc, r) => acc + (r.presences_total ?? 0), 0),
      present: grouped.results.reduce((acc, r) => acc + (r.present ?? 0), 0),
      absent: grouped.results.reduce((acc, r) => acc + (r.absent ?? 0), 0),
      excuse: grouped.results.reduce((acc, r) => acc + (r.excuse ?? 0), 0),
      inconnu: grouped.results.reduce((acc, r) => acc + (r.inconnu ?? 0), 0),
      taux_presence: (() => {
        const present = grouped.results.reduce((acc, r) => acc + (r.present ?? 0), 0);
        const denom = grouped.results.reduce(
          (acc, r) => acc + (r.present ?? 0) + (r.absent ?? 0) + (r.excuse ?? 0),
          0
        );
        return denom > 0 ? Math.round((present / denom) * 1000) / 10 : null;
      })(),
    };
    return [...grouped.results, totalRow];
  }, [grouped]);

  return (
    <Card>
      <CardHeader
        title={
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              Ateliers TRE — Groupés
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Par centre / département / type d’atelier
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
                onChange={(e) => setBy(e.target.value as AtelierTREGroupBy)}
                style={{ padding: "6px 10px", borderRadius: 6 }}
              >
                <option value="centre">Par centre</option>
                <option value="departement">Par département</option>
                <option value="type_atelier">Par type d’atelier</option>
              </select>
            </Box>

            {/* Type atelier */}
            <Box display="flex" flexDirection="column" gap={0.5}>
              <Typography variant="caption" color="text.secondary">
                Type d’atelier
              </Typography>
              <select
                value={(filters.type_atelier as string) ?? ""}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    type_atelier: e.target.value || undefined,
                  }))
                }
                style={{ padding: "6px 10px", borderRadius: 6 }}
              >
                <option value="">Tous</option>
                {atelierTypeEntries.map(([key, label]) => (
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

            {/* Bouton de rafraîchissement */}
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
          <Typography color="error">Erreur: {getErrorMessage(error)}</Typography>
        ) : !grouped ? null : (
          <Box sx={{ overflowX: "auto", maxHeight: "70vh" }}>
            <table
              style={{
                width: "100%",
                minWidth: 950,
                borderCollapse: "collapse",
                fontSize: "0.9rem",
              }}
            >
              <thead>
                <tr style={{ background: "#e3f2fd" }}>
                  <th style={{ textAlign: "left", padding: "8px" }}>Groupe</th>
                  <th>Ateliers</th>
                  <th>Candidats uniques</th>
                  <th>Présences total</th>
                  <th>Présent</th>
                  <th>Absent</th>
                  <th>Excusé</th>
                  <th>Non renseigné</th>
                  <th>Taux de présence %</th>
                </tr>
              </thead>
              <tbody>
                {resultsWithTotal.map((r: AtelierTREGroupRow, idx: number) => {
                  const isTotal = String(r.group_key).toLowerCase() === "total";
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
                      <td>{fmt(r.nb_ateliers)}</td>
                      <td>{fmt(r.candidats_uniques)}</td>
                      <td>{fmt(r.presences_total)}</td>
                      <td style={{ background: "#c8e6c9" }}>{fmt(r.present)}</td>
                      <td style={{ background: "#ffcdd2" }}>{fmt(r.absent)}</td>
                      <td style={{ background: "#ffe0b2" }}>{fmt(r.excuse)}</td>
                      <td style={{ background: "#e0e0e0" }}>{fmt(r.inconnu)}</td>
                      <td style={{ background: "#bbdefb" }}>
                        {r.taux_presence != null ? `${r.taux_presence.toFixed(1)} %` : "—"}
                      </td>
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

export { AteliersTREGroupedWidget as G };
