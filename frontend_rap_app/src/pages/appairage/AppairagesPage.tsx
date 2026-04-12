import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  FormControl,
  InputLabel,
  SelectChangeEvent,
  useMediaQuery,
  useTheme,
  Menu,
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
import { useAuth } from "../../hooks/useAuth";
import SearchInput from "../../components/SearchInput";
import { isAdminLikeRole } from "../../utils/roleGroups";
import type { AppTheme } from "../../theme";

type AppairagePageFilters = AppairageFiltresValues & {
  centre?: number;
};

export const AppairagesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const theme = useTheme<AppTheme>();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { user } = useAuth();
  const canHardDelete = isAdminLikeRole(user?.role);

  const toNum = (value: string | null): number | undefined => {
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const parseBool = (value: string | null): boolean | undefined => {
    if (!value) return undefined;
    return ["1", "true", "yes"].includes(value.toLowerCase());
  };

  const urlFilters = useMemo<AppairagePageFilters>(
    () => ({
      statut: searchParams.get("statut") || undefined,
      partenaire: toNum(searchParams.get("partenaire")),
      formation: toNum(searchParams.get("formation")),
      candidat: toNum(searchParams.get("candidat")),
      search: searchParams.get("search") || undefined,
      created_by: toNum(searchParams.get("created_by")),
      centre: toNum(searchParams.get("centre")),
      activite: (searchParams.get("activite") as AppairageFiltresValues["activite"]) || undefined,
      avec_archivees: parseBool(searchParams.get("avec_archivees")),
      annee: toNum(searchParams.get("annee")),
      date_min: searchParams.get("date_min") || undefined,
      date_max: searchParams.get("date_max") || undefined,
    }),
    [searchParams]
  );

  const [filters, setFilters] = useState<AppairagePageFilters>(urlFilters);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [hardDeleteId, setHardDeleteId] = useState<number | null>(null);
  const [showBulkStatusDialog, setShowBulkStatusDialog] = useState(false);
  const [anchorOptions, setAnchorOptions] = useState<null | HTMLElement>(null);
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [bulkStatusLoading, setBulkStatusLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // 🔹 Modale de détail
  const [showDetail, setShowDetail] = useState(false);
  const [selectedAppairage, setSelectedAppairage] = useState<AppairageListItem | null>(null);

  // 🔹 Masqué par défaut
  const [showFilters, setShowFilters] = useState<boolean>(false);

  const { page, setPage, pageSize, setPageSize, count, setCount, totalPages } = usePagination();

  useEffect(() => {
    setFilters(urlFilters);
    setPage(1);
  }, [urlFilters, setPage]);

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

  const clearSelection = () => setSelectedIds([]);
  const selectAll = () => setSelectedIds(appairages.map((a) => a.id));

  const handleDelete = async () => {
    const idsToDelete = selectedId ? [selectedId] : selectedIds;
    if (!idsToDelete.length) return;
    try {
      const mod = await import("../../api/axios");
      const api = mod.default as import("axios").AxiosInstance;
      await Promise.all(idsToDelete.map((id) => api.delete(`/appairages/${id}/`)));
      toast.success(`📦 ${idsToDelete.length} appairage(s) archivé(s)`);
      setShowConfirm(false);
      setSelectedId(null);
      setSelectedIds([]);
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Impossible d'archiver un ou plusieurs appairages.");
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

  const handleRestoreClick = async (id: number) => {
    try {
      const mod = await import("../../api/axios");
      const api = mod.default as import("axios").AxiosInstance;
      await api.post(`/appairages/${id}/desarchiver/`);
      toast.success("♻️ Appairage restauré");
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Impossible de restaurer cet appairage.");
    }
  };

  const handleHardDeleteClick = async () => {
    if (!hardDeleteId) return;
    try {
      const mod = await import("../../api/axios");
      const api = mod.default as import("axios").AxiosInstance;
      await api.post(`/appairages/${hardDeleteId}/hard-delete/`);
      toast.success("🗑️ Appairage supprimé définitivement");
      setHardDeleteId(null);
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Impossible de supprimer définitivement cet appairage.");
    }
  };

  const handleBulkStatusChange = async () => {
    if (!selectedIds.length || !bulkStatus) {
      toast.error("Choisis d'abord un statut à appliquer.");
      return;
    }

    setBulkStatusLoading(true);
    try {
      const mod = await import("../../api/axios");
      const api = mod.default as import("axios").AxiosInstance;
      const results = await Promise.allSettled(
        selectedIds.map((id) => api.patch(`/appairages/${id}/`, { statut: bulkStatus }))
      );

      const succeeded = results.filter((result) => result.status === "fulfilled").length;
      const failed = results.length - succeeded;

      if (failed === 0) {
        toast.success(`Statut mis à jour pour ${succeeded} appairage(s).`);
      } else if (succeeded === 0) {
        toast.error("Aucun appairage n'a pu être mis à jour.");
      } else {
        toast.warning(`Statut mis à jour pour ${succeeded} appairage(s). ${failed} échec(s).`);
      }

      setShowBulkStatusDialog(false);
      setBulkStatus("");
      setSelectedIds([]);
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Impossible de changer le statut des appairages sélectionnés.");
    } finally {
      setBulkStatusLoading(false);
    }
  };

  const handleHistoryClick = (id: number) => navigate(`/appairages/${id}/historiques`);

  const handleEdit = (id: number) => {
    setShowDetail(false);
    navigate(`/appairages/${id}/edit`);
  };

  return (
    <PageTemplate
      backButton
      onBack={() => navigate(-1)}
      refreshButton
      onRefresh={() => setReloadKey((k) => k + 1)}
      headerExtra={
        <SearchInput
          placeholder="🔍 Rechercher un appairage..."
          value={filters.search ?? ""}
          onChange={(e) => {
            setFilters((prev) => ({ ...prev, search: e.target.value || undefined }));
            setPage(1);
          }}
        />
      }
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

          <Button variant="outlined" onClick={(event) => setAnchorOptions(event.currentTarget)}>
            Options
          </Button>

          <Button
            variant="outlined"
            fullWidth={isMobile}
            onClick={() => {
              setFilters((prev) => {
                const next = !prev.avec_archivees;
                if (!next && prev.activite === "archive") {
                  return { ...prev, avec_archivees: undefined, activite: undefined };
                }
                return { ...prev, avec_archivees: next ? true : undefined };
              });
              setPage(1);
            }}
          >
            {filters.avec_archivees ? "🗂️ Masquer archivés" : "🗃️ Inclure archivés"}
          </Button>

          <Button
            variant="outlined"
            fullWidth={isMobile}
            onClick={() => {
              setFilters((prev) => {
                const archivesOnly = prev.activite === "archive";
                return archivesOnly
                  ? { ...prev, activite: undefined, avec_archivees: undefined }
                  : { ...prev, activite: "archive", avec_archivees: true };
              });
              setPage(1);
            }}
          >
            {filters.activite === "archive" ? "📂 Voir tout" : "🗄️ Archives seules"}
          </Button>

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
              <ExportButtonAppairage
                selectedIds={selectedIds}
                label="Exporter"
                filenameBase="appairages"
                endpointBase="/appairages"
              />
            </Stack>
          </Menu>

          {selectedIds.length > 0 && (
            <>
              <Button variant="contained" onClick={() => setShowBulkStatusDialog(true)}>
                Changer le statut ({selectedIds.length})
              </Button>
              <Button color="error" variant="contained" onClick={() => setShowConfirm(true)}>
                📦 Archiver ({selectedIds.length})
              </Button>
              <Button variant="outlined" onClick={selectAll}>
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
        showFilters && (
          <>
            {loadingMeta ? (
              <CircularProgress />
            ) : (meta as AppairageMeta | undefined)?.statut_choices ? (
              <AppairageFilters
                meta={meta as AppairageMeta}
                values={filters}
                hideSearch
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
          onRestoreClick={handleRestoreClick}
          onHardDeleteClick={(id) => setHardDeleteId(id)}
          canHardDelete={canHardDelete}
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

      {/* ───────────── Confirmation archivage ───────────── */}
      <Dialog open={showConfirm} onClose={() => setShowConfirm(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color="warning" />
          Confirmation
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedId
              ? "Archiver cet appairage ?"
              : `Archiver les ${selectedIds.length} appairages sélectionnés ?`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirm(false)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Archiver
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showBulkStatusDialog} onClose={() => setShowBulkStatusDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Changer le statut des appairages sélectionnés</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Choisis le nouveau statut à appliquer aux {selectedIds.length} appairage(s) sélectionné(s).
          </DialogContentText>
          <FormControl fullWidth>
            <InputLabel id="bulk-appairage-status-label">Nouveau statut</InputLabel>
            <Select
              labelId="bulk-appairage-status-label"
              value={bulkStatus}
              label="Nouveau statut"
              onChange={(event: SelectChangeEvent) => setBulkStatus(event.target.value)}
            >
              {(meta as AppairageMeta | undefined)?.statut_choices?.map((choice) => (
                <MenuItem key={choice.value} value={choice.value}>
                  {choice.label}
                </MenuItem>
              )) ?? []}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBulkStatusDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleBulkStatusChange} disabled={bulkStatusLoading || !bulkStatus}>
            {bulkStatusLoading ? "Mise à jour..." : "Appliquer"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={hardDeleteId !== null} onClose={() => setHardDeleteId(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color="error" />
          Suppression définitive
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Cette action est irréversible. L'appairage archivé sera supprimé définitivement.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHardDeleteId(null)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleHardDeleteClick}>
            Supprimer définitivement
          </Button>
        </DialogActions>
      </Dialog>
    </PageTemplate>
  );
};

export default AppairagesPage;
