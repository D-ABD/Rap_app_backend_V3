import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Grid, MenuItem, Pagination, Paper, Select, Stack, TextField, Typography } from "@mui/material";
import { toast } from "react-toastify";
import PageTemplate from "../../components/PageTemplate";
import usePagination from "../../hooks/usePagination";
import RapportDetailModal from "./RapportDetailModal";
import RapportTable from "./RapportTable";
import { useDeleteRapport, useRapportExports, useRapports } from "../../hooks/useRapports";
import type { Rapport } from "../../types/rapport";

export default function RapportsPage() {
  const navigate = useNavigate();
  const { page, setPage, pageSize, setPageSize, count, setCount, totalPages } = usePagination();
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<Rapport | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Rapport | null>(null);

  const params = useMemo(() => ({ search, page, page_size: pageSize }), [search, page, pageSize]);
  const { data, loading, error, refresh } = useRapports(params);
  const { deleteRapport } = useDeleteRapport();
  const { exportListXlsx, exportRapport } = useRapportExports();

  useEffect(() => {
    setCount(data?.count ?? 0);
  }, [data, setCount]);

  const rapports = data?.results ?? [];
  const overview = useMemo(() => {
    return rapports.reduce(
      (acc, rapport) => {
        const summary = (rapport.donnees?.phase_summary as Record<string, unknown> | undefined) ?? {};
        const candidats = (summary.candidats as Record<string, unknown> | undefined) ?? {};
        acc.candidats += Number(candidats.total ?? 0);
        acc.enFormation += Number(candidats.stagiaires_en_formation ?? 0);
        acc.abandons += Number(candidats.abandons ?? 0);
        return acc;
      },
      { candidats: 0, enFormation: 0, abandons: 0 }
    );
  }, [rapports]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRapport(deleteTarget.id);
      toast.success("Rapport archivé avec succès.");
      setDeleteTarget(null);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'archivage du rapport.");
    }
  };

  return (
    <PageTemplate
      title="Rapports"
      backButton
      onBack={() => navigate(-1)}
      refreshButton
      onRefresh={() => void refresh()}
      actions={
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
          <TextField
            size="small"
            placeholder="Rechercher un rapport"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Select
            size="small"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {[5, 10, 20].map((size) => (
              <MenuItem key={size} value={size}>
                {size} / page
              </MenuItem>
            ))}
          </Select>
          <Button
            variant="text"
            disabled={!search}
            onClick={() => {
              setSearch("");
              setPage(1);
            }}
          >
            Réinitialiser
          </Button>
          <Button variant="outlined" disabled={loading || rapports.length === 0} onClick={() => void exportListXlsx(params)}>
            Exporter la liste
          </Button>
          <Button variant="contained" onClick={() => navigate("/rapports/create")}>
            Ajouter un rapport
          </Button>
        </Stack>
      }
      footer={
        count > 0 ? (
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center">
            <Typography variant="body2">
              Page {page} / {totalPages} ({count} résultats)
            </Typography>
            <Pagination page={page} count={totalPages} onChange={(_, value) => setPage(value)} color="primary" />
          </Stack>
        ) : null
      }
    >
      {loading ? <CircularProgress /> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      {!loading && !error && rapports.length > 0 ? (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary">
                Rapports visibles
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {rapports.length}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary">
                Candidats couverts
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {overview.candidats}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary">
                Abandons visibles
              </Typography>
              <Typography variant="h5" fontWeight={700} color={overview.abandons > 0 ? "error.main" : "text.primary"}>
                {overview.abandons}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      ) : null}
      {!loading && !error && rapports.length === 0 ? (
        <Box textAlign="center" color="text.secondary" my={4}>
          <Box fontSize={48} mb={1}>
            📭
          </Box>
          <Typography>Aucun rapport trouvé.</Typography>
        </Box>
      ) : null}
      {!loading && !error && rapports.length > 0 ? (
        <RapportTable
          rapports={rapports}
          onOpen={setDetail}
          onEdit={(id) => navigate(`/rapports/${id}/edit`)}
          onDelete={setDeleteTarget}
          onExport={(rapport) => void exportRapport(rapport.id, rapport.format)}
        />
      ) : null}

      <RapportDetailModal
        open={Boolean(detail)}
        rapport={detail}
        onClose={() => setDetail(null)}
        onExport={(rapport) => void exportRapport(rapport.id, rapport.format)}
      />

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Confirmation</DialogTitle>
        <DialogContent>
          <DialogContentText>Archiver ce rapport ?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Annuler</Button>
          <Button color="error" onClick={() => void handleDelete()}>
            Archiver
          </Button>
        </DialogActions>
      </Dialog>
    </PageTemplate>
  );
}
