// src/pages/dashboard/widgets/appairages/AppairageGroupedTableWidget.tsx
import * as React from "react";
import {
  Card,
  Box,
  Typography,
  Select,
  MenuItem,
  TextField,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  IconButton,
  Button,
  useTheme,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArchiveIcon from "@mui/icons-material/Archive";
import {
  AppairageFilters,
  AppairageGroupBy,
  AppairageGroupRow,
  getErrorMessage,
  useAppairageGrouped,
} from "../../../types/appairageStats";

/* 🛠 Utils */
function fmtInt(n?: number | null): string {
  return n === undefined || n === null ? "—" : Math.round(n).toString();
}
function pct(ok: number, total: number): string {
  if (!total) return "—";
  const v = Math.max(0, Math.min(100, Math.round((ok * 100) / total)));
  return `${v}%`;
}
function toNumber(x: unknown): number {
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? n : 0;
}

/* 🔎 Résolution locale du label */
function resolveLabel(row: AppairageGroupRow, by: AppairageGroupBy): string {
  if (row.group_label) return String(row.group_label);
  switch (by) {
    case "centre":
      return (
        row["formation__centre__nom"] ??
        (row.formation__centre_id ? `Centre #${row.formation__centre_id}` : "—")
      );
    case "departement":
      return row.departement ?? "—";
    case "statut":
      return row.statut ?? "—";
    case "formation":
      return row.formation__nom ?? (row.formation_id ? `Formation #${row.formation_id}` : "—");
    case "partenaire":
      return row.partenaire__nom ?? (row.partenaire_id ? `Partenaire #${row.partenaire_id}` : "—");
    default:
      return "—";
  }
}

type NeededKey =
  | "transmis"
  | "en_attente"
  | "accepte"
  | "refuse"
  | "annule"
  | "a_faire"
  | "contrat_a_signer"
  | "contrat_en_attente"
  | "appairage_ok";
type RowWithNeeded = AppairageGroupRow & Partial<Record<NeededKey, number>>;

type Props = {
  defaultBy?: AppairageGroupBy;
  defaultFilters?: AppairageFilters;
  title?: string;
};

/* 🎯 Composant principal */
export default function AppairageGroupedTableWidget({
  defaultBy = "centre",
  defaultFilters,
  title = "Détails des Appairages",
}: Props) {
  const theme = useTheme();
  const [by, setBy] = React.useState<AppairageGroupBy>(defaultBy);
  const [filters, setFilters] = React.useState<AppairageFilters>(defaultFilters ?? {});
  const [includeArchived, setIncludeArchived] = React.useState(false);

  // ✅ Combine les filtres avec le flag "archivés"
  const filtersWithArchived = { ...filters, avec_archivees: includeArchived };
  const { data, isLoading, error, refetch } = useAppairageGrouped(by, filtersWithArchived);

  /* Agrégats totaux */
  const totals = React.useMemo(() => {
    const rows: RowWithNeeded[] = (data?.results as RowWithNeeded[]) ?? [];
    const sum = <K extends keyof RowWithNeeded>(key: K): number =>
      rows.reduce((acc, r) => acc + toNumber(r[key]), 0);

    const appairages_total = sum("appairages_total");
    const nb_candidats = sum("nb_candidats");
    const nb_partenaires = sum("nb_partenaires");
    const nb_formations = sum("nb_formations");
    const appairage_ok = sum("appairage_ok");

    return {
      appairages_total,
      nb_candidats,
      nb_partenaires,
      nb_formations,
      appairage_ok,
      taux_ok: appairages_total ? Math.round((appairage_ok * 100) / appairages_total) : 0,
      transmis: sum("transmis"),
      en_attente: sum("en_attente"),
      a_faire: sum("a_faire"),
      contrat_a_signer: sum("contrat_a_signer"),
      contrat_en_attente: sum("contrat_en_attente"),
      accepte: sum("accepte"),
      refuse: sum("refuse"),
      annule: sum("annule"),
    };
  }, [data]);

  // 🎨 Couleurs dynamiques
  const colorSuccess =
    theme.palette.mode === "dark" ? theme.palette.success.dark : theme.palette.success.light;
  const colorError =
    theme.palette.mode === "dark" ? theme.palette.error.dark : theme.palette.error.light;
  const colorWarning =
    theme.palette.mode === "dark" ? theme.palette.warning.dark : theme.palette.warning.light;
  const colorInfo =
    theme.palette.mode === "dark" ? theme.palette.info.dark : theme.palette.info.light;
  const colorHeader = theme.palette.mode === "dark" ? theme.palette.background.default : "#e3f2fd";
  const colorTotal =
    theme.palette.mode === "dark" ? theme.palette.grey[800] : theme.palette.grey[100];

  return (
    <Card sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Header */}
      <Box
        display="flex"
        flexWrap="wrap"
        justifyContent="space-between"
        alignItems="flex-end"
        gap={2}
      >
        <Typography variant="h6" fontWeight="bold">
          {title}
        </Typography>

        <Box display="flex" flexWrap="wrap" gap={1.5} alignItems="center">
          <Select
            size="small"
            value={by}
            onChange={(e) => setBy(e.target.value as AppairageGroupBy)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="centre">Par centre</MenuItem>
            <MenuItem value="departement">Par département</MenuItem>
            <MenuItem value="statut">Par statut</MenuItem>
            <MenuItem value="formation">Par formation</MenuItem>
            <MenuItem value="partenaire">Par partenaire</MenuItem>
          </Select>

          <TextField
            size="small"
            placeholder="Dépt (ex: 92)"
            value={filters.departement ?? ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                departement: e.target.value || undefined,
              }))
            }
            sx={{ minWidth: 100 }}
          />

          {/* Bouton Archivées */}
          <Button
            size="small"
            variant={includeArchived ? "contained" : "outlined"}
            color={includeArchived ? "secondary" : "inherit"}
            onClick={() => setIncludeArchived((v) => !v)}
            startIcon={<ArchiveIcon fontSize="small" />}
          >
            {includeArchived ? "Retirer archivées" : "Ajouter archivées"}
          </Button>

          {/* Bouton de rafraîchissement */}
          <IconButton onClick={() => refetch()} title="Rafraîchir">
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Table */}
      {isLoading ? (
        <Typography variant="body2" color="text.secondary">
          Chargement…
        </Typography>
      ) : error ? (
        <Typography variant="body2" color="error">
          Erreur : {getErrorMessage(error)}
        </Typography>
      ) : !data ? null : (
        <TableContainer sx={{ maxHeight: "70vh" }}>
          <Table stickyHeader size="small" sx={{ minWidth: 1200 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: colorHeader }}>
                <TableCell>Groupe</TableCell>
                <TableCell>Appairages</TableCell>
                <TableCell>Candidats</TableCell>
                <TableCell>Partenaires</TableCell>
                <TableCell>Formations</TableCell>
                <TableCell>Taux OK</TableCell>
                <TableCell>Transmis</TableCell>
                <TableCell>En attente</TableCell>
                <TableCell>À faire</TableCell>
                <TableCell>Contrat à signer</TableCell>
                <TableCell>Contrat en attente</TableCell>
                <TableCell>Acceptés</TableCell>
                <TableCell>Refusés</TableCell>
                <TableCell>Annulés</TableCell>
                <TableCell>OK</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {data.results.map((r, idx) => {
                const rr = r as RowWithNeeded;
                const total = toNumber(rr.appairages_total);
                const ok = toNumber(rr.appairage_ok);

                const taux = total ? (ok * 100) / total : 0;
                const tauxColor =
                  taux >= 60
                    ? theme.palette.success.main
                    : taux >= 30
                      ? theme.palette.warning.main
                      : theme.palette.error.main;

                return (
                  <TableRow key={idx} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{resolveLabel(r, by)}</TableCell>
                    <TableCell align="right">{fmtInt(total)}</TableCell>
                    <TableCell align="right">{fmtInt(rr.nb_candidats)}</TableCell>
                    <TableCell align="right">{fmtInt(rr.nb_partenaires)}</TableCell>
                    <TableCell align="right">{fmtInt(rr.nb_formations)}</TableCell>
                    <TableCell align="right" sx={{ color: tauxColor, fontWeight: 600 }}>
                      {pct(ok, total)}
                    </TableCell>
                    <TableCell align="right">{fmtInt(rr.transmis)}</TableCell>
                    <TableCell align="right">{fmtInt(rr.en_attente)}</TableCell>
                    <TableCell align="right">{fmtInt(rr.a_faire)}</TableCell>
                    <TableCell align="right">{fmtInt(rr.contrat_a_signer)}</TableCell>
                    <TableCell align="right">{fmtInt(rr.contrat_en_attente)}</TableCell>
                    <TableCell align="right" sx={{ bgcolor: colorSuccess, fontWeight: 600 }}>
                      {fmtInt(rr.accepte)}
                    </TableCell>
                    <TableCell align="right" sx={{ bgcolor: colorError, fontWeight: 600 }}>
                      {fmtInt(rr.refuse)}
                    </TableCell>
                    <TableCell align="right" sx={{ bgcolor: colorWarning, fontWeight: 600 }}>
                      {fmtInt(rr.annule)}
                    </TableCell>
                    <TableCell align="right" sx={{ bgcolor: colorInfo, fontWeight: 600 }}>
                      {fmtInt(rr.appairage_ok)}
                    </TableCell>
                  </TableRow>
                );
              })}

              {/* Totaux */}
              <TableRow sx={{ bgcolor: colorTotal, fontWeight: 700 }}>
                <TableCell>Total</TableCell>
                <TableCell align="right">{fmtInt(totals.appairages_total)}</TableCell>
                <TableCell align="right">{fmtInt(totals.nb_candidats)}</TableCell>
                <TableCell align="right">{fmtInt(totals.nb_partenaires)}</TableCell>
                <TableCell align="right">{fmtInt(totals.nb_formations)}</TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontWeight: 700,
                    color:
                      totals.taux_ok >= 60
                        ? theme.palette.success.main
                        : totals.taux_ok >= 30
                          ? theme.palette.warning.main
                          : theme.palette.error.main,
                  }}
                >
                  {totals.appairages_total ? `${totals.taux_ok}%` : "—"}
                </TableCell>
                <TableCell align="right">{fmtInt(totals.transmis)}</TableCell>
                <TableCell align="right">{fmtInt(totals.en_attente)}</TableCell>
                <TableCell align="right">{fmtInt(totals.a_faire)}</TableCell>
                <TableCell align="right">{fmtInt(totals.contrat_a_signer)}</TableCell>
                <TableCell align="right">{fmtInt(totals.contrat_en_attente)}</TableCell>
                <TableCell align="right">{fmtInt(totals.accepte)}</TableCell>
                <TableCell align="right">{fmtInt(totals.refuse)}</TableCell>
                <TableCell align="right">{fmtInt(totals.annule)}</TableCell>
                <TableCell align="right">{fmtInt(totals.appairage_ok)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Card>
  );
}
