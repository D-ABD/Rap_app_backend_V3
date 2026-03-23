// ======================================================
// src/pages/commentaires/CommentairesPage.tsx
// Liste des commentaires + filtres dynamiques + export
// ======================================================

import { useEffect, useState, useMemo, useCallback } from "react";
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
  useMediaQuery,
  useTheme,
  TextField,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import usePagination from "../../hooks/usePagination";
import useFetch from "../../hooks/useFetch";
import { useCommentairesFiltres } from "../../hooks/useCommentaires";
import type { Commentaire, CommentaireFiltresValues } from "../../types/commentaire";

import PageTemplate from "../../components/PageTemplate";
import FiltresCommentairesPanel from "../../components/filters/FiltresCommentairesPanel";
import CommentairesTable from "./CommentairesTable";
import ExportButtonCommentaires from "../../components/export_buttons/ExportButtonCommentaires";

export default function CommentairesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // 🔎 recherche
  const [search, setSearch] = useState("");

  // 🎚️ filtres
  const scopedFormationId = useMemo(() => {
    const raw = searchParams.get("formation") || searchParams.get("formation_id");
    if (!raw) return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [searchParams]);

  const [filters, setFilters] = useState<CommentaireFiltresValues>({
    centre_id: undefined,
    statut_id: undefined,
    type_offre_id: undefined,
    formation: scopedFormationId,
  });
  const [showFilters, setShowFilters] = useState(false);

  // 🧩 données des filtres dynamiques
  const { filtres, loading: filtresLoading, error: filtresError } = useCommentairesFiltres();

  // 🧾 sélection
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  // 📄 pagination
  const { page, setPage, pageSize, setPageSize, count, setCount, totalPages } = usePagination();

  useEffect(() => {
    setFilters((prev) => ({ ...prev, formation: scopedFormationId }));
    setPage(1);
  }, [scopedFormationId, setPage]);

  // ⚙️ fetch des commentaires
  const effectiveParams = useMemo(
    () => ({
      search,
      page,
      page_size: pageSize,
      ordering: "-created_at",
      ...filters,
    }),
    [search, page, pageSize, filters]
  );

  const { data, loading, error, fetchData } = useFetch<{
    results: Commentaire[];
    count: number;
  }>("/commentaires/", effectiveParams);

  // 🔁 refetch automatique quand paramètres changent
  useEffect(() => {
    fetchData();
  }, [fetchData, effectiveParams]);

  const commentaires: Commentaire[] = data?.results ?? [];

  useEffect(() => {
    if (typeof data?.count === "number") setCount(data.count);
  }, [data, setCount]);

  // ✅ helpers sélection
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }, []);
  const clearSelection = () => setSelectedIds([]);
  const selectAll = () => setSelectedIds(commentaires.map((c) => c.id));

  // 🗑️ suppression
  const handleDelete = async () => {
    const idsToDelete = selectedId ? [selectedId] : selectedIds;
    if (!idsToDelete.length) return;
    try {
      const api = await import("../../api/axios");
      await Promise.all(idsToDelete.map((id) => api.default.delete(`/commentaires/${id}/`)));
      toast.success(`🗑️ ${idsToDelete.length} commentaire(s) supprimé(s)`);
      setShowConfirm(false);
      setSelectedId(null);
      setSelectedIds([]);
      fetchData();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleRowClick = (id: number) => navigate(`/commentaires/${id}/edit`);

  // ────────────────────────────── UI ──────────────────────────────
  return (
    <PageTemplate
      title="💬 Commentaires"
      refreshButton
      onRefresh={fetchData}
      actions={
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap">
          <Button variant="outlined" onClick={() => setShowFilters((v) => !v)} fullWidth={isMobile}>
            {showFilters ? "🫣 Masquer filtres" : "🔎 Afficher filtres"}
          </Button>

          <TextField
            size="small"
            placeholder="Rechercher un commentaire..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          <ExportButtonCommentaires
            data={commentaires.map((c) => ({
              ...c,
              created_at: c.created_at ?? "", // 🔧 fallback string
            }))}
          />

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
            onClick={() =>
              navigate(
                scopedFormationId ? `/commentaires/create/${scopedFormationId}` : "/commentaires/create"
              )
            }
            fullWidth={isMobile}
          >
            ➕ Ajouter
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
        showFilters &&
        (filtresLoading ? (
          <Typography sx={{ p: 2 }}>Chargement des filtres…</Typography>
        ) : filtresError ? (
          <Typography sx={{ p: 2 }} color="error">
            Erreur lors du chargement des filtres.
          </Typography>
        ) : (
          <FiltresCommentairesPanel
            filtres={filtres ?? undefined}
            values={filters}
            onChange={(updated) => {
              setFilters(updated);
              setPage(1);
            }}
            onRefresh={fetchData}
          />
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
        <CircularProgress />
      ) : error ? (
        <Typography color="error">Erreur lors du chargement des commentaires.</Typography>
      ) : commentaires.length === 0 ? (
        <Box textAlign="center" color="text.secondary" my={4}>
          <Box fontSize={48} mb={1}>
            📭
          </Box>
          <Typography>Aucun commentaire trouvé.</Typography>
        </Box>
      ) : (
        <CommentairesTable
          commentaires={commentaires}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onClickRow={handleRowClick}
        />
      )}

      {/* Confirmation suppression */}
      <Dialog open={showConfirm} onClose={() => setShowConfirm(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color="warning" />
          Confirmation
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedId
              ? "Supprimer ce commentaire ?"
              : `Supprimer les ${selectedIds.length} commentaires sélectionnés ?`}
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
