// src/pages/formations/FormationsPage.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Stack,
  Button,
  Typography,
  TextField,
  Select,
  MenuItem,
  Pagination,
  Menu,
  Box,
  Checkbox,
  ListItemText,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import api from "../../api/axios";

import FormationTable from "./FormationTable";
import FiltresFormationsPanel from "../../components/filters/FiltresFormationsPanel";
import usePagination from "../../hooks/usePagination";
import useFetch from "../../hooks/useFetch";
import useFiltresFormations from "../../hooks/useFiltresFormations";
import type {
  Formation,
  FiltresFormationsValues,
  PaginatedResponse,
} from "../../types/formation";
import { useAuth } from "../../hooks/useAuth";
import { canWriteFormationsRole } from "../../utils/roleGroups";
import PageTemplate from "../../components/PageTemplate";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import EmptyState from "../../components/ui/EmptyState";
import LoadingState from "../../components/ui/LoadingState";
import FormationExportButton from "../../components/export_buttons/ExportButtonFormation";
import Lot1ExcelActions from "../../components/import_export/Lot1ExcelActions";
import { buildFormationExportQueryParams } from "../../api/lot1ImportExport";
import { useHardDeleteFormation } from "../../hooks/useFormations";
import type { AppTheme } from "../../theme";

export default function FormationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme<AppTheme>();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const canWriteFormations = canWriteFormationsRole(user?.role);

  // ── sélection / archivage
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [hardDeleteId, setHardDeleteId] = useState<number | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [anchorImportExport, setAnchorImportExport] = useState<null | HTMLElement>(
    null
  );
  const [anchorColumns, setAnchorColumns] = useState<null | HTMLElement>(null);

  // ── filtres
  const [filters, setFilters] = useState<FiltresFormationsValues>({
    texte: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  // ── colonnes visibles
  const defaultVisibleColumnKeys = useMemo(
    () => [
      "select",
      "nom",
      "centre.nom",
      "activite",
      "type_offre",
      "statut",
      "num_offre",
      "periode",
      "saturation",
      "inscrits_total",
      "places_restantes_total",
      "entrees_presents_formation",
      "num_kairos",
      "candidats_entretiens",
      "prospections_appairages",
      "nombre_evenements",
      "taux_transformation",
    ],
    []
  );

  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(
    defaultVisibleColumnKeys
  );
  const [showActionsColumn, setShowActionsColumn] = useState(true);

  const columnVisibilityItems = useMemo(
    () => [
      { key: "select", label: "Sélection", hideable: false },
      { key: "nom", label: "Formation", hideable: false },
      { key: "centre.nom", label: "Centre", hideable: true },
      { key: "activite", label: "Activité", hideable: true },
      { key: "type_offre", label: "Type", hideable: true },
      { key: "statut", label: "Statut", hideable: true },
      { key: "num_offre", label: "N° Offre", hideable: true },
      { key: "periode", label: "Période", hideable: true },
      { key: "saturation", label: "Saturation", hideable: true },
      { key: "inscrits_total", label: "Inscrits", hideable: true },
      { key: "places_restantes_total", label: "Places restantes", hideable: true },
      { key: "entrees_presents_formation", label: "En formation", hideable: true },
      { key: "num_kairos", label: "N° Kairos", hideable: true },
      { key: "candidats_entretiens", label: "Candidats / Entretiens", hideable: true },
      {
        key: "prospections_appairages",
        label: "Prospections / Appairages",
        hideable: true,
      },
      { key: "nombre_evenements", label: "Événements", hideable: true },
      { key: "taux_transformation", label: "Transformation", hideable: true },
    ],
    []
  );

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
  const { page, setPage, count, setCount, totalPages, pageSize, setPageSize } =
    usePagination();

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
    const freeText = texte?.trim() || undefined;
    return {
      ...rest,
      search: freeText,
      texte: freeText,
    };
  }, [effectiveFilters]);

  const formationIeParams = useMemo(
    () =>
      buildFormationExportQueryParams({
        texte: filters.texte,
        centre: filters.centre,
        statut: filters.statut,
        type_offre: filters.type_offre,
        date_debut: filters.date_debut,
        date_fin: filters.date_fin,
        places_disponibles: filters.places_disponibles,
        tri: filters.tri,
        dans: filters.dans,
        avec_archivees: filters.avec_archivees,
        activite: filters.activite,
        annee: filters.annee,
      }),
    [
      filters.texte,
      filters.centre,
      filters.statut,
      filters.type_offre,
      filters.date_debut,
      filters.date_fin,
      filters.places_disponibles,
      filters.tri,
      filters.dans,
      filters.avec_archivees,
      filters.activite,
      filters.annee,
    ]
  );

  const { data, loading, error, fetchData } = useFetch<PaginatedResponse<Formation>>(
    "/formations/",
    apiFilters,
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
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, []);

  const toggleColumnVisibility = useCallback((key: string) => {
    setVisibleColumnKeys((prev) => {
      const isVisible = prev.includes(key);
      if (isVisible) {
        const next = prev.filter((item) => item !== key);
        return next.length > 0 ? next : prev;
      }
      return [...prev, key];
    });
  }, []);

  const clearSelection = () => setSelectedIds([]);
  const selectAll = () => setSelectedIds(formations.map((f) => f.id));

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setFilters((prev) => ({
        ...prev,
        texte: event.target.value,
      }));
      setPage(1);
    },
    [setPage]
  );

  const handleSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape" && filters.texte) {
        event.preventDefault();
        setFilters((prev) => ({
          ...prev,
          texte: "",
        }));
        setPage(1);
      }
    },
    [filters.texte, setPage]
  );

  const handleDelete = async () => {
    const idsToDelete = selectedId ? [selectedId] : selectedIds;
    if (!idsToDelete.length) return;

    setArchiveLoading(true);
    try {
      await Promise.all(idsToDelete.map((id) => api.delete(`/formations/${id}/`)));
      toast.success(`📦 ${idsToDelete.length} formation(s) archivée(s)`);
      setShowConfirm(false);
      setSelectedId(null);
      setSelectedIds([]);
      fetchData();
    } catch {
      toast.error("Erreur lors de l'archivage");
    } finally {
      setArchiveLoading(false);
    }
  };

  const hardDeleteFormation = useHardDeleteFormation(hardDeleteId ?? 0);

  const handleToggleArchive = useCallback(
    async (row: Formation) => {
      try {
        if (row.activite === "archivee") {
          await api.post(`/formations/${row.id}/desarchiver/`);
          toast.success("Formation restaurée");
        } else {
          await api.post(`/formations/${row.id}/archiver/`);
          toast.success("Formation archivée");
        }
        fetchData();
      } catch {
        toast.error("Erreur lors du changement d'archivage");
      }
    },
    [fetchData]
  );

  const handleConfirmHardDelete = useCallback(async () => {
    if (!hardDeleteId) return;
    try {
      await hardDeleteFormation.hardDelete();
      setHardDeleteId(null);
      fetchData();
    } catch {
      // toast géré dans le hook
    }
  }, [fetchData, hardDeleteFormation, hardDeleteId]);

  const handleRowClick = (id: number) => navigate(`/formations/${id}/edit`);

  return (
    <PageTemplate
      backButton
      onBack={() => navigate(-1)}
      refreshButton
      onRefresh={fetchData}
      headerExtra={
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap={{ xs: "wrap", md: "nowrap" }}
        >
          <TextField
            type="search"
            size="small"
            fullWidth
            value={filters.texte ?? ""}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            placeholder="🔎 Recherche libre (nom, numeros, diplome, centre, CFA, type, statut, assistante…)"
          />
          {filters.texte && (
            <Button
              variant="outlined"
              onClick={() => {
                setFilters((prev) => ({ ...prev, texte: "" }));
                setPage(1);
              }}
            >
              ✕
            </Button>
          )}
        </Stack>
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
            variant={
              filters.avec_archivees || filters.activite === "archivee"
                ? "contained"
                : "outlined"
            }
            onClick={() => {
              setFilters((prev) =>
                prev.avec_archivees || prev.activite === "archivee"
                  ? { ...prev, avec_archivees: undefined, activite: undefined }
                  : { ...prev, avec_archivees: true, activite: undefined }
              );
              setPage(1);
            }}
            fullWidth={isMobile}
          >
            {filters.avec_archivees || filters.activite === "archivee"
              ? "Masquer archivées"
              : "Inclure archivées"}
          </Button>

          {(filters.avec_archivees || filters.activite === "archivee") && (
            <Button
              variant={filters.activite === "archivee" ? "contained" : "outlined"}
              onClick={() => {
                setFilters((prev) =>
                  prev.activite === "archivee"
                    ? { ...prev, activite: undefined, avec_archivees: undefined }
                    : { ...prev, activite: "archivee", avec_archivees: true }
                );
                setPage(1);
              }}
              fullWidth={isMobile}
            >
              {filters.activite === "archivee" ? "Voir tout" : "Archives seules"}
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

          {canWriteFormations && (
            <Button
              variant="contained"
              onClick={() => navigate("/formations/create")}
              fullWidth={isMobile}
            >
              ➕ Ajouter une formation
            </Button>
          )}

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
                  <ListItemText primary={item.label} />
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
                Actions techniques et échanges Excel
              </Typography>
            </Box>

            <Stack spacing={1} sx={{ px: 1, pb: 1 }}>
              <FormationExportButton selectedIds={selectedIds} />
              <Lot1ExcelActions
                resource="formation"
                exportParams={formationIeParams}
                isMobile={false}
              />
            </Stack>
          </Menu>

          {selectedIds.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button variant="contained" color="error" onClick={() => setShowConfirm(true)}>
                📦 Archiver ({selectedIds.length})
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
          <LoadingState inline label="Chargement des filtres..." minHeight={120} />
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
        <LoadingState label="Chargement des formations..." />
      ) : error ? (
        <Typography color="error">Erreur lors du chargement des formations.</Typography>
      ) : formations.length === 0 ? (
        <EmptyState
          title="Aucune formation trouvée"
          description="Modifiez la recherche ou créez une formation."
          action={
            canWriteFormations ? (
              <Button variant="contained" onClick={() => navigate("/formations/create")}>
                Ajouter une formation
              </Button>
            ) : undefined
          }
        />
      ) : (
        <FormationTable
          formations={formations}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onRowClick={handleRowClick}
          onToggleArchive={handleToggleArchive}
          onHardDelete={(row) => setHardDeleteId(row.id)}
          visibleColumnKeys={visibleColumnKeys}
          showActionsColumn={showActionsColumn}
        />
      )}

      <ConfirmDialog
        open={showConfirm}
        onClose={() => !archiveLoading && setShowConfirm(false)}
        onConfirm={handleDelete}
        loading={archiveLoading}
        tone="warning"
        title="Confirmation"
        description={
          selectedId
            ? "Archiver cette formation ?"
            : `Archiver les ${selectedIds.length} formations sélectionnées ?`
        }
        confirmLabel="Archiver"
        cancelLabel="Annuler"
      />

      <ConfirmDialog
        open={Boolean(hardDeleteId)}
        onClose={() => !hardDeleteFormation.loading && setHardDeleteId(null)}
        onConfirm={handleConfirmHardDelete}
        loading={hardDeleteFormation.loading}
        tone="danger"
        title="Supprimer définitivement la formation"
        description="Cette action est irréversible. La formation archivée sera supprimée physiquement."
        confirmLabel="Supprimer définitivement"
        cancelLabel="Annuler"
      />
    </PageTemplate>
  );
}