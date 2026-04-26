import { useMemo, useState, useEffect, useCallback } from "react";
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
  Menu,
  TextField,
  Checkbox,
  ListItemText,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import api from "../../api/axios";

import {
  getApiErrorMessage,
  useListPartenaires,
  useDeletePartenaire,
  useDesarchiverPartenaire,
  useReafficherPartenaireDansMaListe,
  useHardDeletePartenaire,
  usePartenaireChoices,
  usePartenaireFilters,
} from "../../hooks/usePartenaires";
import { useMe } from "../../hooks/useUsers";
import usePagination from "../../hooks/usePagination";

import FiltresPartenairesPanel, {
  type PartenaireFilters,
} from "../../components/filters/FiltresPartenairesPanel";
import type { Partenaire } from "../../types/partenaire";
import { buildPartenaireExportQueryParams } from "../../api/lot1ImportExport";
import Lot1ExcelActions from "../../components/import_export/Lot1ExcelActions";
import PageTemplate from "../../components/PageTemplate";
import SearchInput from "../../components/SearchInput";
import ExportButtonPartenaires from "../../components/export_buttons/ExportButtonPartenaires";
import PartenairesTable from "./PartenaireTable";
import PartenaireDetailModal from "./PartenaireDetailModal";
import { isCoreStaffRole } from "../../utils/roleGroups";
import type { AppTheme } from "../../theme";

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */
const defaultFilters: PartenaireFilters = {
  search: "",
  city: "",
  secteur_activite: "",
  type: "",
  created_by: undefined,
  has_appairages: "",
  has_prospections: "",
};

type ColumnVisibilityItem = {
  key: string;
  label: string;
  hideable: boolean;
};

function isPaginatedPartenaires(d: unknown): d is { results: Partenaire[]; count: number } {
  if (typeof d !== "object" || d === null) return false;
  const obj = d as Record<string, unknown>;
  return Array.isArray(obj.results) && typeof obj.count === "number";
}

function dedupeByValueLabel<
  T extends { value?: string | number | null; label?: string | number | null },
