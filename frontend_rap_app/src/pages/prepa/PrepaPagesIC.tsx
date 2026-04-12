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

import PageTemplate from "src/components/PageTemplate";
import usePagination from "src/hooks/usePagination";

import {
  usePrepaFiltersOptions,
  usePrepaList,
  useDeletePrepa,
  useDesarchiverPrepa,
  useHardDeletePrepa,
} from "src/hooks/usePrepa";

import { Prepa } from "src/types/prepa";
import type { PrepaFiltresValues } from "src/types/prepa";

import PrepaTableIC from "./PrepaTableIC";
import PrepaDetailModal from "./PrepaDetailModal";

import ExportButtonPrepa from "src/components/export_buttons/ExportButtonPrepa";
import FiltresPrepaPanel from "src/components/filters/FiltresPrepaPanel";
import SearchInput from "src/components/SearchInput";
import { useAuth } from "src/hooks/useAuth";
import { canWritePrepaRole } from "src/utils/roleGroups";

export default function PrepaPageIC() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canWritePrepa = canWritePrepaRole(user?.role);

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
  const { restore } = useDesarchiverPrepa();
  const { hardDelete } = useHardDeletePrepa();

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

  // Archivage
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [hardDeleteId, setHardDeleteId] = useState<number | null>(null);
  const [anchorOptions, setAnchorOptions] = useState<null | HTMLElement>(null);

  const handleDelete = async () => {
    const idsToDelete = selectedId ? [selectedId] : selectedIds;
    if (!idsToDelete.length) return;
    try {
      await Promise.all(idsToDelete.map((id) => remove(id)));
      toast.success(`📦 ${idsToDelete.length} séance(s) archivée(s)`);
      setShowConfirm(false);
      setSelectedId(null);
      setSelectedIds([]);
      setPage((p) => (items.length - idsToDelete.length <= 0 && p > 1 ? p - 1 : p));
      setFilters((f) => ({ ...f }));
    } catch {
      toast.error("Erreur d'archivage");
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await restore(id);
      toast.success("Séance restaurée");
      setFilters((f) => ({ ...f }));
    } catch {
      toast.error("Erreur de restauration");
    }
  };

  const handleHardDelete = async () => {
    if (!hardDeleteId) return;
    try {
      await hardDelete(hardDeleteId);
      toast.success("Séance supprimée définitivement");
      setHardDeleteId(null);
      setFilters((f) => ({ ...f }));
    } catch {
      toast.error("Erreur de suppression définitive");
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
      backButton
      onBack={() => navigate(-1)}
      refreshButton
      onRefresh={() => setFilters({ ...filters })}
      headerExtra={
        <SearchInput
          placeholder="🔍 Rechercher une séance Prépa..."
          value={filters.search ?? ""}
          onChange={(e) => {
            setFilters((prev) => ({ ...prev, search: e.target.value || undefined }));
            setPage(1);
          }}
        />
      }
      actions={
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button variant="outlined" onClick={() => setShowFilters((v) => !v)}>
            {showFilters ? "🫣 Masquer filtres" : "🔎 Afficher filtres"}
          </Button>

          <Button variant="outlined" onClick={(event) => setAnchorOptions(event.currentTarget)}>
            Options
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
          {canWritePrepa && (
            <Button variant="contained" onClick={() => navigate("/prepa/create/ic")}>
              ➕ Nouvelle séance
            </Button>
          )}

          <Button
            variant={filters.avec_archivees || filters.archives_seules ? "contained" : "outlined"}
            onClick={() =>
              setFilters((prev) =>
                prev.avec_archivees || prev.archives_seules
                  ? { ...prev, avec_archivees: undefined, archives_seules: undefined }
                  : { ...prev, avec_archivees: true, archives_seules: undefined }
              )
            }
          >
            {filters.avec_archivees || filters.archives_seules ? "Masquer archivées" : "Inclure archivées"}
          </Button>

          {(filters.avec_archivees || filters.archives_seules) && (
            <Button
              variant={filters.archives_seules ? "contained" : "outlined"}
              onClick={() =>
                setFilters((prev) =>
                  prev.archives_seules
                    ? { ...prev, archives_seules: undefined, avec_archivees: undefined }
                    : { ...prev, archives_seules: true, avec_archivees: true }
                )
              }
            >
              {filters.archives_seules ? "Voir tout" : "Archives seules"}
            </Button>
          )}

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
              <ExportButtonPrepa data={items} selectedIds={selectedIds} />
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
            hideSearch
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
            onToggleArchive={(id) => handleRestore(id)}
            onHardDelete={(id) => setHardDeleteId(id)}
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

      {/* Confirm archive */}
      <Dialog open={showConfirm} onClose={() => setShowConfirm(false)}>
        <DialogTitle>Confirmation</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedId
              ? "Archiver cette séance ?"
              : `Archiver les ${selectedIds.length} séances sélectionnées ?`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirm(false)}>Annuler</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Archiver
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(hardDeleteId)} onClose={() => setHardDeleteId(null)}>
        <DialogTitle>Suppression définitive</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Cette séance Prépa archivée sera supprimée définitivement.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHardDeleteId(null)}>Annuler</Button>
          <Button onClick={handleHardDelete} color="error" variant="contained">
            Supprimer définitivement
          </Button>
        </DialogActions>
      </Dialog>
    </PageTemplate>
  );
}
