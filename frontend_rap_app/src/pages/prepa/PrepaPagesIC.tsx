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
} from "@mui/material";

import PageTemplate from "src/components/PageTemplate";
import usePagination from "src/hooks/usePagination";

import { usePrepaFiltersOptions, usePrepaList, useDeletePrepa } from "src/hooks/usePrepa";

import { Prepa } from "src/types/prepa";
import type { PrepaFiltresValues } from "src/types/prepa";

import PrepaTableIC from "./PrepaTableIC";
import PrepaDetailModal from "./PrepaDetailModal";

import ExportButtonPrepa from "src/components/export_buttons/ExportButtonPrepa";
import FiltresPrepaPanel from "src/components/filters/FiltresPrepaPanel";

export default function PrepaPageIC() {
  const navigate = useNavigate();

  // Filtres
  const [filters, setFilters] = useState<PrepaFiltresValues>({
    ordering: "-date_prepa",
    page: 1,
  });

  const { data: filterOptions, isLoading: loadingFilters } = usePrepaFiltersOptions();

  // Toggle panneau filtres
  const [showFilters, setShowFilters] = useState<boolean>(() => {
    const saved = localStorage.getItem("prepa.showFilters");
    return saved === "1";
  });
  useEffect(() => {
    localStorage.setItem("prepa.showFilters", showFilters ? "1" : "0");
  }, [showFilters]);

  // Pagination
  const { page, setPage, pageSize, setPageSize, count, setCount, totalPages } = usePagination();

  // 🔵 Filtre automatique : IC uniquement
  const effectiveFilters = useMemo(() => {
    const { type_prepa: _ignore, ...rest } = filters;

    return {
      ...rest,
      page,
      page_size: pageSize,
      type_prepa: "info_collective",
    };
  }, [filters, page, pageSize]);

  // Données API
  const { data, loading, error } = usePrepaList(effectiveFilters);
  const { remove } = useDeletePrepa();

  const items: Prepa[] = useMemo(() => data?.results ?? [], [data]);

  useEffect(() => {
    setCount(data?.count ?? 0);
  }, [data, setCount]);

  // Sélection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  useEffect(() => {
    const visible = new Set(items.map((i) => i.id));
    setSelectedIds((prev) => prev.filter((id) => visible.has(id)));
  }, [items]);

  // Suppression
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    if (!selectedId) return;
    try {
      await remove(selectedId);
      toast.success("🗑️ Séance supprimée");
      setShowConfirm(false);
      setSelectedId(null);
      setPage((p) => (items.length - 1 <= 0 && p > 1 ? p - 1 : p));
      setFilters((f) => ({ ...f }));
    } catch {
      toast.error("Erreur de suppression");
    }
  };

  // Détail
  const [selectedPrepa, setSelectedPrepa] = useState<Prepa | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const handleRowClick = (id: number) => {
    const item = items.find((i) => i.id === id);
    if (item) {
      setSelectedPrepa(item);
      setShowDetail(true);
    }
  };

  return (
    <PageTemplate
      title="Informations Collectives (IC)"
      refreshButton
      onRefresh={() => setFilters({ ...filters })}
      actions={
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button variant="outlined" onClick={() => navigate(-1)} startIcon={<span>←</span>}>
            Retour
          </Button>

          {/* Filtres */}
          <Button variant="outlined" onClick={() => setShowFilters((v) => !v)}>
            {showFilters ? "🫣 Masquer filtres" : "🔎 Afficher filtres"}
          </Button>

          {/* Page size */}
          <Select
            size="small"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {[5, 10, 20, 50].map((s) => (
              <MenuItem key={s} value={s}>
                {s} / page
              </MenuItem>
            ))}
          </Select>

          {/* Nouveau */}
          <Button variant="contained" onClick={() => navigate("/prepa/create/ic")}>
            ➕ Nouvelle séance
          </Button>

          {/* Export */}
          <ExportButtonPrepa data={items} selectedIds={selectedIds} />
        </Stack>
      }
      footer={
        count > 0 && (
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems="center"
            spacing={1}
          >
            <Typography>
              Page {page} / {totalPages} ({count} résultats)
            </Typography>

            <Pagination page={page} count={totalPages} onChange={(_, v) => setPage(v)} />
          </Stack>
        )
      }
    >
      {/* Filtres */}
      {showFilters && (
        <Box mt={2}>
          <FiltresPrepaPanel
            options={loadingFilters ? undefined : filterOptions}
            values={filters}
            onChange={(n) => {
              setFilters(n);
              setPage(1);
            }}
            onRefresh={() => setFilters({ ...filters })}
          />
        </Box>
      )}

      {/* TABLE IC */}
      <Box mt={2}>
        {loading ? (
          <CircularProgress />
        ) : error ? (
          <Typography color="error">⚠️ Erreur de chargement</Typography>
        ) : !items.length ? (
          <Typography textAlign="center" color="text.secondary" mt={4}>
            Aucune séance trouvée.
          </Typography>
        ) : (
          <PrepaTableIC
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
      </Box>

      {/* Modale Détail */}
      <PrepaDetailModal
        open={showDetail}
        onClose={() => setShowDetail(false)}
        prepa={selectedPrepa}
        onEdit={(id) => navigate(`/prepa/${id}/edit`)}
      />

      {/* Confirm delete */}
      <Dialog open={showConfirm} onClose={() => setShowConfirm(false)}>
        <DialogTitle>Confirmation</DialogTitle>
        <DialogContent>
          <DialogContentText>Supprimer cette séance ?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirm(false)}>Annuler</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </PageTemplate>
  );
}
