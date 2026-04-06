// src/pages/formations/FormationsPage.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Box,
  Stack,
  Button,
  Typography,
  TextField,
  Select,
  MenuItem,
  Pagination,
  useMediaQuery,
  useTheme,
} from "@mui/material";

import FormationTable from "./FormationTable";
import FiltresFormationsPanel from "../../components/filters/FiltresFormationsPanel";
import usePagination from "../../hooks/usePagination";
import useFetch from "../../hooks/useFetch";
import useFiltresFormations from "../../hooks/useFiltresFormations";
import type { Formation, FiltresFormationsValues, PaginatedResponse } from "../../types/formation";
import PageTemplate from "../../components/PageTemplate";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import EmptyState from "../../components/ui/EmptyState";
import LoadingState from "../../components/ui/LoadingState";
import FormationExportButton from "../../components/export_buttons/ExportButtonFormation";
import { useHardDeleteFormation } from "../../hooks/useFormations";

export default function FormationsPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // ── sélection / archivage
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [hardDeleteId, setHardDeleteId] = useState<number | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);

  // ── filtres
  const [filters, setFilters] = useState<FiltresFormationsValues>({
    texte: "",
  });
  const [showFilters, setShowFilters] = useState(false);

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
  const { page, setPage, count, setCount, totalPages, pageSize, setPageSize } = usePagination();

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

  const { data, loading, error, fetchData } = useFetch<PaginatedResponse<Formation>>(
    "/formations/",
    apiFilters, // ⬅️ on envoie les filtres mappés à l’API
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
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
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
      const api = await import("../../api/axios");
      await Promise.all(idsToDelete.map((id) => api.default.delete(`/formations/${id}/`)));
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
        const api = await import("../../api/axios");
        if (row.activite === "archivee") {
          await api.default.post(`/formations/${row.id}/desarchiver/`);
          toast.success("Formation restaurée");
        } else {
          await api.default.post(`/formations/${row.id}/archiver/`);
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
      title="📚 Formations"
      backButton
      onBack={() => navigate(-1)}
      refreshButton
      onRefresh={fetchData}
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

          <FormationExportButton selectedIds={selectedIds} />

          <Button
            variant={filters.avec_archivees || filters.activite === "archivee" ? "contained" : "outlined"}
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

          <Button
            variant="contained"
            onClick={() => navigate("/formations/create")}
            fullWidth={isMobile}
          >
            ➕ Ajouter une formation
          </Button>

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
      <Stack direction="row" spacing={1} alignItems="center" mb={2} flexWrap={{ xs: "wrap", md: "nowrap" }}>
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

      {loading ? (
        <LoadingState label="Chargement des formations..." />
      ) : error ? (
        <Typography color="error">Erreur lors du chargement des formations.</Typography>
      ) : formations.length === 0 ? (
        <EmptyState
          title="Aucune formation trouvée"
          description="Modifiez la recherche ou créez une formation."
          action={
            <Button variant="contained" onClick={() => navigate("/formations/create")}>
              Ajouter une formation
            </Button>
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
