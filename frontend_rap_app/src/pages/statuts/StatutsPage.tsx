import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Box,
  Stack,
  Button,
  Checkbox,
  Typography,
  Select,
  MenuItem,
  Pagination,
  useTheme,
  useMediaQuery,
  Paper,
  TextField,
} from "@mui/material";

import usePagination from "../../hooks/usePagination";
import useFetch from "../../hooks/useFetch";
import { buildLot1ExportQueryParams } from "../../api/lot1ImportExport";
import Lot1ExcelActions from "../../components/import_export/Lot1ExcelActions";
import PageTemplate from "../../components/PageTemplate";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import EmptyState from "../../components/ui/EmptyState";
import LoadingState from "../../components/ui/LoadingState";

type Statut = {
  id: number;
  nom: string;
  libelle: string;
  couleur: string;
  is_active: boolean;
};

export default function StatutsPage() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [hardDeleteId, setHardDeleteId] = useState<number | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [hardDeleteLoading, setHardDeleteLoading] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [archivesOnly, setArchivesOnly] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const { page, setPage, count, setCount, totalPages, pageSize, setPageSize } = usePagination();

  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { data, loading, error, fetchData } = useFetch<{
    results: Statut[];
    count: number;
  }>("/statuts/", {
    search: search.trim(),
    page,
    page_size: pageSize,
    ...(includeArchived ? { avec_archivees: true } : {}),
    ...(archivesOnly ? { archives_seules: true } : {}),
  });

  const statuts = data?.results || [];

  const lot1ExportParams = useMemo(
    () =>
      buildLot1ExportQueryParams({
        search,
        includeArchived,
        archivesOnly,
      }),
    [search, includeArchived, archivesOnly]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData, reloadKey]);

  useEffect(() => {
    if (typeof data?.count === "number") {
      setCount(data.count);
    }
  }, [data?.count, setCount]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const clearSelection = () => setSelectedIds([]);
  const selectAll = () => setSelectedIds(statuts.map((s) => s.id));

  const handleDelete = async () => {
    const idsToDelete = selectedId ? [selectedId] : selectedIds;
    if (!idsToDelete.length) return;

    setArchiveLoading(true);
    try {
      const mod = await import("../../api/axios");
      const api = mod.default as import("axios").AxiosInstance;
      await Promise.all(idsToDelete.map((id) => api.delete(`/statuts/${id}/`)));
      toast.success(`📦 ${idsToDelete.length} statut(s) archivé(s)`);
      setShowConfirm(false);
      setSelectedId(null);
      setSelectedIds([]);
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Erreur lors de l'archivage");
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleRestore = async (id: number) => {
    try {
      const mod = await import("../../api/axios");
      const api = mod.default as import("axios").AxiosInstance;
      await api.post(`/statuts/${id}/desarchiver/`);
      toast.success("Statut restauré");
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Erreur lors de la restauration");
    }
  };

  const handleHardDelete = async () => {
    if (!hardDeleteId) return;
    setHardDeleteLoading(true);
    try {
      const mod = await import("../../api/axios");
      const api = mod.default as import("axios").AxiosInstance;
      await api.post(`/statuts/${hardDeleteId}/hard-delete/`);
      toast.success("Statut supprimé définitivement");
      setHardDeleteId(null);
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Erreur lors de la suppression définitive");
    } finally {
      setHardDeleteLoading(false);
    }
  };

  return (
    <PageTemplate
      title="📑 Statuts"
      backButton
      onBack={() => navigate(-1)}
      refreshButton
      onRefresh={() => setReloadKey((k) => k + 1)}
      actions={
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap">
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

          <Lot1ExcelActions resource="statut" exportParams={lot1ExportParams} isMobile={isMobile} />

          <Button
            variant="contained"
            onClick={() => navigate("/statuts/create")}
            fullWidth={isMobile}
          >
            ➕ Ajouter un statut
          </Button>

          <Button
            variant={includeArchived || archivesOnly ? "contained" : "outlined"}
            onClick={() => {
              if (includeArchived || archivesOnly) {
                setIncludeArchived(false);
                setArchivesOnly(false);
              } else {
                setIncludeArchived(true);
              }
              setPage(1);
            }}
          >
            {includeArchived || archivesOnly ? "Masquer archivés" : "Inclure archivés"}
          </Button>

          {(includeArchived || archivesOnly) && (
            <Button
              variant={archivesOnly ? "contained" : "outlined"}
              onClick={() => {
                if (archivesOnly) {
                  setArchivesOnly(false);
                  setIncludeArchived(false);
                } else {
                  setArchivesOnly(true);
                  setIncludeArchived(true);
                }
                setPage(1);
              }}
            >
              {archivesOnly ? "Voir tout" : "Archives seules"}
            </Button>
          )}

          {selectedIds.length > 0 && (
            <>
              <Button variant="contained" color="error" onClick={() => setShowConfirm(true)}>
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
        <TextField
          fullWidth
          size="small"
          variant="outlined"
          placeholder="Rechercher un statut..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
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
        <LoadingState label="Chargement des statuts..." />
      ) : error ? (
        <Typography color="error">Erreur lors du chargement des statuts.</Typography>
      ) : statuts.length === 0 ? (
        <EmptyState
          title="Aucun statut trouvé"
          description="Modifiez la recherche ou créez un statut."
          action={
            <Button variant="contained" onClick={() => navigate("/statuts/create")}>
              Ajouter un statut
            </Button>
          }
        />
      ) : (
        <Stack spacing={1}>
          {statuts.map((s) => (
            <Paper
              key={s.id}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                p: 2,
                cursor: "pointer",
              }}
              onClick={() => navigate(`/statuts/${s.id}/edit`)}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Checkbox
                  checked={selectedIds.includes(s.id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggleSelect(s.id)}
                />
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {s.libelle}
                  </Typography>
                  <Box
                    sx={{
                      display: "inline-block",
                      backgroundColor: s.couleur,
                      width: 40,
                      height: 20,
                      borderRadius: 1,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                    title={s.nom}
                  />
                </Box>
              </Stack>

              <Stack direction="row" spacing={1}>
                {s.is_active ? (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(s.id);
                      setShowConfirm(true);
                    }}
                  >
                    📦 Archiver
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outlined"
                      color="success"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleRestore(s.id);
                      }}
                    >
                      Restaurer
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        setHardDeleteId(s.id);
                      }}
                    >
                      Supprimer définitivement
                    </Button>
                  </>
                )}
              </Stack>
            </Paper>
          ))}
        </Stack>
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
            ? "Archiver ce statut ?"
            : `Archiver les ${selectedIds.length} statuts sélectionnés ?`
        }
        confirmLabel="Archiver"
        cancelLabel="Annuler"
      />

      <ConfirmDialog
        open={Boolean(hardDeleteId)}
        onClose={() => !hardDeleteLoading && setHardDeleteId(null)}
        onConfirm={handleHardDelete}
        loading={hardDeleteLoading}
        tone="danger"
        title="Suppression définitive"
        description="Cette action est irréversible. Supprimer définitivement ce statut archivé ?"
        confirmLabel="Supprimer définitivement"
        cancelLabel="Annuler"
      />
    </PageTemplate>
  );
}
