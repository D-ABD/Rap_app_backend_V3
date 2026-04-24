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
  useDeclicFiltersOptions,
  useDeclicList,
  useDeleteDeclic,
  useDesarchiverDeclic,
  useHardDeleteDeclic,
} from "src/hooks/useDeclic";
import { Declic } from "src/types/declic";
import type { DeclicFiltresValues } from "src/types/declic";
import FiltresDeclicPanel from "src/components/filters/FiltresDeclicPanel";

import DeclicTable from "./DeclicTable";
import DeclicDetailModal from "./DeclicDetailModal";
import ExportButtonDeclic from "src/components/export_buttons/ExportButtonDeclic";
import SearchInput from "src/components/SearchInput";
import { useAuth } from "src/hooks/useAuth";
import { canWriteDeclicRole } from "src/utils/roleGroups";

export default function DeclicPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canWriteDeclic = canWriteDeclicRole(user?.role);

  // ───────────── Filtres (avec typage complet) ─────────────
  const [filters, setFilters] = useState<DeclicFiltresValues>({
    ordering: "-date_declic",
    page: 1,
  });

  const resetAllFilters = () => {
    setFilters({
      ordering: "-date_declic",
      page: 1,
      search: undefined,
      type_declic: undefined,
      centre: undefined,
      departement: undefined,
      annee: undefined,
      date_min: undefined,
      date_max: undefined,
      avec_archivees: undefined,
      archives_seules: undefined,
    });
    setPage(1);
  };

  // 🔹 Récupération dynamique des options de filtres
  const { data: filterOptions, isLoading: loadingFilters } =
    useDeclicFiltersOptions();

  // ───────────── Toggle filtres (persisté localStorage) ─────────────
  const [showFilters, setShowFilters] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("declic.showFilters");
    return saved != null ? saved === "1" : false;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("declic.showFilters", showFilters ? "1" : "0");
    }
  }, [showFilters]);

  // ───────────── Pagination ─────────────
  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    count,
    setCount,
    totalPages,
  } = usePagination();

  const hasActiveFilters = Boolean(
    filters.search ||
      filters.type_declic ||
      filters.centre ||
      filters.departement ||
      filters.annee ||
      filters.date_min ||
      filters.date_max ||
      filters.avec_archivees ||
      filters.archives_seules
  );

  const effectiveFilters = useMemo(
    () => ({ ...filters, page, page_size: pageSize }),
    [filters, page, pageSize]
  );

  // ───────────── Données Déclic ─────────────
  const { data, loading, error } = useDeclicList(effectiveFilters);
  const { remove } = useDeleteDeclic();
  const { restore } = useDesarchiverDeclic();
  const { hardDelete } = useHardDeleteDeclic();

  const items: Declic[] = useMemo(() => data?.results ?? [], [data]);

  useEffect(() => {
    setCount(data?.count ?? 0);
  }, [data, setCount]);

  // ───────────── Sélection multi ─────────────
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    const visible = new Set(items.map((i) => i.id));
    setSelectedIds((prev) => prev.filter((id) => visible.has(id)));
  }, [items]);

  // ───────────── Archivage ─────────────
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [hardDeleteId, setHardDeleteId] = useState<number | null>(null);
  const [anchorOptions, setAnchorOptions] = useState<null | HTMLElement>(null);

  const handleDelete = async () => {
    const idsToDelete = selectedId ? [selectedId] : selectedIds;
    if (!idsToDelete.length) return;

    try {
      await Promise.all(idsToDelete.map((id) => remove(id)));
      toast.success(
        `${idsToDelete.length} séance(s) Déclic archivée(s) avec succès.`
      );
      setShowConfirm(false);
      setSelectedId(null);
      setSelectedIds([]);
      setPage((p) =>
        items.length - idsToDelete.length <= 0 && p > 1 ? p - 1 : p
      );
      setFilters((f) => ({ ...f }));
    } catch {
      toast.error("La séance Déclic n'a pas pu être archivée.");
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await restore(id);
      toast.success("La séance Déclic a bien été restaurée.");
      setFilters((f) => ({ ...f }));
    } catch {
      toast.error("La séance Déclic n'a pas pu être restaurée.");
    }
  };

  const handleHardDelete = async () => {
    if (!hardDeleteId) return;

    try {
      await hardDelete(hardDeleteId);
      toast.success(
        "La séance Déclic archivée a été supprimée définitivement."
      );
      setHardDeleteId(null);
      setFilters((f) => ({ ...f }));
    } catch {
      toast.error(
        "La suppression définitive de la séance Déclic a échoué."
      );
    }
  };

  // ───────────── Détail ─────────────
  const [selectedDeclic, setSelectedDeclic] = useState<Declic | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const handleRowClick = (id: number) => {
    const d = items.find((i) => i.id === id);
    if (d) {
      setSelectedDeclic(d);
      setShowDetail(true);
    }
  };

  const footer =
    count > 0 ? (
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={1}
      >
        <Typography variant="body2" color="text.secondary">
          Page {page} / {totalPages} ({count} résultats)
        </Typography>
        <Pagination
          page={page}
          count={totalPages}
          onChange={(_, val) => setPage(val)}
          color="primary"
        />
      </Stack>
    ) : undefined;

  return (
    <PageTemplate
      refreshButton
      onRefresh={() => {
        setPage((p) => p);
        setFilters((f) => ({ ...f }));
      }}
      headerExtra={
        <SearchInput
          placeholder="🔍 Rechercher une séance Déclic..."
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
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          flexWrap="wrap"
          useFlexGap
        >
          <Button variant="outlined" onClick={() => setShowFilters((v) => !v)}>
            {showFilters ? "🫣 Masquer filtres" : "🔎 Afficher filtres"}
          </Button>

          {hasActiveFilters && (
            <Button variant="outlined" color="warning" onClick={resetAllFilters}>
              ♻️ Réinitialiser filtres
            </Button>
          )}

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
            {[5, 10, 20, 50].map((s) => (
              <MenuItem key={s} value={s}>
                {s} / page
              </MenuItem>
            ))}
          </Select>

          {canWriteDeclic && (
            <Button
              variant="contained"
              onClick={() => navigate("/declic/create")}
            >
              ➕ Ajouter une séance
            </Button>
          )}

          <Button
            variant="outlined"
            onClick={() => navigate("/participants-declic")}
          >
            👥 Gérer les participants
          </Button>

          <Button
            variant={
              filters.avec_archivees || filters.archives_seules
                ? "contained"
                : "outlined"
            }
            onClick={() =>
              setFilters((prev) =>
                prev.avec_archivees || prev.archives_seules
                  ? {
                      ...prev,
                      avec_archivees: undefined,
                      archives_seules: undefined,
                    }
                  : {
                      ...prev,
                      avec_archivees: true,
                      archives_seules: undefined,
                    }
              )
            }
          >
            {filters.avec_archivees || filters.archives_seules
              ? "Masquer archivées"
              : "Inclure archivées"}
          </Button>

          {(filters.avec_archivees || filters.archives_seules) && (
            <Button
              variant={filters.archives_seules ? "contained" : "outlined"}
              onClick={() =>
                setFilters((prev) =>
                  prev.archives_seules
                    ? {
                        ...prev,
                        archives_seules: undefined,
                        avec_archivees: undefined,
                      }
                    : {
                        ...prev,
                        archives_seules: true,
                        avec_archivees: true,
                      }
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
              <ExportButtonDeclic data={items} selectedIds={selectedIds} />
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
              <Button
                variant="outlined"
                onClick={() => setSelectedIds(items.map((i) => i.id))}
              >
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
        showFilters ? (
          <FiltresDeclicPanel
            options={loadingFilters ? undefined : filterOptions}
            values={filters}
            hideSearch
            onChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
            onRefresh={() => setFilters({ ...filters })}
            onReset={resetAllFilters}
          />
        ) : undefined
      }
      footer={footer}
    >
      {loading ? (
        <Box
          sx={{
            minHeight: 240,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box
          sx={{
            minHeight: 180,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography color="error" textAlign="center">
            ⚠️ {error.message || "Impossible de charger les séances Déclic."}
          </Typography>
        </Box>
      ) : !items.length ? (
        <Box
          sx={{
            minHeight: 180,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <Typography color="text.secondary">
            Aucune séance Déclic ne correspond aux filtres actuels.
          </Typography>
        </Box>
      ) : (
        <DeclicTable
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

      <DeclicDetailModal
        open={showDetail}
        onClose={() => setShowDetail(false)}
        declic={selectedDeclic}
        onEdit={(id) => navigate(`/declic/${id}/edit`)}
      />

      <Dialog open={showConfirm} onClose={() => setShowConfirm(false)}>
        <DialogTitle>Archiver la séance</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedId
              ? "Cette séance disparaîtra des listes standard, mais restera disponible dans les archives."
              : `Les ${selectedIds.length} séances sélectionnées disparaîtront des listes standard, mais resteront disponibles dans les archives.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirm(false)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Archiver
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(hardDeleteId)}
        onClose={() => setHardDeleteId(null)}
      >
        <DialogTitle>Suppression définitive</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Cette séance Déclic archivée sera supprimée définitivement. Cette
            action est irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHardDeleteId(null)}>Annuler</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleHardDelete}
          >
            Supprimer définitivement
          </Button>
        </DialogActions>
      </Dialog>
    </PageTemplate>
  );
}