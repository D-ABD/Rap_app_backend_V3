import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Menu,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import PageTemplate from "src/components/PageTemplate";
import SearchInput from "src/components/SearchInput";
import usePagination from "src/hooks/usePagination";
import { useAuth } from "src/hooks/useAuth";
import { canWritePrepaRole, isAdminLikeRole } from "src/utils/roleGroups";
import {
  useStagiairesPrepaList,
  useStagiairesPrepaMeta,
  useDeleteStagiairePrepa,
  useDesarchiverStagiairePrepa,
  useHardDeleteStagiairePrepa,
  useExportStagiairesPrepa,
  useBulkArchiveStagiairesPrepa,
  useBulkRestoreStagiairesPrepa,
  useBulkHardDeleteStagiairesPrepa,
} from "src/hooks/useStagiairesPrepa";
import type { StagiairePrepa, StagiairePrepaFiltersValues } from "src/types/prepa";
import StagiairesPrepaTable from "./StagiairesPrepaTable";
import StagiairesPrepaDetailModal from "./StagiairesPrepaDetailModal";
import FiltresStagiairesPrepaPanel from "src/components/filters/FiltresStagiairesPrepaPanel";

export default function StagiairesPrepaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const canWritePrepa = canWritePrepaRole(user?.role);
  const canHardDelete = isAdminLikeRole(user?.role);
  const { exportList, exportPresence, exportEmargement } = useExportStagiairesPrepa();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [listBump, setListBump] = useState(0);
  const { page, setPage, pageSize, setPageSize, count, setCount, totalPages } = usePagination();

  const [avecArchivees, setAvecArchivees] = useState(false);
  const [archivesSeules, setArchivesSeules] = useState(false);

  const [anchorOptions, setAnchorOptions] = useState<null | HTMLElement>(null);
  const [anchorBulkActions, setAnchorBulkActions] = useState<null | HTMLElement>(null);

  const [selectedStag, setSelectedStag] = useState<StagiairePrepa | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState<boolean>(() => {
    const saved = localStorage.getItem("prepa.stagiaires.showFilters");
    return saved === "1";
  });
  const [filters, setFilters] = useState<StagiairePrepaFiltersValues>({
    ordering: "nom",
    page: 1,
  });

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [hardDeleteId, setHardDeleteId] = useState<number | null>(null);
  const [bulkAction, setBulkAction] = useState<null | "archive" | "restore" | "hardDelete">(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const { data: meta } = useStagiairesPrepaMeta({ for_filters: true });
  const metaOptions = useMemo(
    () =>
      (meta as
        | {
            centres?: Array<{ id: number; nom: string }>;
            statut_parcours?: Array<{ value: string | number; label: string }>;
            orientation_finale?: Array<{ value: string | number; label: string }>;
            type_atelier?: Array<{ value: string | number; label: string }>;
            pilotage?: Array<{ value: string | number; label: string }>;
          }
        | undefined) ?? undefined,
    [meta]
  );

  useEffect(() => {
    localStorage.setItem("prepa.stagiaires.showFilters", showFilters ? "1" : "0");
  }, [showFilters]);

  const prepaOrigine = useMemo(() => {
    const v = searchParams.get("prepa_origine");
    if (v == null) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }, [searchParams]);

  const prepaParticipation = useMemo(() => {
    const v = searchParams.get("prepa_participation");
    if (v == null) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const effectiveFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      centre: filters.centre,
      statut_parcours_calcule: filters.statut_parcours_calcule,
      atelier_en_cours: filters.atelier_en_cours,
      prochain_atelier_attendu: filters.prochain_atelier_attendu,
      orientation_finale: filters.orientation_finale,
      pilotage: filters.pilotage,
      date_ic_min: filters.date_ic_min,
      date_ic_max: filters.date_ic_max,
      page,
      page_size: pageSize,
      ordering: filters.ordering ?? ("nom" as const),
      prepa_origine: prepaOrigine,
      prepa_participation: prepaParticipation,
      _refresh: listBump,
      avec_archivees: avecArchivees || undefined,
      archives_seules: archivesSeules || undefined,
    }),
    [
      debouncedSearch,
      filters,
      page,
      pageSize,
      prepaOrigine,
      prepaParticipation,
      avecArchivees,
      archivesSeules,
      listBump,
    ]
  );

  const { data, loading, error } = useStagiairesPrepaList(effectiveFilters);
  const { remove } = useDeleteStagiairePrepa();
  const { restore } = useDesarchiverStagiairePrepa();
  const { hardDelete } = useHardDeleteStagiairePrepa();
  const { archiveMany } = useBulkArchiveStagiairesPrepa();
  const { restoreMany } = useBulkRestoreStagiairesPrepa();
  const { hardDeleteMany } = useBulkHardDeleteStagiairesPrepa();

  const items: StagiairePrepa[] = useMemo(() => data?.results ?? [], [data?.results]);

  useEffect(() => {
    setCount(data?.count ?? 0);
  }, [data?.count, setCount]);

  useEffect(() => {
    const visibleIds = new Set(items.map((item) => item.id).filter((id): id is number => typeof id === "number"));
    setSelectedIds((prev) => prev.filter((id) => visibleIds.has(id)));
  }, [items]);

  const hasArchiveFilter = Boolean(avecArchivees || archivesSeules);
  const hasResults = items.length > 0;
  const selectedItems = useMemo(
    () => items.filter((item) => typeof item.id === "number" && selectedIds.includes(item.id)),
    [items, selectedIds]
  );
  const activeSelectedIds = useMemo(
    () => selectedItems.filter((item) => item.is_active ?? true).map((item) => item.id!),
    [selectedItems]
  );
  const archivedSelectedIds = useMemo(
    () => selectedItems.filter((item) => !(item.is_active ?? true)).map((item) => item.id!),
    [selectedItems]
  );

  const buildCreateUrl = () => {
    if (prepaOrigine) return `/prepa/stagiaires/create?prepa_origine=${prepaOrigine}`;
    return "/prepa/stagiaires/create";
  };

  const handleRowClick = (id: number) => {
    const it = items.find((i) => i.id === id);
    if (it) {
      setSelectedStag(it);
      setShowDetail(true);
    }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    try {
      await remove(deleteId);
      toast.success("Fiche archivée");
      setShowConfirmDelete(false);
      setDeleteId(null);
      setPage((p) => (items.length <= 1 && p > 1 ? p - 1 : p));
      setListBump((b) => b + 1);
    } catch {
      toast.error("Erreur lors de l'archivage");
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await restore(id);
      toast.success("Fiche restaurée");
      setListBump((b) => b + 1);
    } catch {
      toast.error("Erreur de restauration");
    }
  };

  const handleHardDelete = async () => {
    if (hardDeleteId == null) return;
    try {
      await hardDelete(hardDeleteId);
      toast.success("Suppression définitive effectuée");
      setHardDeleteId(null);
      setListBump((b) => b + 1);
    } catch {
      toast.error("Erreur de suppression");
    }
  };

  const handleToggleSelect = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((value) => value !== id);
    });
  };

  const handleToggleSelectAll = (checked: boolean) => {
    const pageIds = items.map((item) => item.id).filter((id): id is number => typeof id === "number");
    setSelectedIds((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, ...pageIds]));
      }
      return prev.filter((id) => !pageIds.includes(id));
    });
  };

  const resetSelectionAndRefresh = () => {
    setSelectedIds([]);
    setListBump((b) => b + 1);
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedIds.length === 0) return;
    setBulkActionLoading(true);
    try {
      if (bulkAction === "archive") {
        await archiveMany(activeSelectedIds);
        toast.success(
          activeSelectedIds.length > 0
            ? `${activeSelectedIds.length} fiche(s) archivée(s).`
            : "Aucune fiche active à archiver dans la sélection."
        );
      } else if (bulkAction === "restore") {
        await restoreMany(archivedSelectedIds);
        toast.success(
          archivedSelectedIds.length > 0
            ? `${archivedSelectedIds.length} fiche(s) restaurée(s).`
            : "Aucune fiche archivée à restaurer dans la sélection."
        );
      } else if (bulkAction === "hardDelete") {
        await hardDeleteMany(archivedSelectedIds);
        toast.success(
          archivedSelectedIds.length > 0
            ? `${archivedSelectedIds.length} fiche(s) supprimée(s) définitivement.`
            : "Aucune fiche archivée à supprimer définitivement dans la sélection."
        );
      }
      setBulkAction(null);
      resetSelectionAndRefresh();
    } catch {
      toast.error("Action en lot impossible");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkActionLabel =
    bulkAction === "archive"
      ? "archiver"
      : bulkAction === "restore"
        ? "restaurer"
        : bulkAction === "hardDelete"
          ? "supprimer définitivement"
          : "";

  const bulkActionCount =
    bulkAction === "archive"
      ? activeSelectedIds.length
      : bulkAction === "restore" || bulkAction === "hardDelete"
        ? archivedSelectedIds.length
        : 0;

  return (
    <PageTemplate
      title="Stagiaires Prépa"
      subtitle="Suivi nominatif des personnes en parcours Prépa (sans compte candidat imposé)."
      backButton
      onBack={() => navigate(-1)}
      refreshButton
      onRefresh={() => setListBump((b) => b + 1)}
      headerExtra={
        <SearchInput
          placeholder="Rechercher un stagiaire (nom, prénom)…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      }
      filters={
        showFilters ? (
          <FiltresStagiairesPrepaPanel
            options={metaOptions}
            values={filters}
            onChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
            onRefresh={() => setListBump((b) => b + 1)}
            onReset={() => {
              setFilters({
                ordering: "nom",
                page: 1,
              });
              setPage(1);
            }}
          />
        ) : undefined
      }
      showFilters={showFilters}
      actions={
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap flexWrap="wrap">
          <Button variant="outlined" onClick={() => setShowFilters((v) => !v)}>
            {showFilters ? "Masquer filtres" : "Afficher filtres"}
          </Button>
          <Button variant="outlined" onClick={(e) => setAnchorOptions(e.currentTarget)}>
            Exports
          </Button>
          <Menu
            anchorEl={anchorOptions}
            open={Boolean(anchorOptions)}
            onClose={() => setAnchorOptions(null)}
          >
            <MenuItem
              onClick={async () => {
                setAnchorOptions(null);
                try {
                  await exportList();
                } catch {
                  toast.error("Export indisponible");
                }
              }}
            >
              Export liste (XLSX)
            </MenuItem>
            <MenuItem
              onClick={async () => {
                setAnchorOptions(null);
                try {
                  await exportPresence();
                } catch {
                  toast.error("Export indisponible");
                }
              }}
            >
              Export présence
            </MenuItem>
            <MenuItem
              onClick={async () => {
                setAnchorOptions(null);
                try {
                  await exportEmargement();
                } catch {
                  toast.error("Export indisponible");
                }
              }}
            >
              Export émargement
            </MenuItem>
          </Menu>

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

          {canWritePrepa && (
            <Button variant="contained" onClick={() => navigate(buildCreateUrl())}>
              Nouveau stagiaire Prépa
            </Button>
          )}

          {canWritePrepa && selectedIds.length > 0 && (
            <Button variant="contained" color="secondary" onClick={(e) => setAnchorBulkActions(e.currentTarget)}>
              Actions sélection ({selectedIds.length})
            </Button>
          )}

          <Menu
            anchorEl={anchorBulkActions}
            open={Boolean(anchorBulkActions)}
            onClose={() => setAnchorBulkActions(null)}
          >
            <MenuItem
              disabled={activeSelectedIds.length === 0}
              onClick={() => {
                setAnchorBulkActions(null);
                setBulkAction("archive");
              }}
            >
              Archiver la sélection
            </MenuItem>
            <MenuItem
              disabled={archivedSelectedIds.length === 0}
              onClick={() => {
                setAnchorBulkActions(null);
                setBulkAction("restore");
              }}
            >
              Restaurer la sélection
            </MenuItem>
            <MenuItem
              disabled={!canHardDelete || archivedSelectedIds.length === 0}
              onClick={() => {
                setAnchorBulkActions(null);
                setBulkAction("hardDelete");
              }}
            >
              Supprimer définitivement
            </MenuItem>
          </Menu>

          <Button
            variant={hasArchiveFilter ? "contained" : "outlined"}
            onClick={() => {
              if (avecArchivees || archivesSeules) {
                setAvecArchivees(false);
                setArchivesSeules(false);
              } else {
                setAvecArchivees(true);
                setArchivesSeules(false);
              }
            }}
          >
            {hasArchiveFilter ? "Masquer archivées" : "Inclure archivées"}
          </Button>

          {hasArchiveFilter && (
            <Button
              variant={archivesSeules ? "contained" : "outlined"}
              onClick={() =>
                setArchivesSeules((prev) => {
                  if (prev) return false;
                  setAvecArchivees(true);
                  return true;
                })
              }
            >
              {archivesSeules ? "Voir tout" : "Archives seules"}
            </Button>
          )}
        </Stack>
      }
      footer={
        count > 0 ? (
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
              onChange={(_, v) => setPage(v)}
              color="primary"
            />
          </Stack>
        ) : null
      }
    >
      {prepaOrigine ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Filtre actif : fiches parcours rattachées au point d&apos;entrée Prépa n°&nbsp;{prepaOrigine}
        </Typography>
      ) : null}
      {prepaParticipation ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Filtre actif : participants de la séance Prépa n°&nbsp;{prepaParticipation}
        </Typography>
      ) : null}

      {selectedIds.length > 0 ? (
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", md: "center" }}
          justifyContent="space-between"
          sx={{ mb: 2, p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}
        >
          <Typography variant="body2">
            {selectedIds.length} fiche(s) sélectionnée(s) sur cette page.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              size="small"
              variant="outlined"
              disabled={!activeSelectedIds.length}
              onClick={() => setBulkAction("archive")}
            >
              Archiver
            </Button>
            <Button
              size="small"
              variant="outlined"
              disabled={!archivedSelectedIds.length}
              onClick={() => setBulkAction("restore")}
            >
              Restaurer
            </Button>
            {canHardDelete ? (
              <Button
                size="small"
                color="error"
                variant="outlined"
                disabled={!archivedSelectedIds.length}
                onClick={() => setBulkAction("hardDelete")}
              >
                Supprimer définitivement
              </Button>
            ) : null}
            <Button size="small" onClick={() => setSelectedIds([])}>
              Vider la sélection
            </Button>
          </Stack>
        </Stack>
      ) : null}

      {loading && hasResults ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Rafraîchissement de la liste…
        </Typography>
      ) : null}

      {loading && !hasResults ? (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
          <CircularProgress />
        </Stack>
      ) : error ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography color="error">Erreur de chargement des stagiaires Prépa</Typography>
        </Box>
      ) : !hasResults ? (
        <Box sx={{ textAlign: "center", color: "text.secondary", py: 4 }}>
          <Typography>Aucun stagiaire Prépa trouvé.</Typography>
        </Box>
      ) : (
        <StagiairesPrepaTable
          items={items}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
          onRowClick={handleRowClick}
          onEdit={(id) => navigate(`/prepa/stagiaires/${id}/edit`)}
          onDelete={(id) => {
            setDeleteId(id);
            setShowConfirmDelete(true);
          }}
          onRestore={handleRestore}
          canHardDelete={canHardDelete}
          onHardDelete={setHardDeleteId}
        />
      )}

      <StagiairesPrepaDetailModal
        open={showDetail}
        onClose={() => {
          setShowDetail(false);
          setSelectedStag(null);
        }}
        stagiaire={selectedStag}
        onEdit={
          canWritePrepa
            ? (id) => {
                setShowDetail(false);
                navigate(`/prepa/stagiaires/${id}/edit`);
              }
            : undefined
        }
      />

      <Dialog open={showConfirmDelete} onClose={() => setShowConfirmDelete(false)}>
        <DialogTitle>Archiver cette fiche ?</DialogTitle>
        <DialogContent>
          <DialogContentText>Le stagiaire Prépa sera retiré des listes actives.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDelete(false)}>Annuler</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Archiver
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={hardDeleteId != null} onClose={() => setHardDeleteId(null)}>
        <DialogTitle>Suppression définitive</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Cette fiche archivée sera supprimée de manière irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHardDeleteId(null)}>Annuler</Button>
          <Button onClick={handleHardDelete} color="error" variant="contained">
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={bulkAction != null}
        onClose={() => {
          if (!bulkActionLoading) setBulkAction(null);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color={bulkAction === "hardDelete" ? "error" : "warning"} />
          Confirmation
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {bulkAction === "hardDelete"
              ? `Cette action est irréversible. Voulez-vous vraiment supprimer définitivement ${bulkActionCount} fiche(s) archivée(s) ?`
              : `Voulez-vous vraiment ${bulkActionLabel} ${bulkActionCount} fiche(s) sélectionnée(s) ?`}
          </DialogContentText>
          {bulkActionCount !== selectedIds.length ? (
            <DialogContentText sx={{ mt: 1 }}>
              Certaines fiches de la sélection ne sont pas éligibles à cette action et seront ignorées.
            </DialogContentText>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button disabled={bulkActionLoading} onClick={() => setBulkAction(null)}>
            Annuler
          </Button>
          <Button
            color={bulkAction === "hardDelete" ? "error" : "primary"}
            variant="contained"
            disabled={bulkActionLoading || bulkActionCount === 0}
            onClick={() => void handleBulkAction()}
          >
            {bulkAction === "archive"
              ? "Archiver"
              : bulkAction === "restore"
                ? "Restaurer"
                : "Supprimer"}
          </Button>
        </DialogActions>
      </Dialog>
    </PageTemplate>
  );
}
