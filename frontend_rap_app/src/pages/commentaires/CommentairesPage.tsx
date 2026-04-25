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
  Menu,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  useMediaQuery,
  useTheme,
  Alert,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import usePagination from "../../hooks/usePagination";
import useFetch from "../../hooks/useFetch";
import { useCommentairesFiltres } from "../../hooks/useCommentaires";
import type {
  Commentaire,
  CommentaireFiltresValues,
} from "../../types/commentaire";

import PageTemplate from "../../components/PageTemplate";
import FiltresCommentairesPanel from "../../components/filters/FiltresCommentairesPanel";
import CommentairesTable from "./CommentairesTable";
import ExportButtonCommentaires from "../../components/export_buttons/ExportButtonCommentaires";
import { useAuth } from "../../hooks/useAuth";
import { isAdminLikeRole, isCoreWriteRole } from "../../utils/roleGroups";
import SearchInput from "../../components/SearchInput";
import type { AppTheme } from "../../theme";

export default function CommentairesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const theme = useTheme<AppTheme>();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { user } = useAuth();
  const canHardDelete = isAdminLikeRole(user?.role);
  const canPreFillPlanAction = isCoreWriteRole(user?.role);
  const isScopedStaff = ["staff", "staff_read", "declic_staff", "prepa_staff"].includes(
    (user?.role ?? "").toLowerCase()
  );
  const hasNoAssignedCentre =
    isScopedStaff && (user?.centres?.length ?? 0) === 0;

  const [search, setSearch] = useState("");

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
    date: undefined,
    date_from: undefined,
    date_to: undefined,
  });
  const [showFilters, setShowFilters] = useState(false);

  const { filtres, loading: filtresLoading, error: filtresError } =
    useCommentairesFiltres();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [hardDeleteId, setHardDeleteId] = useState<number | null>(null);
  const [anchorOptions, setAnchorOptions] = useState<null | HTMLElement>(null);

  const { page, setPage, pageSize, setPageSize, count, setCount, totalPages } =
    usePagination();

  const resetAllFilters = useCallback(() => {
    setSearch("");
    setFilters({
      centre_id: undefined,
      statut_id: undefined,
      type_offre_id: undefined,
      formation: scopedFormationId,
      date: undefined,
      date_from: undefined,
      date_to: undefined,
      formation_etat: undefined,
      auteur_id: undefined,
      formation_nom: undefined,
      include_archived: false,
    });
    setPage(1);
  }, [scopedFormationId, setPage]);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, formation: scopedFormationId }));
    setPage(1);
  }, [scopedFormationId, setPage]);

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

  useEffect(() => {
    fetchData();
  }, [fetchData, effectiveParams]);

  const commentaires: Commentaire[] = useMemo(
    () => data?.results ?? [],
    [data]
  );

  useEffect(() => {
    if (typeof data?.count === "number") setCount(data.count);
  }, [data, setCount]);

  useEffect(() => {
    const visible = new Set(commentaires.map((commentaire) => commentaire.id));
    setSelectedIds((prev) => prev.filter((id) => visible.has(id)));
  }, [commentaires]);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const clearSelection = () => setSelectedIds([]);
  const selectAll = () => setSelectedIds(commentaires.map((commentaire) => commentaire.id));

  const handleDelete = async () => {
    const idsToDelete = selectedId ? [selectedId] : selectedIds;
    if (!idsToDelete.length) return;

    try {
      const api = await import("../../api/axios");
      await Promise.all(
        idsToDelete.map((id) => api.default.delete(`/commentaires/${id}/`))
      );
      toast.success(`📦 ${idsToDelete.length} commentaire(s) archivé(s)`);
      setShowConfirm(false);
      setSelectedId(null);
      setSelectedIds([]);
      fetchData();
    } catch {
      toast.error("Erreur lors de l'archivage");
    }
  };

  const handleRowClick = (id: number) => navigate(`/commentaires/${id}/edit`);

  const buildPlanActionCreatePath = useCallback((f: CommentaireFiltresValues) => {
    const p = new URLSearchParams();
    if (f.centre_id != null && Number.isFinite(Number(f.centre_id))) {
      p.set("centre", String(f.centre_id));
    }
    if (f.formation != null && Number.isFinite(Number(f.formation))) {
      p.set("formation", String(f.formation));
    }
    if (f.date_from) p.set("date_debut", f.date_from);
    if (f.date_to) p.set("date_fin", f.date_to);
    if (!f.date_from && !f.date_to && f.date) {
      p.set("date_debut", f.date);
      p.set("date_fin", f.date);
    }
    const qs = p.toString();
    return qs ? `/plans-action-formations/create?${qs}` : "/plans-action-formations/create";
  }, []);

  const handleRestore = async (id: number) => {
    try {
      const api = await import("../../api/axios");
      await api.default.post(`/commentaires/${id}/desarchiver/`);
      toast.success("♻️ Commentaire restauré");
      fetchData();
    } catch {
      toast.error("Erreur lors de la restauration");
    }
  };

  const handleHardDelete = async () => {
    if (!hardDeleteId) return;

    try {
      const api = await import("../../api/axios");
      await api.default.post(`/commentaires/${hardDeleteId}/hard-delete/`);
      toast.success("🗑️ Commentaire supprimé définitivement");
      setHardDeleteId(null);
      fetchData();
    } catch {
      toast.error("Erreur lors de la suppression définitive");
    }
  };

  return (
    <PageTemplate
      refreshButton
      onRefresh={fetchData}
      headerExtra={
        <SearchInput
          placeholder="Rechercher un commentaire..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      }
      actions={
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap">
          <Button
            variant="outlined"
            onClick={() => setShowFilters((v) => !v)}
            fullWidth={isMobile}
          >
            {showFilters ? "🫣 Masquer filtres" : "🔎 Afficher filtres"}
          </Button>

          <Button
            variant="outlined"
            color="warning"
            onClick={resetAllFilters}
            fullWidth={isMobile}
          >
            ♻️ Réinitialiser filtres
          </Button>

          <Button
            variant="outlined"
            fullWidth={isMobile}
            onClick={() => {
              setFilters((prev) => {
                const current = String(prev.statut_id || "");
                return {
                  ...prev,
                  statut_id: current === "all" ? undefined : "all",
                };
              });
              setPage(1);
            }}
          >
            {String(filters.statut_id || "") === "all"
              ? "🗂️ Masquer archivés"
              : "🗃️ Inclure archivés"}
          </Button>

          <Button
            variant="outlined"
            fullWidth={isMobile}
            onClick={() => {
              setFilters((prev) => {
                const archivesOnly = String(prev.statut_id || "") === "archive";
                return {
                  ...prev,
                  statut_id: archivesOnly ? undefined : "archive",
                };
              });
              setPage(1);
            }}
          >
            {String(filters.statut_id || "") === "archive"
              ? "📂 Voir tout"
              : "🗄️ Archives seules"}
          </Button>

          {canPreFillPlanAction && (
            <Button
              variant="outlined"
              color="secondary"
              fullWidth={isMobile}
              onClick={() => navigate(buildPlanActionCreatePath(filters))}
            >
              Construire une synthèse
            </Button>
          )}

          <Button
            variant="outlined"
            onClick={(event) => setAnchorOptions(event.currentTarget)}
            fullWidth={isMobile}
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
            {[5, 10, 20].map((size) => (
              <MenuItem key={size} value={size}>
                {size} / page
              </MenuItem>
            ))}
          </Select>

          <Button
            variant="contained"
            onClick={() =>
              navigate(
                scopedFormationId
                  ? `/commentaires/create/${scopedFormationId}`
                  : "/commentaires/create"
              )
            }
            fullWidth={isMobile}
          >
            ➕ Ajouter
          </Button>

          <Menu
            anchorEl={anchorOptions}
            open={Boolean(anchorOptions)}
            onClose={() => setAnchorOptions(null)}
            PaperProps={{
              sx: {
                mt: 1,
                p: 1.25,
                borderRadius: 3,
                width: 320,
                maxWidth: "calc(100vw - 32px)",
              },
            }}
          >
            <Box sx={{ px: 1, pt: 0.5, pb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Options
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Actions secondaires de la liste
              </Typography>
            </Box>

            <Stack spacing={1} sx={{ px: 1, pb: 1 }}>
              <ExportButtonCommentaires
                data={commentaires.map((commentaire) => ({
                  ...commentaire,
                  created_at: commentaire.created_at ?? "",
                }))}
                selectedIds={selectedIds}
                requestParams={effectiveParams}
                totalCount={count}
              />
            </Stack>
          </Menu>

          {selectedIds.length > 0 && (
            <>
              <Button
                variant="contained"
                color="error"
                onClick={() => setShowConfirm(true)}
              >
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
            onReset={resetAllFilters}
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
      {scopedFormationId && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.delete("formation");
                  next.delete("formation_id");
                  return next;
                });
              }}
            >
              Voir tout
            </Button>
          }
        >
          La liste est actuellement filtrée sur la formation #{scopedFormationId}.
        </Alert>
      )}

      {hasNoAssignedCentre && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Aucun centre n’est rattaché à ton compte. La liste des commentaires reste vide tant
          qu’un centre ne t’est pas affecté.
        </Alert>
      )}

      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Typography color="error">
          Erreur lors du chargement des commentaires.
        </Typography>
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
          onRestore={handleRestore}
          onHardDelete={(id) => setHardDeleteId(id)}
          canHardDelete={canHardDelete}
        />
      )}

      <Dialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color="warning" />
          Confirmation
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedId
              ? "Archiver ce commentaire ?"
              : `Archiver les ${selectedIds.length} commentaires sélectionnés ?`}
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
        open={hardDeleteId !== null}
        onClose={() => setHardDeleteId(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color="error" />
          Suppression définitive
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Cette action est irréversible. Le commentaire archivé sera supprimé
            définitivement.
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