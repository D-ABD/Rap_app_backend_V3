import { useEffect, useState } from "react";
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
import PageTemplate from "../../components/PageTemplate";

type TypeOffre = {
  id: number;
  nom: string;
  nom_display: string;
  autre: string;
  couleur: string;
  is_personnalise: boolean;
};

type TypeOffreChoice = {
  value: string;
  label: string;
  default_color: string;
};

export default function TypeOffresPage() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [choicesMap, setChoicesMap] = useState<Record<string, TypeOffreChoice>>({});
  const [reloadKey, setReloadKey] = useState(0);

  const { page, setPage, count, setCount, totalPages, pageSize, setPageSize } = usePagination();

  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { data, loading, error, fetchData } = useFetch<{
    results: TypeOffre[];
    count: number;
  }>("/typeoffres/", { search: search.trim(), page, page_size: pageSize });

  const typeoffres = data?.results || [];

  // 🔄 Fetch initial
  useEffect(() => {
    fetchData();
  }, [fetchData, reloadKey]);

  // 🔄 Update count
  useEffect(() => {
    if (typeof data?.count === "number") {
      setCount(data.count);
    }
  }, [data?.count, setCount]);

  // 🔄 Fetch des choices
  useEffect(() => {
    const fetchChoices = async () => {
      try {
        const api = await import("../../api/axios");
        const res = await api.default.get("/typeoffres/choices/");
        const rawChoices = res.data.data as TypeOffreChoice[];
        const mapped = rawChoices.reduce<Record<string, TypeOffreChoice>>((acc, item) => {
          acc[item.value] = item;
          return acc;
        }, {});
        setChoicesMap(mapped);
      } catch {
        toast.error("Erreur lors du chargement des types disponibles");
      }
    };
    fetchChoices();
  }, []);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const clearSelection = () => setSelectedIds([]);
  const selectAll = () => setSelectedIds(typeoffres.map((t) => t.id));

  const handleDelete = async () => {
    const idsToDelete = selectedId ? [selectedId] : selectedIds;
    if (!idsToDelete.length) return;

    try {
      const mod = await import("../../api/axios");
      const api = mod.default as import("axios").AxiosInstance;
      await Promise.all(idsToDelete.map((id) => api.delete(`/typeoffres/${id}/`)));
      toast.success(`🗑️ ${idsToDelete.length} type(s) supprimé(s)`);
      setShowConfirm(false);
      setSelectedId(null);
      setSelectedIds([]);
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <PageTemplate
      title="📦 Types d’offre"
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

          <Button
            variant="contained"
            onClick={() => navigate("/typeoffres/create")}
            fullWidth={isMobile}
          >
            ➕ Ajouter un type
          </Button>

          {selectedIds.length > 0 && (
            <>
              <Button variant="contained" color="error" onClick={() => setShowConfirm(true)}>
                🗑️ Supprimer ({selectedIds.length})
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
          placeholder="Rechercher un type..."
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
        <CircularProgress />
      ) : error ? (
        <Typography color="error">Erreur lors du chargement des types.</Typography>
      ) : typeoffres.length === 0 ? (
        <Box textAlign="center" color="text.secondary" my={4}>
          <Box fontSize={48} mb={1}>
            📭
          </Box>
          <Typography>Aucun type trouvé.</Typography>
        </Box>
      ) : (
        <Stack spacing={1}>
          {typeoffres.map((type) => {
            const label = type.is_personnalise
              ? type.autre
              : choicesMap[type.nom]?.label || type.nom_display;
            const color = type.couleur || choicesMap[type.nom]?.default_color || "#6c757d";

            return (
              <Paper
                key={type.id}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  p: 2,
                  cursor: "pointer",
                }}
                onClick={() => navigate(`/typeoffres/${type.id}/edit`)}
              >
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Checkbox
                    checked={selectedIds.includes(type.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSelect(type.id)}
                  />
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {label}
                    </Typography>
                    <Box
                      sx={{
                        display: "inline-block",
                        backgroundColor: color,
                        width: 40,
                        height: 20,
                        borderRadius: 1,
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                      title={label}
                    />
                  </Box>
                </Stack>

                <Button
                  variant="outlined"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(type.id);
                    setShowConfirm(true);
                  }}
                >
                  🗑️ Supprimer
                </Button>
              </Paper>
            );
          })}
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
              ? "Supprimer ce type d’offre ?"
              : `Supprimer les ${selectedIds.length} types sélectionnés ?`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirm(false)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </PageTemplate>
  );
}
