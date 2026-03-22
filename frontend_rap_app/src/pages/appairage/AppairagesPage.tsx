import { useEffect, useMemo, useState } from "react";
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

import { useAppairageMeta, useListAppairages } from "../../hooks/useAppairage";
import usePagination from "../../hooks/usePagination";
import type {
  AppairageFiltresValues,
  AppairageListItem,
  AppairageMeta,
} from "../../types/appairage";

import AppairageTable from "./AppairageTable";
import { AppairageFilters } from "../../components/filters/FiltresAppairagePanel";
import ExportButtonAppairage from "../../components/export_buttons/ExportButtonAppairage";
import PageTemplate from "../../components/PageTemplate";
import AppairageDetailModal from "./AppairageDetailModal";

export const AppairagesPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [filters, setFilters] = useState<AppairageFiltresValues>({});
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // 🔹 Modale de détail
  const [showDetail, setShowDetail] = useState(false);
  const [selectedAppairage, setSelectedAppairage] = useState<AppairageListItem | null>(null);

  // 🔹 Masqué par défaut
  const [showFilters, setShowFilters] = useState<boolean>(false);

  const activeFiltersCount = useMemo(() => {
    const ignored = new Set(["page", "page_size"]);
    return Object.entries(filters).filter(([key, val]) => {
      if (ignored.has(key)) return false;
      if (val == null) return false;
      if (typeof val === "string") return val.trim() !== "";
      if (Array.isArray(val)) return val.length > 0;
      return true;
    }).length;
  }, [filters]);

  const { page, setPage, pageSize, setPageSize, count, setCount, totalPages } = usePagination();
  const { data: meta, loading: loadingMeta } = useAppairageMeta();

  type EffectiveFilters = AppairageFiltresValues & {
    page: number;
    page_size: number;
  };
  const effectiveFilters: EffectiveFilters = useMemo(
    () => ({ ...filters, page, page_size: pageSize }),
    [filters, page, pageSize]
  );

  const { data: pageData, loading, error } = useListAppairages(effectiveFilters, reloadKey);

  const appairages: AppairageListItem[] = useMemo(
    () => (pageData as { results?: AppairageListItem[] } | null)?.results ?? [],
    [pageData]
  );

  useEffect(() => {
    const c = (pageData as { count?: number } | null)?.count;
    if (typeof c === "number") setCount(c);
  }, [pageData, setCount]);

  useEffect(() => {
    const visible = new Set(appairages.map((a) => a.id));
    setSelectedIds((prev) => prev.filter((id) => visible.has(id)));
  }, [appairages]);

  const handleDelete = async () => {
    const idsToDelete = selectedId ? [selectedId] : selectedIds;
    if (!idsToDelete.length) return;
    try {
      const mod = await import("../../api/axios");
      const api = mod.default as import("axios").AxiosInstance;
      await Promise.all(idsToDelete.map((id) => api.delete(`/appairages/${id}/`)));
      toast.success(`🗑️ ${idsToDelete.length} appairage(s) supprimé(s)`);
      setShowConfirm(false);
      setSelectedId(null);
      setSelectedIds([]);
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  // 🔹 Ouverture de la modale au clic sur une ligne
  const handleRowClick = (id: number) => {
    const a = appairages.find((x) => x.id === id);
    if (a) {
      setSelectedAppairage(a);
      setShowDetail(true);
    }
  };

  const handleDeleteClick = (id: number) => {
    setSelectedId(id);
    setShowConfirm(true);
  };

  const handleHistoryClick = (id: number) => navigate(`/appairages/${id}/historiques`);

  const handleEdit = (id: number) => {
    setShowDetail(false);
    navigate(`/appairages/${id}/edit`);
  };

  return (
    <PageTemplate
      title="📊 Appairages"
      backButton
      onBack={() => navigate(-1)}
      refreshButton
      onRefresh={() => setReloadKey((k) => k + 1)}
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

          <ExportButtonAppairage
            selectedIds={selectedIds}
            label="Exporter"
            filenameBase="appairages"
            endpointBase="/appairages"
          />

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
            onClick={() => navigate("/appairages/create")}
            fullWidth={isMobile}
          >
            ➕ Nouvel appairage
          </Button>
        </Stack>
      }
      filters={
        showFilters && (
          <>
            {loadingMeta ? (
              <CircularProgress />
            ) : (meta as AppairageMeta | undefined)?.statut_choices ? (
              <AppairageFilters
                meta={meta as AppairageMeta}
                values={filters}
                onChange={(newValues: AppairageFiltresValues) => {
                  setFilters(newValues);
                  setPage(1);
                }}
                loading={loadingMeta}
              />
            ) : (
              <Typography color="error">⚠️ Impossible de charger les filtres</Typography>
            )}
          </>
        )
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
        <Typography color="error">Erreur lors du chargement des appairages.</Typography>
      ) : appairages.length === 0 ? (
        <Box textAlign="center" color="text.secondary" my={4}>
          <Box fontSize={48} mb={1}>
            📭
          </Box>
          <Typography>Aucun appairage trouvé.</Typography>
        </Box>
      ) : (
        <AppairageTable
          items={appairages}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onRowClick={handleRowClick} // ✅ clic ligne → ouvre la modale
          onDeleteClick={handleDeleteClick}
          onHistoryClick={handleHistoryClick}
        />
      )}

      {/* ───────────── Modale de détail ───────────── */}
      <AppairageDetailModal
        open={showDetail}
        onClose={() => setShowDetail(false)}
        appairage={selectedAppairage}
        onEdit={handleEdit}
      />

      {/* ───────────── Confirmation suppression ───────────── */}
      <Dialog open={showConfirm} onClose={() => setShowConfirm(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color="warning" />
          Confirmation
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedId
              ? "Supprimer cet appairage ?"
              : `Supprimer les ${selectedIds.length} appairages sélectionnés ?`}
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
};

export default AppairagesPage;
