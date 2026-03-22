// src/components/AppairageCommentStatsDashboard.tsx
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
  Chip,
  Paper,
  TablePagination,
  IconButton,
  Divider,
} from "@mui/material";
import { Refresh as RefreshIcon } from "@mui/icons-material";
import {
  AppairageCommentFilters,
  AppairageCommentItem,
  useAppairageCommentLatest,
  useAppairageCommentGrouped,
  AppairageCommentGroupRow,
} from "../../../types/appairageCommentStats";

export default function AppairageCommentStatsDashboard({
  title = "Derniers commentaires d’appairage",
}: {
  title?: string;
}) {
  const [filters, setFilters] = useState<AppairageCommentFilters>({
    limit: 10,
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const { data, isLoading, error, refetch, isFetching } = useAppairageCommentLatest(filters);

  const { data: centresGrouped } = useAppairageCommentGrouped("centre", {
    ...filters,
    centre: undefined,
  });
  const { data: depsGrouped } = useAppairageCommentGrouped("departement", {
    ...filters,
    departement: undefined,
  });

  const centreOptions = useMemo(() => {
    const rows = centresGrouped?.results ?? [];
    return rows
      .map((r: AppairageCommentGroupRow) => {
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

      {/* Filtres rapides */}
      <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
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
                  <TableCell>Appairage</TableCell>
                  <TableCell>Commentaire</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginated.map((c: AppairageCommentItem) => (
                  <TableRow key={c.id} hover>
                    {/* Colonne Appairage */}
                    <TableCell sx={{ maxWidth: 340 }}>
                      <Typography variant="body2" fontWeight="bold">
                        Appairage #{c.appairage_id}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {[c.partenaire_nom, c.formation_nom].filter(Boolean).join(" • ") || "—"}
                      </Typography>
                      {(c.num_offre || c.type_offre_nom) && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Offre {c.num_offre ?? "?"} — {c.type_offre_nom ?? "?"}
                        </Typography>
                      )}
                      {c.centre_nom && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          {c.centre_nom}
                        </Typography>
                      )}
                      {c.statut_snapshot && (
                        <Chip
                          size="small"
                          variant="outlined"
                          label={c.statut_snapshot}
                          sx={{ mt: 0.5 }}
                        />
                      )}
                    </TableCell>

                    {/* Colonne Commentaire */}
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {c.auteur} • {c.date} {c.heure}
                      </Typography>
                      {c.is_recent && <Chip size="small" label="Récent" sx={{ ml: 1 }} />}
                      {c.is_edited && <Chip size="small" label="Édité" sx={{ ml: 1 }} />}
                      <Typography
                        variant="body2"
                        sx={{
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          mt: 0.5,
                          maxWidth: 400,
                        }}
                        title={c.body}
                      >
                        {c.body}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

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

      {/* Footer stats */}
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
