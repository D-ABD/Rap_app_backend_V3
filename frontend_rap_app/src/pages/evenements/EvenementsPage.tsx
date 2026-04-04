import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  MenuItem,
  Pagination,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import usePagination from "../../hooks/usePagination";
import PageTemplate from "../../components/PageTemplate";
import EvenementDetailModal from "./EvenementDetailModal";
import EvenementTable from "./EvenementTable";
import { useDeleteEvenement, useEvenementChoices, useEvenements, useEvenementStats } from "../../hooks/useEvenements";
import type { Evenement, EvenementFilters } from "../../types/evenement";

export default function EvenementsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { page, setPage, pageSize, setPageSize, count, setCount, totalPages } = usePagination();
  const [reloadKey, setReloadKey] = useState(0);
  const { types, formations, loading: loadingChoices } = useEvenementChoices();
  const { deleteEvenement } = useDeleteEvenement();

  const toNum = (value: string | null) => {
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const urlFilters = useMemo<EvenementFilters>(
    () => ({
      formation: toNum(searchParams.get("formation")),
      type_evenement: searchParams.get("type_evenement") || undefined,
      date_min: searchParams.get("date_min") || undefined,
      date_max: searchParams.get("date_max") || undefined,
    }),
    [searchParams]
  );

  const [filters, setFilters] = useState<EvenementFilters>(urlFilters);
  useEffect(() => {
    setFilters(urlFilters);
    setPage(1);
  }, [setPage, urlFilters]);

  const effectiveFilters = useMemo(() => ({ ...filters, page, page_size: pageSize }), [filters, page, pageSize]);
  const { data, loading, error, refresh } = useEvenements(effectiveFilters, reloadKey);
  const { data: stats, loading: loadingStats } = useEvenementStats(filters.date_min, filters.date_max);

  const evenements = useMemo<Evenement[]>(() => data?.results ?? [], [data]);
  useEffect(() => {
    setCount(data?.count ?? 0);
  }, [data, setCount]);

  const [detail, setDetail] = useState<Evenement | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Evenement | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteEvenement(deleteTarget.id);
      toast.success("Événement archivé avec succès.");
      setDeleteTarget(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible d'archiver l'événement.");
    }
  };

  return (
    <PageTemplate
      title="Événements"
      backButton
      onBack={() => navigate(-1)}
      refreshButton
      onRefresh={() => {
        void refresh();
        setReloadKey((k) => k + 1);
      }}
      actions={
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
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
          <Button variant="contained" onClick={() => navigate("/evenements/create")}>
            Ajouter un événement
          </Button>
        </Stack>
      }
      filters={
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <Select
              fullWidth
              size="small"
              value={filters.formation ? String(filters.formation) : ""}
              displayEmpty
              onChange={(e) => {
                setFilters((prev) => ({
                  ...prev,
                  formation: e.target.value ? Number(e.target.value) : undefined,
                }));
                setPage(1);
              }}
            >
              <MenuItem value="">Toutes les formations</MenuItem>
              {formations.map((formation) => (
                <MenuItem key={formation.id} value={String(formation.id)}>
                  {formation.nom}
                </MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid item xs={12} md={3}>
            <Select
              fullWidth
              size="small"
              value={filters.type_evenement ?? ""}
              displayEmpty
              onChange={(e) => {
                setFilters((prev) => ({
                  ...prev,
                  type_evenement: e.target.value || undefined,
                }));
                setPage(1);
              }}
            >
              <MenuItem value="">Tous les types</MenuItem>
              {types.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Date min"
              value={filters.date_min ?? ""}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, date_min: e.target.value || undefined }));
                setPage(1);
              }}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Date max"
              value={filters.date_max ?? ""}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, date_max: e.target.value || undefined }));
                setPage(1);
              }}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
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
      {loadingChoices || loading ? <CircularProgress /> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}

      {!loadingStats && stats ? (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            Répartition par type
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} flexWrap="wrap">
            {Object.entries(stats).map(([key, value]) => (
              <Alert key={key} severity="info" sx={{ py: 0 }}>
                {key} : {value.count}
              </Alert>
            ))}
          </Stack>
        </Box>
      ) : null}

      {!loading && evenements.length === 0 ? (
        <Typography color="text.secondary">Aucun événement trouvé.</Typography>
      ) : null}

      {evenements.length > 0 ? (
        <EvenementTable
          evenements={evenements}
          onRowClick={(id) => {
            const event = evenements.find((item) => item.id === id) ?? null;
            setDetail(event);
            setShowDetail(true);
          }}
          onEdit={(id) => navigate(`/evenements/${id}/edit`)}
          onDelete={(id) => setDeleteTarget(evenements.find((item) => item.id === id) ?? null)}
        />
      ) : null}

      <EvenementDetailModal open={showDetail} onClose={() => setShowDetail(false)} evenement={detail} />

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Confirmation</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Voulez-vous vraiment archiver cet événement ?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Archiver
          </Button>
        </DialogActions>
      </Dialog>
    </PageTemplate>
  );
}
