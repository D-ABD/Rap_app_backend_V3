import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Box,
  Stack,
  Button,
  Checkbox,
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
  useTheme,
  useMediaQuery,
  Paper,
  TextField,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import useFetch from "../../hooks/useFetch";
import usePagination from "../../hooks/usePagination";
import { buildLot1ExportQueryParams } from "../../api/lot1ImportExport";
import Lot1ExcelActions from "../../components/import_export/Lot1ExcelActions";
import PageTemplate from "../../components/PageTemplate";

type Centre = {
  id: number;
  nom: string;
  code_postal: string;
  is_active: boolean;
};

export default function CentresPage() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [hardDeleteId, setHardDeleteId] = useState<number | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [archivesOnly, setArchivesOnly] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const { page, setPage, count, setCount, totalPages, pageSize, setPageSize } = usePagination(1, 5);

  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { data, loading, error, fetchData } = useFetch<{
    results: Centre[];
    count: number;
  }>("/centres/", {
    search: search.trim(),
    page,
    page_size: pageSize,
    ...(includeArchived ? { avec_archivees: true } : {}),
    ...(archivesOnly ? { archives_seules: true } : {}),
  });

  const centres = data?.results || [];

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
    if (data?.count !== undefined) {
      setCount(data.count);
    }
  }, [data?.count, setCount]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const clearSelection = () => setSelectedIds([]);
  const selectAll = () => setSelectedIds(centres.map((c) => c.id));

  const handleDelete = async () => {
    const idsToDelete = selectedId ? [selectedId] : selectedIds;
    if (!idsToDelete.length) return;

    try {
      const mod = await import("../../api/axios");
      const api = mod.default as import("axios").AxiosInstance;
      await Promise.all(idsToDelete.map((id) => api.delete(`/centres/${id}/`)));
      toast.success(`📦 ${idsToDelete.length} centre(s) archivé(s)`);
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
      const mod = await import("../../api/axios");
      const api = mod.default as import("axios").AxiosInstance;
      await api.post(`/centres/${id}/desarchiver/`);
      toast.success("Centre restauré");
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Erreur lors de la restauration");
    }
  };

  const handleHardDelete = async () => {
    if (!hardDeleteId) return;
    try {
      const mod = await import("../../api/axios");
      const api = mod.default as import("axios").AxiosInstance;
      await api.post(`/centres/${hardDeleteId}/hard-delete/`);
      toast.success("Centre supprimé définitivement");
      setHardDeleteId(null);
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Erreur lors de la suppression définitive");
    }
  };

  return (
    <PageTemplate
      title="🏫 Centres"
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
            {[5, 10, 20, 50].map((s) => (
              <MenuItem key={s} value={s}>
                {s} / page
              </MenuItem>
            ))}
          </Select>

          <Lot1ExcelActions resource="centre" exportParams={lot1ExportParams} isMobile={isMobile} />

          <Button
            variant="contained"
            onClick={() => navigate("/centres/create")}
            fullWidth={isMobile}
          >
            ➕ Ajouter un centre
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
          placeholder="Rechercher un centre..."
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
              Page {page} / {totalPages} – {count} résultat
              {count > 1 ? "s" : ""}
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
        <Typography color="error">Erreur lors du chargement des centres.</Typography>
      ) : centres.length === 0 ? (
        <Box textAlign="center" color="text.secondary" my={4}>
          <Box fontSize={48} mb={1}>
            📭
          </Box>
          <Typography>Aucun centre trouvé.</Typography>
        </Box>
      ) : (
        <Stack spacing={1}>
          {centres.map((centre) => (
            <Paper
              key={centre.id}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                p: 2,
                cursor: "pointer",
              }}
              onClick={() => navigate(`/centres/${centre.id}/edit`)}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Checkbox
                  checked={selectedIds.includes(centre.id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggleSelect(centre.id)}
                />
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {centre.nom}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {centre.code_postal}
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1}>
                {centre.is_active ? (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(centre.id);
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
                        void handleRestore(centre.id);
                      }}
                    >
                      Restaurer
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        setHardDeleteId(centre.id);
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

      {/* Confirmation dialog */}
      <Dialog open={showConfirm} onClose={() => setShowConfirm(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color="warning" />
          Confirmation
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedId
              ? "Voulez-vous vraiment archiver ce centre ?"
              : `Voulez-vous vraiment archiver les ${selectedIds.length} centres sélectionnés ?`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirm(false)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Archiver
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(hardDeleteId)} onClose={() => setHardDeleteId(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color="warning" />
          Suppression définitive
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Cette action est irréversible. Supprimer définitivement ce centre archivé ?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHardDeleteId(null)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleHardDelete}>
            Supprimer définitivement
          </Button>
        </DialogActions>
      </Dialog>
    </PageTemplate>
  );
}
