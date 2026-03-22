import * as React from "react";
import {
  getErrorMessage,
  ProspectionFilters,
  ProspectionGroupBy,
  ProspectionGroupRow,
  resolveProspectionGroupLabel,
  useProspectionGrouped,
} from "../../../types/prospectionStats";
import {
  Card,
  Box,
  Typography,
  Select,
  MenuItem,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  TextField,
  Button,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArchiveIcon from "@mui/icons-material/Archive";

/* 🛠 Utils */
function toFixed0(n?: number | null) {
  return n === undefined || n === null ? "—" : Math.round(n).toString();
}

const isProspectionGroupBy = (v: string): v is ProspectionGroupBy =>
  [
    "centre",
    "departement",
    "owner",
    "formation",
    "partenaire",
    "statut",
    "objectif",
    "motif",
    "type",
  ].includes(v);

const n = (x: unknown): number => (typeof x === "number" ? x : Number(x ?? 0)) || 0;

const numOrU = (x: unknown): number | undefined => {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  const k = Number(x);
  return Number.isFinite(k) ? k : undefined;
};

const strOrU = (x: unknown): string | undefined => (typeof x === "string" ? x : undefined);

function normalizeRow(u: unknown): ProspectionGroupRow {
  const r = (u ?? {}) as Record<string, unknown>;
  const total = n(r["total"]);
  const acceptees = n(r["acceptees"]);
  const tauxFromApi = typeof r["taux_acceptation"] === "number" ? r["taux_acceptation"] : undefined;
  const tauxFallback = total > 0 ? (acceptees / total) * 100 : 0;

  return {
    group_key:
      (r["group_key"] as string | number | null | undefined) ??
      (r["id"] as string | number | null | undefined),
    group_label: strOrU(r["group_label"]),
    centre_id: numOrU(r["centre_id"]),
    centre__nom: strOrU(r["centre__nom"]),
    departement: strOrU(r["departement"]),
    formation_id: numOrU(r["formation_id"]),
    formation__nom: strOrU(r["formation__nom"]),
    formation__num_offre: strOrU(r["formation__num_offre"]),
    formation__centre__nom: strOrU(r["formation__centre__nom"]),
    partenaire_id: numOrU(r["partenaire_id"]),
    partenaire__nom: strOrU(r["partenaire__nom"]),
    total,
    actives: n(r["actives"]),
    a_relancer: n(r["a_relancer"]),
    en_cours: n(r["en_cours"]),
    a_faire: n(r["a_faire"]),
    a_relancer_statut: n(r["a_relancer_statut"]),
    acceptees,
    refusees: n(r["refusees"]),
    annulees: n(r["annulees"]),
    non_renseigne: n(r["non_renseigne"]),
    taux_acceptation: tauxFromApi ?? tauxFallback,
  };
}

/* 🎯 Props */
type Props = {
  title?: string;
  initialBy?: ProspectionGroupBy;
  initialFilters?: ProspectionFilters;
};

/* 🎯 Composant principal */
export default function ProspectionGroupedWidget({
  title = "Détail des Prospections",
  initialBy = "centre",
  initialFilters,
}: Props) {
  const [by, setBy] = React.useState<ProspectionGroupBy>(initialBy);
  const [filters, setFilters] = React.useState<ProspectionFilters>(initialFilters ?? {});

  const includeArchived = Boolean(filters.avec_archivees);

  const { data: grouped, isLoading, error, refetch } = useProspectionGrouped(by, filters);

  const rows = React.useMemo<ProspectionGroupRow[]>(
    () => (grouped?.results ?? []).map(normalizeRow),
    [grouped]
  );

  // Ajout d'une ligne Total si absente
  const rowsWithTotal = React.useMemo(() => {
    if (!rows.length) return rows;
    const hasTotal = rows.some((r) => String(r.group_key).toLowerCase() === "total");
    if (hasTotal) return rows;

    const totalRow: ProspectionGroupRow = {
      group_key: "total",
      total: rows.reduce((a, r) => a + (r.total ?? 0), 0),
      actives: rows.reduce((a, r) => a + (r.actives ?? 0), 0),
      a_relancer: rows.reduce((a, r) => a + (r.a_relancer ?? 0), 0),
      en_cours: rows.reduce((a, r) => a + (r.en_cours ?? 0), 0),
      a_faire: rows.reduce((a, r) => a + (r.a_faire ?? 0), 0),
      a_relancer_statut: rows.reduce((a, r) => a + (r.a_relancer_statut ?? 0), 0),
      acceptees: rows.reduce((a, r) => a + (r.acceptees ?? 0), 0),
      refusees: rows.reduce((a, r) => a + (r.refusees ?? 0), 0),
      annulees: rows.reduce((a, r) => a + (r.annulees ?? 0), 0),
      non_renseigne: rows.reduce((a, r) => a + (r.non_renseigne ?? 0), 0),
      taux_acceptation:
        (rows.reduce((a, r) => a + (r.acceptees ?? 0), 0) /
          Math.max(
            1,
            rows.reduce((a, r) => a + (r.total ?? 0), 0)
          )) *
        100,
    } as ProspectionGroupRow;
    return [...rows, totalRow];
  }, [rows]);

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
        <Typography variant="subtitle1" fontWeight="bold">
          {title}
        </Typography>

        <Box display="flex" flexWrap="wrap" gap={1} alignItems="center">
          <Select
            size="small"
            value={by}
            onChange={(e) => {
              const v = e.target.value;
              if (isProspectionGroupBy(v)) setBy(v);
            }}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="centre">Par centre</MenuItem>
            <MenuItem value="departement">Par département</MenuItem>
            <MenuItem value="owner">Par responsable</MenuItem>
            <MenuItem value="formation">Par formation</MenuItem>
            <MenuItem value="partenaire">Par partenaire</MenuItem>
            <MenuItem value="statut">Par statut</MenuItem>
            <MenuItem value="objectif">Par objectif</MenuItem>
            <MenuItem value="motif">Par motif</MenuItem>
            <MenuItem value="type">Par type</MenuItem>
          </Select>

          <TextField
            size="small"
            placeholder="Centre ID"
            value={filters.centre ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, centre: e.target.value || undefined }))}
          />
          <TextField
            size="small"
            placeholder="Dépt ex: 92"
            value={filters.departement ?? ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                departement: e.target.value || undefined,
              }))
            }
          />

          {/* 🔘 Bouton Archivées */}
          <Button
            size="small"
            variant={includeArchived ? "contained" : "outlined"}
            color={includeArchived ? "secondary" : "inherit"}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                avec_archivees: f.avec_archivees ? undefined : true,
              }))
            }
            startIcon={<ArchiveIcon fontSize="small" />}
          >
            {includeArchived ? "Retirer archivées" : "Ajouter archivées"}
          </Button>

          {/* Bouton rafraîchir */}
          <IconButton onClick={() => refetch()} title="Rafraîchir">
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Content */}
      {isLoading ? (
        <Typography variant="body2" color="text.secondary">
          Chargement…
        </Typography>
      ) : error ? (
        <Typography variant="body2" color="error">
          Erreur: {getErrorMessage(error)}
        </Typography>
      ) : grouped ? (
        <Box sx={{ overflowX: "auto", maxHeight: "70vh" }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ bgcolor: "#e3f2fd" }}>
                <TableCell>Groupe</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Actives</TableCell>
                <TableCell>Relances dues</TableCell>
                <TableCell>En cours</TableCell>
                <TableCell>À faire</TableCell>
                <TableCell>Statut: À relancer</TableCell>
                <TableCell>Acceptées</TableCell>
                <TableCell>Refusées</TableCell>
                <TableCell>Annulées</TableCell>
                <TableCell>Non renseigné</TableCell>
                <TableCell>Taux transfo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rowsWithTotal.map((r, idx) => {
                const label =
                  String(r.group_key).toLowerCase() === "total"
                    ? "Total"
                    : resolveProspectionGroupLabel(r, by);
                const taux = r.taux_acceptation ?? 0;
                let tauxColor: "inherit" | "green" | "orange" | "red" = "inherit";
                if (taux >= 60) tauxColor = "green";
                else if (taux >= 30) tauxColor = "orange";
                else tauxColor = "red";

                const isTotal = String(r.group_key).toLowerCase() === "total";

                return (
                  <TableRow
                    key={idx}
                    hover={!isTotal}
                    sx={{
                      bgcolor: isTotal ? "#f5f5f5" : undefined,
                      fontWeight: isTotal ? 700 : 500,
                    }}
                  >
                    <TableCell>{label}</TableCell>
                    <TableCell>{toFixed0(r.total)}</TableCell>
                    <TableCell>{toFixed0(r.actives)}</TableCell>
                    <TableCell>{toFixed0(r.a_relancer)}</TableCell>
                    <TableCell>{toFixed0(r.en_cours)}</TableCell>
                    <TableCell>{toFixed0(r.a_faire)}</TableCell>
                    <TableCell>{toFixed0(r.a_relancer_statut)}</TableCell>
                    <TableCell sx={{ bgcolor: "success.light", fontWeight: 600 }}>
                      {toFixed0(r.acceptees)}
                    </TableCell>
                    <TableCell sx={{ bgcolor: "error.light", fontWeight: 600 }}>
                      {toFixed0(r.refusees)}
                    </TableCell>
                    <TableCell sx={{ bgcolor: "warning.light", fontWeight: 600 }}>
                      {toFixed0(r.annulees)}
                    </TableCell>
                    <TableCell>{toFixed0(r.non_renseigne)}</TableCell>
                    <TableCell sx={{ color: tauxColor, fontWeight: 600 }}>
                      {Math.round(taux)}%
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      ) : null}
    </Card>
  );
}
