// src/pages/formations/FormationsPage.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Box,
  Stack,
  Button,
  CircularProgress,
  Typography,
  Select,
  MenuItem,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import FormationTable from "./FormationTable";
import FiltresFormationsPanel from "../../components/filters/FiltresFormationsPanel";
import usePagination from "../../hooks/usePagination";
import useFetch from "../../hooks/useFetch";
import useFiltresFormations from "../../hooks/useFiltresFormations";
import type { Formation, FiltresFormationsValues, PaginatedResponse } from "../../types/formation";
import PageTemplate from "../../components/PageTemplate";
import FormationExportButton from "../../components/export_buttons/ExportButtonFormation";

export default function FormationsPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // ── sélection / suppression
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── filtres
  const [filters, setFilters] = useState<FiltresFormationsValues>({
    texte: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  // 🔢 badge filtres actifs (ignore le champ "texte")
  const activeFiltersCount = useMemo(
    () =>
      Object.entries(filters).filter(([k, v]) => {
        if (k === "texte") return false;
        if (v == null) return false;
        if (typeof v === "string") return v.trim() !== "";
        if (Array.isArray(v)) return v.length > 0;
        return true;
      }).length,
    [filters]
  );

  // ── pagination
  const { page, setPage, count, setCount, totalPages, pageSize, setPageSize } = usePagination();

  // ── meta filtres
  const { filtres, loading: filtresLoading } = useFiltresFormations();

  // ── effective filters (état UI)
  const effectiveFilters = useMemo(
    () => ({ ...filters, page, page_size: pageSize }),
    [filters, page, pageSize]
  );

  // 🔁 Mapping UI -> API : texte → search (DRF SearchFilter)
  const apiFilters = useMemo(() => {
    const { texte, ...rest } =
      (effectiveFilters as typeof effectiveFilters & { texte?: string }) || {};
    return {
      ...rest,
      search: texte?.trim() || undefined,
    };
  }, [effectiveFilters]);

  const { data, loading, error, fetchData } = useFetch<PaginatedResponse<Formation>>(
    "/formations/",
    apiFilters, // ⬅️ on envoie les filtres mappés à l’API
    true
  );

  // formations visibles
  const formations: Formation[] = useMemo(() => data?.results ?? [], [data]);

  // initial / refresh
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // maj compteur total
  useEffect(() => {
    if (data?.count !== undefined) setCount(data.count);
  }, [data, setCount]);

  // garde la sélection cohérente avec la page visible
  useEffect(() => {
    const visible = new Set(formations.map((f) => f.id));
    setSelectedIds((prev) => prev.filter((id) => visible.has(id)));
  }, [formations]);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }, []);

  const clearSelection = () => setSelectedIds([]);
  const selectAll = () => setSelectedIds(formations.map((f) => f.id));

  const handleDelete = async () => {
    const idsToDelete = selectedId ? [selectedId] : selectedIds;
    if (!idsToDelete.length) return;

    try {
      const api = await import("../../api/axios");
      await Promise.all(idsToDelete.map((id) => api.default.delete(`/formations/${id}/`)));
      toast.success(`🗑️ ${idsToDelete.length} formation(s) supprimée(s)`);
      setShowConfirm(false);
      setSelectedId(null);
      setSelectedIds([]);
      fetchData();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleRowClick = (id: number) => navigate(`/formations/${id}/edit`);

  return (
    <PageTemplate
      title="📚 Formations"
      backButton
      onBack={() => navigate(-1)}
      refreshButton
      onRefresh={fetchData}
      actions={
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap">
          <Button
            variant="outlined"
            onClick={() => setShowFilters((v) => !v)}
            startIcon={<span>{showFilters ? "🫣" : "🔎"}</span>}
            fullWidth={isMobile}
          >
            {showFilters ? "Masquer filtres" : "Afficher filtres"}
            {activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ""}
          </Button>

          <FormationExportButton selectedIds={selectedIds} />

          <Select
            size="small"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {[5, 10, 20].map((s) => (
              <MenuItem key={s} value={s}>
                {s} / page
              </MenuItem>
            ))}
          </Select>

          <Button
            variant="contained"
            onClick={() => navigate("/formations/create")}
            fullWidth={isMobile}
          >
            ➕ Ajouter une formation
          </Button>

          {selectedIds.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button variant="contained" color="error" onClick={() => setShowConfirm(true)}>
                🗑️ Supprimer ({selectedIds.length})
              </Button>
              <Button variant="outlined" onClick={selectAll}>
                ✅ Tout sélectionner
              </Button>
              <Button variant="outlined" onClick={clearSelection}>
                ❌ Annuler
              </Button>
            </Stack>
          )}
        </Stack>
      }
      filters={
        showFilters &&
        (filtresLoading ? (
          <CircularProgress />
        ) : filtres ? (
          <FiltresFormationsPanel
            filtres={filtres}
            values={filters}
            onChange={(newValues) => {
              setFilters(newValues);
              setPage(1);
            }}
          />
        ) : (
          <Typography color="error">⚠️ Impossible de charger les filtres</Typography>
        ))
      }
      footer={
        count > 0 && (
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems="center"
            spacing={1}
          >
            <Typography variant="body2">
              Page {page} / {totalPages} ({count} résultats)
            </Typography>
            <Pagination
              page={page}
              count={totalPages}
              onChange={(_, val) => setPage(val)}
              color="primary"
              size={isMobile ? "small" : "medium"}
            />
          </Stack>
        )
      }
    >
      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Typography color="error">Erreur lors du chargement des formations.</Typography>
      ) : formations.length === 0 ? (
        <Box textAlign="center" color="text.secondary" my={4}>
          <Box fontSize={48} mb={1}>
            📭
          </Box>
          <Typography>Aucune formation trouvée.</Typography>
        </Box>
      ) : (
        <FormationTable
          formations={formations}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onRowClick={handleRowClick}
        />
      )}

      {/* Confirmation suppression */}
      <Dialog open={showConfirm} onClose={() => setShowConfirm(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color="warning" />
          Confirmation
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedId
              ? "Supprimer cette formation ?"
              : `Supprimer les ${selectedIds.length} formations sélectionnées ?`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirm(false)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </PageTemplate>
  );
}
