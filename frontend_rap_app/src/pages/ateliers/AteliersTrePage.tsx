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
  Menu,
} from "@mui/material";

import usePagination from "../../hooks/usePagination";
import type {
  AtelierTRE,
  AtelierTREFiltresValues,
} from "../../types/ateliersTre";

import AteliersTreTable from "./AteliersTRETable";
import FiltresAteliersTREPanel from "../../components/filters/FiltresAteliersTREPanel";
import {
  useAteliersTRE,
  useAtelierTREFiltresOptions,
  useDeleteAtelierTRE,
} from "../../hooks/useAtelierTre";
import PageTemplate from "../../components/PageTemplate";
import AtelierTREDetailModal from "./AtelierTREDetailModal";
import ExportButtonAteliersTRE from "../../components/export_buttons/ExportButtonAteliersTRE";
import SearchInput from "../../components/SearchInput";

export default function AteliersTrePage() {
  const navigate = useNavigate();
  const [anchorOptions, setAnchorOptions] = useState<null | HTMLElement>(null);

  const [filters, setFilters] = useState<AtelierTREFiltresValues>({
    ordering: "-date_atelier",
  });

  const [showFilters, setShowFilters] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("ateliers.showFilters");
    return saved != null ? saved === "1" : false;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ateliers.showFilters", showFilters ? "1" : "0");
    }
  }, [showFilters]);

  const { page, setPage, pageSize, setPageSize, count, setCount, totalPages } =
    usePagination();

  type EffectiveFilters = AtelierTREFiltresValues & {
    page: number;
    page_size: number;
  };

  const effectiveFilters: EffectiveFilters = useMemo(
    () => ({ ...filters, page, page_size: pageSize }),
    [filters, page, pageSize]
  );

  const activeFiltersCount = useMemo(() => {
    const ignored = new Set(["page", "page_size", "search", "ordering"]);
    return Object.entries(effectiveFilters).filter(([key, val]) => {
      if (ignored.has(key)) return false;
      if (val == null) return false;
      if (typeof val === "string") return val.trim() !== "";
      if (Array.isArray(val)) return val.length > 0;
      return true;
    }).length;
  }, [effectiveFilters]);

  const { data: pageData, loading, error } = useAteliersTRE(effectiveFilters);
  const { options, loading: loadingOptions } = useAtelierTREFiltresOptions();
  const { remove } = useDeleteAtelierTRE();

  const items: AtelierTRE[] = useMemo(() => pageData?.results ?? [], [pageData]);

  useEffect(() => {
    setCount(pageData?.count ?? 0);
  }, [pageData, setCount]);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    const visible = new Set(items.map((item) => item.id));
    setSelectedIds((prev) => prev.filter((id) => visible.has(id)));
  }, [items]);

  const selectAllVisible = () => setSelectedIds(items.map((item) => item.id));
  const clearSelection = () => setSelectedIds([]);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    const idsToDelete = selectedId ? [selectedId] : selectedIds;
    if (!idsToDelete.length) return;

    try {
      await Promise.all(idsToDelete.map((id) => remove(id)));
      toast.success(`📦 ${idsToDelete.length} atelier(s) archivé(s)`);
      setShowConfirm(false);
      setSelectedId(null);
      setSelectedIds([]);
      setPage((currentPage) =>
        items.length - idsToDelete.length <= 0 && currentPage > 1
          ? currentPage - 1
          : currentPage
      );
      setFilters((currentFilters) => ({ ...currentFilters }));
    } catch {
      toast.error("Erreur lors de l'archivage");
    }
  };

  const [selectedAtelier, setSelectedAtelier] = useState<AtelierTRE | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const handleRowClick = (id: number) => {
    const atelier = items.find((item) => item.id === id);
    if (!atelier) return;

    setSelectedAtelier(atelier);
    setShowDetail(true);
  };

  return (
    <PageTemplate
      refreshButton
      onRefresh={() => {
        setPage((currentPage) => currentPage);
        setFilters((currentFilters) => ({ ...currentFilters }));
      }}
      headerExtra={
        <SearchInput
          placeholder="🔍 Rechercher un atelier TRE..."
          value={filters.search ?? ""}
          onChange={(e) => {
            setFilters((prev) => ({
              ...prev,
              search: e.target.value || undefined,
            }));
            setPage(1);
          }}
        />
      }
      actions={
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap">
          <Button variant="outlined" onClick={() => setShowFilters((v) => !v)}>
            {showFilters ? "🫣 Masquer filtres" : "🔎 Afficher filtres"}
            {activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ""}
          </Button>

          <Button
            variant="outlined"
            onClick={(event) => setAnchorOptions(event.currentTarget)}
          >
            Options
          </Button>

          <Select
            size="small"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {[10, 20, 50].map((size) => (
              <MenuItem key={size} value={size}>
                {size} / page
              </MenuItem>
            ))}
          </Select>

          <Button
            variant="contained"
            onClick={() => navigate("/ateliers-tre/create")}
          >
            ➕ Nouvel atelier
          </Button>

          <Menu
            anchorEl={anchorOptions}
            open={Boolean(anchorOptions)}
            onClose={() => setAnchorOptions(null)}
            PaperProps={{
              sx: {
                mt: 1,
                width: 320,
                maxWidth: "calc(100vw - 32px)",
                p: 1.25,
                borderRadius: 3,
              },
            }}
          >
            <Box sx={{ px: 1, pt: 0.5, pb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Options
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Export et actions secondaires
              </Typography>
            </Box>

            <Stack spacing={1} sx={{ px: 1, pb: 1 }}>
              <ExportButtonAteliersTRE data={items} selectedIds={selectedIds} />
            </Stack>
          </Menu>

          {selectedIds.length > 0 && (
            <>
              <Button
                color="error"
                variant="contained"
                onClick={() => setShowConfirm(true)}
              >
                📦 Archiver ({selectedIds.length})
              </Button>

              <Button variant="outlined" onClick={selectAllVisible}>
                ✅ Tout sélectionner
              </Button>

              <Button variant="outlined" onClick={clearSelection}>
                ❌ Annuler
              </Button>
            </>
          )}
        </Stack>
      }
      filters={
        showFilters &&
        (loadingOptions ? (
          <CircularProgress />
        ) : options ? (
          <FiltresAteliersTREPanel
            options={options}
            values={effectiveFilters}
            hideSearch
            onChange={(values) => {
              setFilters((current) => ({ ...current, ...values }));
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
              onChange={(_, value) => setPage(value)}
              color="primary"
            />
          </Stack>
        )
      }
    >
      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Typography color="error">⚠️ Erreur de chargement des ateliers.</Typography>
      ) : items.length === 0 ? (
        <Box textAlign="center" color="text.secondary" my={4}>
          <Box fontSize={48} mb={1}>
            📭
          </Box>
          <Typography>Aucun atelier trouvé.</Typography>
        </Box>
      ) : (
        <AteliersTreTable
          items={items}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onDelete={(id) => {
            setSelectedId(id);
            setShowConfirm(true);
          }}
          onRowClick={handleRowClick}
        />
      )}

      <AtelierTREDetailModal
        open={showDetail}
        onClose={() => setShowDetail(false)}
        atelier={selectedAtelier}
        onEdit={(id) => navigate(`/ateliers-tre/${id}/edit`)}
      />

      <Dialog open={showConfirm} onClose={() => setShowConfirm(false)}>
        <DialogTitle>Confirmation</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedId
              ? "Archiver cet atelier ?"
              : `Archiver les ${selectedIds.length} ateliers sélectionnés ?`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirm(false)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Archiver
          </Button>
        </DialogActions>
      </Dialog>
    </PageTemplate>
  );
}