>(arr: T[] = []): T[] {
  const seen = new Set<string>();
  return arr.filter((o) => {
    const k = `${String(o.value ?? "")}::${String(o.label ?? "")}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function dedupeById<T extends { id: number }>(arr: T[] = []): T[] {
  const seen = new Set<number>();
  return arr.filter((o) => {
    if (seen.has(o.id)) return false;
    seen.add(o.id);
    return true;
  });
}

/* ─────────────────────────────────────────────
   Composant principal
   ───────────────────────────────────────────── */
export default function PartenairesPage() {
  const navigate = useNavigate();
  const theme = useTheme<AppTheme>();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { user, loading: userLoading, error: userError } = useMe();
  const { remove } = useDeletePartenaire();
  const { restore } = useDesarchiverPartenaire();
  const { reafficher } = useReafficherPartenaireDansMaListe();
  const { hardDelete } = useHardDeletePartenaire();
  const { data: partenaireChoices } = usePartenaireChoices();
  const { data: filterOptions, loading: filtersLoading } = usePartenaireFilters();

  const isStaff = isCoreStaffRole(user?.role);

  const [filters, setFilters] = useState<PartenaireFilters>(defaultFilters);

  // ✅ Filtres fermés par défaut
  const [showFilters, setShowFilters] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("partenaires.showFilters", showFilters ? "1" : "0");
    }
  }, [showFilters]);

  const activeFiltersCount = useMemo(() => {
    const ignored = new Set(["search"]);
    return Object.entries(filters).filter(([k, v]) => {
      if (ignored.has(k)) return false;
      if (v == null) return false;
      if (typeof v === "string") return v.trim() !== "";
      if (Array.isArray(v)) return v.length > 0;
      return true;
    }).length;
  }, [filters]);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [hardDeleteId, setHardDeleteId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showBulkTypeDialog, setShowBulkTypeDialog] = useState(false);
  const [showBulkActionDialog, setShowBulkActionDialog] = useState(false);
  const [anchorImportExport, setAnchorImportExport] = useState<null | HTMLElement>(null);
  const [anchorColumns, setAnchorColumns] = useState<null | HTMLElement>(null);
  const [bulkType, setBulkType] = useState("");
  const [bulkAction, setBulkAction] = useState("");
  const [bulkUpdateLoading, setBulkUpdateLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const defaultVisibleColumnKeys = useMemo(
    () => [
      "select",
      "nom",
      "default_centre_nom",
      "type_display",
      "contact_nom",
      "contact_email",
      "contact_telephone",
      "zip_code",
      "city",
      "secteur_activite",
      "description",
      "created_at",
      "updated_at",
      "appairages",
      "prospections",
      "formations",
      "candidats",
    ],
    []
  );

  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(
    defaultVisibleColumnKeys
  );
  const [showActionsColumn, setShowActionsColumn] = useState(true);

  const columnVisibilityItems = useMemo<ColumnVisibilityItem[]>(
    () => [
      { key: "select", label: "Sélection", hideable: false },
      { key: "nom", label: "Nom partenaire", hideable: false },
      { key: "default_centre_nom", label: "Centre", hideable: true },
      { key: "type_display", label: "Type", hideable: true },
      { key: "contact_nom", label: "Contact", hideable: true },
      { key: "contact_email", label: "Email", hideable: true },
      { key: "contact_telephone", label: "Téléphone", hideable: true },
      { key: "zip_code", label: "CP", hideable: true },
      { key: "city", label: "Ville", hideable: true },
      { key: "secteur_activite", label: "Secteur", hideable: true },
      { key: "description", label: "Description", hideable: true },
      { key: "created_at", label: "Création", hideable: true },
      { key: "updated_at", label: "MAJ", hideable: true },
      { key: "appairages", label: "Appairages", hideable: true },
      { key: "prospections", label: "Prospections", hideable: true },
      { key: "formations", label: "Formations", hideable: true },
      { key: "candidats", label: "Candidats", hideable: true },
    ],
    []
  );

  const toggleColumnVisibility = useCallback(
    (key: string) => {
      setVisibleColumnKeys((prev) => {
        const item = columnVisibilityItems.find((col) => col.key === key);
        if (!item || item.hideable === false) return prev;

        const isVisible = prev.includes(key);
        if (isVisible) {
          const next = prev.filter((itemKey) => itemKey !== key);
          return next.length > 0 ? next : prev;
        }
        return [...prev, key];
      });
    },
    [columnVisibilityItems]
  );

  const { page, setPage, pageSize, setPageSize, count, setCount, totalPages } =
    usePagination();

  const partenaireIeParams = useMemo(
    () =>
      buildPartenaireExportQueryParams({
        search: filters.search,
        city: filters.city,
        secteur_activite: filters.secteur_activite,
        type: filters.type,
        created_by: isStaff ? filters.created_by : undefined,
        has_appairages: filters.has_appairages,
        has_prospections: filters.has_prospections,
        avec_archivees: filters.avec_archivees,
        archives_seules: filters.archives_seules,
      }),
    [
      filters.search,
      filters.city,
      filters.secteur_activite,
      filters.type,
      filters.created_by,
      filters.has_appairages,
      filters.has_prospections,
      filters.avec_archivees,
      filters.archives_seules,
      isStaff,
    ]
  );

  const queryParams = useMemo(() => {
    const base: Record<string, string | number | boolean> = {
      search: filters.search ?? "",
      page,
      page_size: pageSize,
      reloadKey,
    };
    if (isStaff && filters.created_by) base.created_by = filters.created_by as number;
    if (filters.city) base.city = filters.city;
    if (filters.secteur_activite) base.secteur_activite = filters.secteur_activite;
    if (filters.type) base.type = filters.type;
    if (filters.has_appairages) base.has_appairages = filters.has_appairages;
    if (filters.has_prospections) base.has_prospections = filters.has_prospections;
    if (filters.avec_archivees) base.avec_archivees = true;
    if (filters.archives_seules) base.archives_seules = true;
    return base;
  }, [filters, page, pageSize, reloadKey, isStaff]);

  const { data, loading, error } = useListPartenaires(queryParams);

  const partenaires: Partenaire[] = useMemo(() => {
    if (isPaginatedPartenaires(data)) return data.results;
    return Array.isArray(data) ? (data as Partenaire[]) : [];
  }, [data]);

  useEffect(() => {
    if (isPaginatedPartenaires(data)) setCount(data.count);
    else setCount(partenaires.length);
  }, [data, partenaires.length, setCount]);

  useEffect(() => {
    const visible = new Set(partenaires.map((p) => p.id));
    setSelectedIds((prev) => prev.filter((id) => visible.has(id)));
  }, [partenaires]);

  const handleDelete = async () => {
    const idsToDelete = selectedId ? [selectedId] : selectedIds;
    if (!idsToDelete.length) return;
    try {
      await Promise.all(idsToDelete.map((id) => remove(id)));
      toast.success(`📦 ${idsToDelete.length} partenaire(s) archivé(s)`);
      setShowConfirm(false);
      setSelectedId(null);
      setSelectedIds([]);
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Erreur lors de l'archivage");
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await restore(id);
      toast.success("Partenaire restauré");
      setReloadKey((k) => k + 1);
    } catch (err) {
      const msg = getApiErrorMessage(err);
      toast.error(msg || "Erreur lors de la restauration");
      if (import.meta.env.DEV) console.error("[restore partenaire]", err);
    }
  };

  const handleReafficherDansMaListe = async (id: number) => {
    try {
      await reafficher(id);
      toast.success("Fiche de nouveau affichée dans votre liste");
      setReloadKey((k) => k + 1);
    } catch (err) {
      const msg = getApiErrorMessage(err);
      toast.error(msg || "Erreur lors du réaffichage");
      if (import.meta.env.DEV) console.error("[reafficher partenaire]", err);
    }
  };

  const handleHardDelete = async () => {
    if (!hardDeleteId) return;
    try {
      await hardDelete(hardDeleteId);
      toast.success("Partenaire supprimé définitivement");
      setHardDeleteId(null);
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Erreur lors de la suppression définitive");
    }
  };

  const handleResetFilters = () => {
    setFilters(defaultFilters);
    setPage(1);
  };

  const clearSelection = () => setSelectedIds([]);

  const selectAll = () => setSelectedIds(partenaires.map((p) => p.id));

  const runBulkPartenaireUpdate = async (
    payload: Partial<Pick<Partenaire, "type" | "actions">>,
    successMessage: string
  ) => {
    if (!selectedIds.length) return;
    setBulkUpdateLoading(true);
    try {
      const results = await Promise.allSettled(
        selectedIds.map((id) => api.patch(`/partenaires/${id}/`, payload))
      );
      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const failureCount = results.length - successCount;

      if (successCount > 0) {
        toast.success(
          failureCount
            ? `${successMessage} pour ${successCount} partenaire(s). ${failureCount} échec(s) restent à vérifier.`
            : `${successMessage} pour ${successCount} partenaire(s).`
        );
      } else {
        toast.error("Aucun partenaire n'a pu être mis à jour.");
      }

      setShowBulkTypeDialog(false);
      setShowBulkActionDialog(false);
      setBulkType("");
      setBulkAction("");
      clearSelection();
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Erreur lors de la mise à jour en lot des partenaires.");
    } finally {
      setBulkUpdateLoading(false);
    }
  };

  const handleBulkTypeChange = async () => {
    if (!bulkType) {
      toast.info("Choisis un type à appliquer.");
      return;
    }
    await runBulkPartenaireUpdate(
      { type: bulkType as Partenaire["type"] },
      "Type mis à jour"
    );
  };

  const handleBulkActionChange = async () => {
    if (!bulkAction) {
      toast.info("Choisis une action à appliquer.");
      return;
    }
    await runBulkPartenaireUpdate(
      { actions: bulkAction as Partenaire["actions"] },
      "Action principale mise à jour"
    );
  };

  const userOptions = useMemo(() => dedupeById(filterOptions?.users ?? []), [filterOptions]);
  const cityOptions = useMemo(
    () => dedupeByValueLabel(filterOptions?.cities ?? []),
    [filterOptions]
  );
  const secteurOptions = useMemo(
    () => dedupeByValueLabel(filterOptions?.secteurs ?? []),
    [filterOptions]
  );

  // 🔹 Gestion de la modale de détail
  const [showDetail, setShowDetail] = useState(false);
  const [selectedPartenaire, setSelectedPartenaire] = useState<Partenaire | null>(null);

  const handleRowClick = (id: number) => {
    const partenaire = partenaires.find((p) => p.id === id);
    if (partenaire) {
      setSelectedPartenaire(partenaire);
      setShowDetail(true);
    }
  };

  const handleEdit = (id: number) => {
    setShowDetail(false);
    navigate(`/partenaires/${id}/edit`);
  };

  return (
    <PageTemplate
      refreshButton
      onRefresh={() => setReloadKey((k) => k + 1)}
      headerExtra={
        <SearchInput
          placeholder="Rechercher par nom, ville, secteur..."
          value={filters.search ?? ""}
          onChange={(e) => {
            setFilters({ ...filters, search: e.target.value });
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

          <Button variant="outlined" onClick={handleResetFilters}>
            Réinitialiser
          </Button>

          <Button
            variant="outlined"
            onClick={(event) => setAnchorColumns(event.currentTarget)}
            fullWidth={isMobile}
          >
            Colonnes
          </Button>

          <Button
            variant="outlined"
            onClick={(event) => setAnchorImportExport(event.currentTarget)}
            fullWidth={isMobile}
          >
            Import / Export
          </Button>

          <Button
            variant={filters.avec_archivees || filters.archives_seules ? "contained" : "outlined"}
            onClick={() => {
              setFilters((prev) =>
                prev.avec_archivees || prev.archives_seules
                  ? { ...prev, avec_archivees: undefined, archives_seules: undefined }
                  : { ...prev, avec_archivees: true, archives_seules: undefined }
              );
              setPage(1);
            }}
          >
            {filters.avec_archivees || filters.archives_seules
              ? "Masquer archivés"
              : "Inclure archivés"}
          </Button>

          {(filters.avec_archivees || filters.archives_seules) && (
            <Button
              variant={filters.archives_seules ? "contained" : "outlined"}
              onClick={() => {
                setFilters((prev) =>
                  prev.archives_seules
                    ? { ...prev, archives_seules: undefined, avec_archivees: undefined }
                    : { ...prev, archives_seules: true, avec_archivees: true }
                );
                setPage(1);
              }}
            >
              {filters.archives_seules ? "Voir tout" : "Archives seules"}
            </Button>
          )}

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
            onClick={() => navigate("/partenaires/create")}
            fullWidth={isMobile}
          >
            ➕ Nouveau partenaire
          </Button>

          <Menu
            anchorEl={anchorColumns}
            open={Boolean(anchorColumns)}
            onClose={() => setAnchorColumns(null)}
            PaperProps={{
              sx: {
                mt: 1,
                width: 320,
                maxWidth: "calc(100vw - 32px)",
                p: 1,
                borderRadius: 3,
              },
            }}
          >
            <Box sx={{ px: 1, pt: 0.5, pb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Colonnes visibles
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Afficher ou masquer les colonnes du tableau
              </Typography>
            </Box>

            {columnVisibilityItems.map((item) => {
              const checked = visibleColumnKeys.includes(item.key);

              return (
                <MenuItem
                  key={item.key}
                  onClick={() => {
                    if (!item.hideable) return;
                    toggleColumnVisibility(item.key);
                  }}
                  dense
                  disabled={!item.hideable}
                >
                  <Checkbox checked={checked} size="small" disabled={!item.hideable} />
                  <ListItemText
                    primary={item.label}
                    secondary={!item.hideable ? "Toujours affichée" : undefined}
                  />
                </MenuItem>
              );
            })}

            <MenuItem dense onClick={() => setShowActionsColumn((prev) => !prev)}>
              <Checkbox checked={showActionsColumn} size="small" />
              <ListItemText primary="Actions" />
            </MenuItem>

            <MenuItem
              dense
              onClick={() => {
                setVisibleColumnKeys(defaultVisibleColumnKeys);
                setShowActionsColumn(true);
              }}
            >
              <ListItemText primary="Réinitialiser" />
            </MenuItem>
          </Menu>

          <Menu
            anchorEl={anchorImportExport}
            open={Boolean(anchorImportExport)}
            onClose={() => setAnchorImportExport(null)}
            PaperProps={{
              sx: {
                mt: 1,
                width: 340,
                maxWidth: "calc(100vw - 32px)",
                p: 1.25,
                borderRadius: 3,
              },
            }}
          >
            <Box sx={{ px: 1, pt: 0.5, pb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Import / Export
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Actions d&apos;export et échanges Excel
              </Typography>
            </Box>

            <Stack spacing={1} sx={{ px: 1, pb: 1 }}>
              <ExportButtonPartenaires
                data={
                  selectedIds.length > 0
                    ? partenaires.filter((p) => selectedIds.includes(p.id))
                    : partenaires
                }
              />
              <Lot1ExcelActions
                resource="partenaire"
                exportParams={partenaireIeParams}
                isMobile={false}
              />
            </Stack>
          </Menu>

          {selectedIds.length > 0 && (
            <>
              <Button variant="contained" onClick={() => setShowBulkTypeDialog(true)}>
                Changer le type ({selectedIds.length})
              </Button>
              <Button variant="outlined" onClick={() => setShowBulkActionDialog(true)}>
                Changer l'action ({selectedIds.length})
              </Button>
              <Button color="error" onClick={() => setShowConfirm(true)}>
                Archiver ({selectedIds.length})
              </Button>
              <Button variant="outlined" onClick={selectAll}>
                Tout sélectionner
              </Button>
              <Button variant="outlined" onClick={clearSelection}>
                Annuler
              </Button>
            </>
          )}
        </Stack>
      }
      filters={
        showFilters && (
          <FiltresPartenairesPanel
            values={filters}
            onChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
            users={userOptions}
            typeOptions={partenaireChoices?.types ?? []}
            secteurOptions={secteurOptions}
            cityOptions={cityOptions}
            showCreatedByFilter={isStaff}
            loading={filtersLoading}
          />
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
      {userLoading || loading ? (
        <CircularProgress />
      ) : userError ? (
        <Typography color="error">Erreur utilisateur.</Typography>
      ) : error ? (
        <Typography color="error">Erreur lors du chargement des partenaires.</Typography>
      ) : partenaires.length === 0 ? (
        <Box textAlign="center" color="text.secondary" my={4}>
          <Box fontSize={48} mb={1}>
            📭
          </Box>
          <Typography>Aucun partenaire trouvé.</Typography>
        </Box>
      ) : (
        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <PartenairesTable
            partenaires={partenaires}
            selectedIds={selectedIds}
            buildProspectionsUrl={(partenaireId) => `/prospections?partenaire=${partenaireId}`}
            buildAppairagesUrl={(partenaireId) => `/appairages?partenaire=${partenaireId}`}
            onToggleSelect={(id) =>
              setSelectedIds((prev) =>
                prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
              )
            }
            onRowClick={handleRowClick}
            onDeleteClick={(id) => {
              setSelectedId(id);
              setShowConfirm(true);
            }}
            onRestoreClick={(id) => handleRestore(id)}
            onReafficherClick={handleReafficherDansMaListe}
            onHardDeleteClick={(id) => setHardDeleteId(id)}
            visibleColumnKeys={visibleColumnKeys}
            showActionsColumn={showActionsColumn}
            labeledArchiveActions
          />
        </Box>
      )}

      <PartenaireDetailModal
        open={showDetail}
        onClose={() => setShowDetail(false)}
        partenaire={selectedPartenaire}
        onEdit={handleEdit}
      />

      <Dialog open={showConfirm} onClose={() => setShowConfirm(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color="warning" />
          Confirmation
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedId
              ? "Archiver ce partenaire ?"
              : `Archiver les ${selectedIds.length} partenaires sélectionnés ?`}
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
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color="warning" />
          Suppression définitive
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Cette action est irréversible. Supprimer définitivement ce partenaire archivé ?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHardDeleteId(null)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleHardDelete}>
            Supprimer définitivement
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showBulkTypeDialog}
        onClose={() => setShowBulkTypeDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Changer le type des partenaires sélectionnés</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Le nouveau type sera appliqué aux {selectedIds.length} partenaire(s) sélectionné(s).
          </DialogContentText>
          <TextField
            select
            fullWidth
            label="Nouveau type"
            value={bulkType}
            onChange={(e) => setBulkType(e.target.value)}
          >
            {(partenaireChoices?.types ?? []).map((choice) => (
              <MenuItem key={choice.value} value={choice.value}>
                {choice.label}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBulkTypeDialog(false)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleBulkTypeChange}
            disabled={bulkUpdateLoading || !bulkType}
          >
            {bulkUpdateLoading ? "Mise à jour..." : "Appliquer"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showBulkActionDialog}
        onClose={() => setShowBulkActionDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Changer l'action principale des partenaires sélectionnés</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            L'action principale sera appliquée aux {selectedIds.length} partenaire(s) sélectionné(s).
          </DialogContentText>
          <TextField
            select
            fullWidth
            label="Nouvelle action"
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
          >
            {(partenaireChoices?.actions ?? []).map((choice) => (
              <MenuItem key={choice.value} value={choice.value}>
                {choice.label}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBulkActionDialog(false)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleBulkActionChange}
            disabled={bulkUpdateLoading || !bulkAction}
          >
            {bulkUpdateLoading ? "Mise à jour..." : "Appliquer"}
          </Button>
        </DialogActions>
      </Dialog>
    </PageTemplate>
  );
}