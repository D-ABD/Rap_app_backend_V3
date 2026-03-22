// src/pages/widgets/commentsDahboard/ProspectionCommentStatsDashboard.tsx
import React, { useMemo, useState } from "react";
import {
  Card,
  Box,
  Typography,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  IconButton,
  Divider,
} from "@mui/material";
import { Refresh as RefreshIcon, Person as UserIcon } from "@mui/icons-material";
import {
  ProspectionCommentFilters,
  ProspectionCommentItem,
  useProspectionCommentLatest,
  useProspectionCommentGrouped,
  ProspectionCommentGroupRow,
} from "../../../types/prospectionCommentStats";

/* ──────────────────────────────
   Helper de formatage des dates
────────────────────────────── */
function formatLocalDateTime(createdAt?: string | null, updatedAt?: string | null) {
  const iso = updatedAt || createdAt;
  if (!iso) return "—";

  const date = new Date(iso);
  const options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return date.toLocaleString("fr-FR", options).replace(",", " à");
}

/* ──────────────────────────────
   Composant principal
────────────────────────────── */
export default function ProspectionCommentStatsDashboard({
  title = "Derniers commentaires de prospection",
}: {
  title?: string;
}) {
  const [filters, setFilters] = useState<ProspectionCommentFilters>({
    limit: 10,
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const { data, isLoading, error, refetch, isFetching } = useProspectionCommentLatest(filters);
  const { data: centresGrouped } = useProspectionCommentGrouped("centre", {
    ...filters,
    centre: undefined,
  });
  const { data: depsGrouped } = useProspectionCommentGrouped("departement", {
    ...filters,
    departement: undefined,
  });

  const centreOptions = useMemo(() => {
    const rows = centresGrouped?.results ?? [];
    return rows
      .map((r: ProspectionCommentGroupRow) => {
        const raw = r.group_key;
        if (raw == null) return null;
        const id = Number(raw);
        if (!Number.isFinite(id)) return null;
        return { id, label: r.group_label || `Centre #${id}` };
      })
      .filter(Boolean) as Array<{ id: number; label: string }>;
  }, [centresGrouped]);

  const departementOptions = useMemo(
    () =>
      (depsGrouped?.results ?? [])
        .map((r) => String(r.group_key ?? "").slice(0, 2))
        .filter((s) => !!s)
        .sort((a, b) => a.localeCompare(b)),
    [depsGrouped]
  );

  const total = data?.count ?? 0;
  const results = data?.results ?? [];

  // Pagination
  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };
  const paginated = results.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Card sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={2}
      >
        <Typography variant="subtitle1" fontWeight="bold">
          {title}
        </Typography>
        <IconButton onClick={() => refetch()} disabled={isFetching} size="small" title="Rafraîchir">
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Filtres */}
      <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
        {/* Centre */}
        <Select
          size="small"
          value={filters.centre ? String(filters.centre) : ""}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              centre: e.target.value ? Number(e.target.value) : undefined,
            }))
          }
          displayEmpty
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">Tous centres</MenuItem>
          {centreOptions.map((c) => (
            <MenuItem key={c.id} value={String(c.id)}>
              {c.label}
            </MenuItem>
          ))}
        </Select>

        {/* Département */}
        <Select
          size="small"
          value={filters.departement ?? ""}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              departement: e.target.value || undefined,
            }))
          }
          displayEmpty
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="">Tous départements</MenuItem>
          {departementOptions.map((code) => (
            <MenuItem key={code} value={code}>
              {code}
            </MenuItem>
          ))}
        </Select>
      </Box>

      <Divider />

      {/* Content */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" p={2}>
          <CircularProgress size={24} />
        </Box>
      ) : error ? (
        <Alert severity="error">{(error as Error).message}</Alert>
      ) : results.length === 0 ? (
        <Alert severity="info">Aucun commentaire trouvé.</Alert>
      ) : (
        <Paper sx={{ width: "100%", overflow: "hidden" }}>
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Formation / Prospection</TableCell>
                  <TableCell>Commentaire</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginated.map((c: ProspectionCommentItem) => (
                  <TableRow key={c.id} hover>
                    {/* Formation / Prospection */}
                    <TableCell sx={{ maxWidth: 300 }}>
                      <Typography variant="body2" fontWeight="bold">
                        {c.formation_nom ?? `Prospection #${c.prospection_id ?? "—"}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {c.type_offre_nom ?? "?"} • #{c.num_offre ?? "?"}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        {c.centre_nom ?? "Centre inconnu"}
                      </Typography>
                      {(c.start_date || c.end_date) && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          {c.start_date?.slice(0, 10) ?? "?"} → {c.end_date?.slice(0, 10) ?? "?"}
                        </Typography>
                      )}
                    </TableCell>

                    {/* ✅ Colonne Commentaire */}
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold" gutterBottom>
                        <UserIcon fontSize="small" sx={{ mr: 0.5 }} />
                        {c.auteur} • {formatLocalDateTime(c.created_at, c.updated_at)}
                      </Typography>

                      <Box
                        sx={{
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: 400,
                          color: "text.secondary",
                        }}
                      >
                        {c.body || <em>—</em>}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <TablePagination
            component="div"
            count={results.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 20, 50]}
            labelRowsPerPage="Lignes par page"
          />
        </Paper>
      )}

      {/* Footer Stats */}
      <Box display="flex" gap={2}>
        <Typography variant="caption" color="text.secondary">
          Total : {total}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Affichés : {results.length}
        </Typography>
      </Box>
    </Card>
  );
}
