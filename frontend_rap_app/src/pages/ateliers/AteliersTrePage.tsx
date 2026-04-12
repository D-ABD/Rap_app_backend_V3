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
import type { AtelierTRE, AtelierTREFiltresValues } from "../../types/ateliersTre";

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

  // filtres (hors page/page_size)
  const [filters, setFilters] = useState<AtelierTREFiltresValues>({
    ordering: "-date_atelier",
  });

  // toggle filtres (persisté localStorage)
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

  // pagination
  const { page, setPage, pageSize, setPageSize, count, setCount, totalPages } = usePagination();

  type EffectiveFilters = AtelierTREFiltresValues & {
    page: number;
    page_size: number;
  };
  const effectiveFilters: EffectiveFilters = useMemo(
    () => ({ ...filters, page, page_size: pageSize }),
    [filters, page, pageSize]
  );

  // nombre de filtres actifs
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

  // data + meta
  const { data: pageData, loading, error } = useAteliersTRE(effectiveFilters);
  const { options, loading: loadingOptions } = useAtelierTREFiltresOptions();
  const { remove } = useDeleteAtelierTRE();

  const items: AtelierTRE[] = useMemo(() => pageData?.results ?? [], [pageData]);

  useEffect(() => {
    const c = pageData?.count ?? 0;
    setCount(c);
  }, [pageData, setCount]);

  // sélection multi
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  useEffect(() => {
    const visible = new Set(items.map((i) => i.id));
    setSelectedIds((prev) => prev.filter((id) => visible.has(id)));
  }, [items]);

  // archivage
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
      setPage((p) => (items.length - idsToDelete.length <= 0 && p > 1 ? p - 1 : p));
      setFilters((f) => ({ ...f })); // refresh soft
    } catch {
      toast.error("Erreur lors de l'archivage");
    }
  };

  // ─────── Détail ───────
  const [selectedAtelier, setSelectedAtelier] = useState<AtelierTRE | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const handleRowClick = (id: number) => {
    const atelier = items.find((i) => i.id === id);
    if (atelier) {
      setSelectedAtelier(atelier);
      setShowDetail(true);
    }
  };

  return (
    <PageTemplate
      refreshButton
      onRefresh={() => {
        setPage((p) => p);
        setFilters((f) => ({ ...f }));
      }}
      headerExtra={
        <SearchInput
          placeholder="🔍 Rechercher un atelier TRE..."
          value={filters.search ?? ""}
          onChange={(e) => {
            setFilters((prev) => ({ ...prev, search: e.target.value || undefined }));
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

          <Button variant="outlined" onClick={(event) => setAnchorOptions(event.currentTarget)}>
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
            {[10, 20, 50].map((s) => (
              <MenuItem key={s} value={s}>
                {s} / page
              </MenuItem>
            ))}
          </Select>

          <Button variant="contained" onClick={() => navigate("/ateliers-tre/create")}>
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
              <Button color="error" variant="contained" onClick={() => setShowConfirm(true)}>
                📦 Archiver ({selectedIds.length})
              </Button>
              <Button variant="outlined" onClick={() => setSelectedIds(items.map((i) => i.id))}>
                ✅ Tout sélectionner
              </Button>
              <Button variant="outlined" onClick={() => setSelectedIds([])}>
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
            onChange={(v) => {
              setFilters((f) => ({ ...f, ...v }));
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
            />
          </Stack>
        )
      }
    >
      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Typography color="error">⚠️ Erreur de chargement des ateliers.</Typography>
      ) : !items.length ? (
        <Box textAlign="center" color="text.secondary" my={4}>
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

      {/* ───────────── Modale de détail ───────────── */}
      <AtelierTREDetailModal
        open={showDetail}
        onClose={() => setShowDetail(false)}
        atelier={selectedAtelier}
        onEdit={(id) => navigate(`/ateliers-tre/${id}/edit`)}
      />

      {/* Confirmation dialog */}
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
