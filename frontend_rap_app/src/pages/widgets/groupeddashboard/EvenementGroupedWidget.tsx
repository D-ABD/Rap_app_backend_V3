import * as React from "react";
import {
  Box,
  Card,
  IconButton,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import type { AppTheme } from "../../../theme";
import {
  EvenementGroupBy,
  EvenementGroupRow,
  EvenementStatsFilters,
  getErrorMessage,
  resolveEvenementGroupLabel,
  useEvenementGrouped,
} from "../../../types/evenementStats";

function toFixed0(n?: number | null) {
  return n === undefined || n === null ? "—" : Math.round(n).toString();
}

const isEvenementGroupBy = (v: string): v is EvenementGroupBy =>
  ["centre", "formation", "type", "statut"].includes(v);

type Props = {
  title?: string;
  initialBy?: EvenementGroupBy;
  initialFilters?: EvenementStatsFilters;
};

export default function EvenementGroupedWidget({
  title = "Détail des Événements",
  initialBy = "centre",
  initialFilters,
}: Props) {
  const theme = useTheme<AppTheme>();
  const [by, setBy] = React.useState<EvenementGroupBy>(initialBy);
  const [filters, setFilters] = React.useState<EvenementStatsFilters>(initialFilters ?? {});

  const { data, isLoading, error, refetch } = useEvenementGrouped(by, filters);

  const rows = React.useMemo<EvenementGroupRow[]>(() => data?.results ?? [], [data]);
  const tableHeaderBackground =
    theme.palette.mode === "light"
      ? theme.custom.table.header.background.light
      : theme.custom.table.header.background.dark;

  return (
    <Card sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      <Box display="flex" flexWrap="wrap" justifyContent="space-between" alignItems="flex-end" gap={2}>
        <Typography variant="subtitle1" fontWeight="bold">
          {title}
        </Typography>

        <Box display="flex" flexWrap="wrap" gap={1} alignItems="center">
          <Select
            size="small"
            value={by}
            onChange={(e) => {
              const value = e.target.value;
              if (isEvenementGroupBy(value)) setBy(value);
            }}
            sx={{ minWidth: 170 }}
          >
            <MenuItem value="centre">Par centre</MenuItem>
            <MenuItem value="formation">Par formation</MenuItem>
            <MenuItem value="type">Par type</MenuItem>
            <MenuItem value="statut">Par statut temporel</MenuItem>
          </Select>

          <TextField
            size="small"
            placeholder="Centre ID"
            value={filters.centre ?? ""}
            onChange={(e) => setFilters((prev) => ({ ...prev, centre: e.target.value || undefined }))}
          />
          <TextField
            size="small"
            placeholder="Formation ID"
            value={filters.formation ?? ""}
            onChange={(e) => setFilters((prev) => ({ ...prev, formation: e.target.value || undefined }))}
          />

          <IconButton onClick={() => refetch()} title="Rafraîchir">
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {isLoading ? (
        <Typography variant="body2" color="text.secondary">
          Chargement…
        </Typography>
      ) : error ? (
        <Typography variant="body2" color="error">
          Erreur: {getErrorMessage(error)}
        </Typography>
      ) : (
        <Box sx={{ overflowX: "auto", maxHeight: "70vh" }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ bgcolor: tableHeaderBackground }}>
                <TableCell>Groupe</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Aujourd'hui</TableCell>
                <TableCell>Bientôt</TableCell>
                <TableCell>À venir</TableCell>
                <TableCell>Passés</TableCell>
                <TableCell>Sans date</TableCell>
                <TableCell>Participants prévus</TableCell>
                <TableCell>Participants réels</TableCell>
                <TableCell>Taux moyen</TableCell>
                <TableCell>Taux global</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={idx} hover>
                  <TableCell>{resolveEvenementGroupLabel(row, by)}</TableCell>
                  <TableCell>{toFixed0(row.total)}</TableCell>
                  <TableCell>{toFixed0(row.aujourd_hui)}</TableCell>
                  <TableCell>{toFixed0(row.bientot)}</TableCell>
                  <TableCell>{toFixed0(row.a_venir)}</TableCell>
                  <TableCell>{toFixed0(row.passes)}</TableCell>
                  <TableCell>{toFixed0(row.sans_date)}</TableCell>
                  <TableCell>{toFixed0(row.participants_prevus)}</TableCell>
                  <TableCell>{toFixed0(row.participants_reels)}</TableCell>
                  <TableCell>{Math.round(row.taux_moyen_participation ?? 0)}%</TableCell>
                  <TableCell>{Math.round(row.taux_remplissage_global ?? 0)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Card>
  );
}
