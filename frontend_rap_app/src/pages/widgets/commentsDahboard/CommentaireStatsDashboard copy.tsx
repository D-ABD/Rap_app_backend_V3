// src/pages/widgets/commentsDahboard/CommentaireStatsDashboard.tsx
import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  Box,
  Typography,
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
import { Refresh as RefreshIcon } from "@mui/icons-material";
import {
  CommentaireFilters,
  CommentaireItem,
  useCommentaireLatest,
  useFormationOptionsFromGrouped as _useFormationOptionsFromGrouped, // ✅ renommé pour éviter warning
} from "../../../types/commentaireStats";
import api from "../../../api/axios";
import CommentaireContent from "../../commentaires/CommentaireContent";

/* ──────────────────────────────
   Helpers fetch grouped options
────────────────────────────── */
type GroupedRow = {
  group_key?: string | number | null;
  group_label?: string | null;
  departement?: string | null;
  formation__centre_id?: number | null;
  formation__centre__nom?: string | null;
};

function sanitize(obj: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v != null && v !== "") out[k] = v;
  }
  return out;
}

// ✅ Préfixe "_" pour signaler à ESLint qu’on garde ces hooks “en réserve”
function _useCentreOptionsFromGrouped(filters: CommentaireFilters) {
  const params = useMemo(() => sanitize({ ...filters, centre: undefined }), [filters]);
  return useQuery({
    queryKey: ["commentaires:options:centre", params],
    queryFn: async () => {
      const { data } = await api.get<{ results: GroupedRow[] }>("/commentaire-stats/grouped/", {
        params: { ...params, by: "centre" },
      });
      return (data?.results ?? [])
        .map((r) => {
          const id =
            (typeof r["formation__centre_id"] === "number"
              ? r["formation__centre_id"]
              : undefined) ??
            (typeof r.group_key === "string" || typeof r.group_key === "number"
              ? r.group_key
              : undefined);
          if (!id) return null;
          const label = r["formation__centre__nom"] ?? r.group_label ?? `Centre #${id}`;
          return { id, label };
        })
        .filter(Boolean) as Array<{ id: string | number; label: string }>;
    },
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  });
}

function _useDepartementOptionsFromGrouped(filters: CommentaireFilters) {
  const params = useMemo(() => sanitize({ ...filters, departement: undefined }), [filters]);
  return useQuery({
    queryKey: ["commentaires:options:departement", params],
    queryFn: async () => {
      const { data } = await api.get<{ results: GroupedRow[] }>("/commentaire-stats/grouped/", {
        params: { ...params, by: "departement" },
      });
      return (data?.results ?? [])
        .map((r) => {
          const code = r.departement ?? (typeof r.group_key === "string" ? r.group_key : "");
          if (!code) return null;
          return { code, label: r.group_label ?? code };
        })
        .filter(Boolean) as Array<{ code: string; label: string }>;
    },
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  });
}

/* ──────────────────────────────
   Dashboard principal
────────────────────────────── */
export default function CommentaireStatsDashboard({
  title = "Derniers commentaires",
}: {
  title?: string;
}) {
  const [filters] = useState<CommentaireFilters>({ limit: 10 });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const { data, isLoading, error, refetch, isFetching } = useCommentaireLatest(filters);
  const total = data?.count ?? 0;
  const results = data?.results ?? [];

  // (Conservation fonctionnelle : ces hooks restent disponibles si besoin)
  // const { data: centreOptions = [], isLoading: loadingCentres } =
  //   _useCentreOptionsFromGrouped(filters);
  // const { data: departementOptions = [], isLoading: loadingDeps } =
  //   _useDepartementOptionsFromGrouped(filters);
  // const { data: formationOptions = [], isLoading: loadingFormations } =
  //   _useFormationOptionsFromGrouped(filters);

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const paginated = results.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

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

      <Divider />

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
                  <TableCell>Formation</TableCell>
                  <TableCell>Commentaire</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginated.map((c: CommentaireItem) => (
                  <TableRow key={c.id} hover>
                    <TableCell sx={{ maxWidth: 300 }}>
                      <Typography variant="body2" fontWeight="bold">
                        {c.formation_nom ?? `Formation #${c.formation_id ?? "—"}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {c.type_offre ?? "?"} — {c.num_offre ?? "?"}
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

                    {/* ✅ Colonne Commentaire HTML */}
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold" gutterBottom>
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
                        <CommentaireContent html={c.contenu || "<em>—</em>"} />
                      </Box>
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

      {/* Footer */}
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
