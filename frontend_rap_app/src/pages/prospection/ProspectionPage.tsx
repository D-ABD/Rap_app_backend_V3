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
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import FiltresProspectionsPanel from "../../components/filters/FiltresProspectionsPanel";
import usePagination from "../../hooks/usePagination";
import useFiltresProspections, { useProspections } from "../../hooks/useProspection";
import type { Prospection, ProspectionFiltresValues } from "../../types/prospection";
import { useRedirectToCreateProspection } from "../../hooks/useRedirectToCreateProspection";
import { useAuth } from "../../hooks/useAuth";
import ProspectionTable from "./ProspectionTable";
import SearchInput from "../../components/SearchInput";
import PageTemplate from "../../components/PageTemplate";
import ExportButtonProspection from "../../components/export_buttons/ExportButtonProspection";
import ProspectionDetailModal from "./ProspectionDetailModal";

export default function ProspectionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectToCreate = useRedirectToCreateProspection();
  const { user } = useAuth();
  const isCandidat = ["candidat", "stagiaire"].includes(user?.role ?? "");

  const toNum = (value: string | null): number | undefined => {
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const parseBool = (value: string | null): boolean | undefined => {
    if (!value) return undefined;
    return ["1", "true", "yes"].includes(value.toLowerCase());
  };

  const urlFilters = useMemo<ProspectionFiltresValues>(
    () => ({
      search: searchParams.get("search") || "",
      owner: toNum(searchParams.get("owner")),
      partenaire: toNum(searchParams.get("partenaire")),
      formation: toNum(searchParams.get("formation")),
      centre: toNum(searchParams.get("centre")),
      statut: (searchParams.get("statut") as ProspectionFiltresValues["statut"]) || undefined,
      activite: (searchParams.get("activite") as ProspectionFiltresValues["activite"]) || undefined,
      objectif: (searchParams.get("objectif") as ProspectionFiltresValues["objectif"]) || undefined,
      motif: (searchParams.get("motif") as ProspectionFiltresValues["motif"]) || undefined,
      type_prospection:
        (searchParams.get("type_prospection") as ProspectionFiltresValues["type_prospection"]) ||
        undefined,
      moyen_contact:
        (searchParams.get("moyen_contact") as ProspectionFiltresValues["moyen_contact"]) ||
        undefined,
      date_min: searchParams.get("date_min") || undefined,
      date_max: searchParams.get("date_max") || undefined,
      avec_archivees: parseBool(searchParams.get("avec_archivees")),
    }),
    [searchParams]
  );

  // ── filtres
  const [filters, setFilters] = useState<ProspectionFiltresValues>(urlFilters);
  const [showFilters, setShowFilters] = useState(false);

  // ── pagination
  const { page, setPage, pageSize, setPageSize, count, setCount, totalPages } = usePagination();

  useEffect(() => {
    setFilters(urlFilters);
    setPage(1);
  }, [urlFilters, setPage]);

  // ── filtres envoyés à l'API
  type EffectiveFilters = ProspectionFiltresValues & {
    page: number;
    page_size: number;
  };
  const effectiveFilters: EffectiveFilters = useMemo(() => {
    const base: EffectiveFilters = { ...filters, page, page_size: pageSize };
    const pairs = Object.entries(base).filter(([k, v]) => {
      if (isCandidat && k === "owner") return false;
      if (v == null) return false;
      if (typeof v === "string") return v.trim() !== "";
      if (Array.isArray(v)) return v.length > 0;
      return true;
    });
    return Object.fromEntries(pairs) as EffectiveFilters;
  }, [filters, page, pageSize, isCandidat]);

  const activeFiltersCount = useMemo(() => {
    const ignored = new Set(["page", "page_size", "search"]);
    return Object.entries(effectiveFilters).filter(([k, v]) => {
      if (ignored.has(k)) return false;
      if (v == null) return false;
      if (typeof v === "string") return v.trim() !== "";
      if (Array.isArray(v)) return v.length > 0;
      return true;
    }).length;
  }, [effectiveFilters]);

  const { filtres, loading: filtresLoading } = useFiltresProspections();

  const [reloadKey, setReloadKey] = useState(0);

  const { pageData, loading, error } = useProspections(effectiveFilters, reloadKey);
  const prospections: Prospection[] = useMemo(
    () => (pageData?.results ?? []) as Prospection[],
    [pageData]
  );

  useEffect(() => {
    setCount(pageData?.count ?? 0);
  }, [pageData, setCount]);

  // ── sélection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  useEffect(() => {
    const visible = new Set(prospections.map((p) => p.id));
    setSelectedIds((prev) => prev.filter((id) => visible.has(id)));
  }, [prospections]);

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  const clearSelection = () => setSelectedIds([]);
  const selectAll = () => setSelectedIds(prospections.map((p) => p.id));

  // ── suppression
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    const idsToDelete = selectedId ? [selectedId] : selectedIds;
    if (!idsToDelete.length) return;
    try {
      const api = (await import("../../api/axios")).default;
      await Promise.all(idsToDelete.map((id) => api.delete(`/prospections/${id}/`)));
      toast.success(`🗑️ ${idsToDelete.length} prospection(s) supprimée(s)`);
      setShowConfirm(false);
      setSelectedId(null);
      setSelectedIds([]);
      setReloadKey((k) => k + 1);
    } catch (err) {
      const message =
        err && typeof err === "object" && "response" in err
          ? "Impossible de supprimer une ou plusieurs prospections."
          : "Une erreur inattendue est survenue pendant la suppression.";
      toast.error(message);
    }
  };

  // ── modal de détail
  const [showDetail, setShowDetail] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);

  const handleRowClick = (id: number) => {
    setDetailId(id);
    setShowDetail(true);
  };

  const handleDeleteClick = (id: number) => {
    setSelectedId(id);
    setShowConfirm(true);
  };

  return (
    <PageTemplate
      title="📈 Prospections"
      refreshButton
      onRefresh={() => setReloadKey((k) => k + 1)}
      actions={
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {/* 🟦 Bouton RETOUR (même style que Partenaires) */}
          <Button variant="outlined" onClick={() => navigate(-1)} startIcon={<span>←</span>}>
            Retour
          </Button>

          <Button variant="outlined" onClick={() => setShowFilters((v) => !v)}>
            {showFilters ? "🫣 Masquer filtres" : "🔎 Afficher filtres"}
            {activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ""}
          </Button>

          <SearchInput
            placeholder="🔍 Rechercher..."
            value={filters.search || ""}
            onChange={(e) => {
              setFilters({ ...filters, search: e.target.value });
              setPage(1);
            }}
          />

          <ExportButtonProspection data={prospections} selectedIds={selectedIds} />

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

          <Button variant="contained" onClick={redirectToCreate}>
            ➕ Nouvelle prospection
          </Button>

          {selectedIds.length > 0 && (
            <>
              <Button color="error" variant="contained" onClick={() => setShowConfirm(true)}>
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
          <CircularProgress />
        ) : filtres ? (
          <FiltresProspectionsPanel
            filtres={{
              ...filtres,
              owners: isCandidat ? [] : filtres.owners,
            }}
            values={effectiveFilters}
            onChange={(newValues) => {
              setFilters((f) => ({ ...f, ...newValues }));
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
            />
          </Stack>
        )
      }
    >
      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Typography color="error">Erreur lors du chargement des prospections.</Typography>
      ) : prospections.length === 0 ? (
        <Box textAlign="center" color="text.secondary" my={4}>
          <Box fontSize={48} mb={1}>
            📭
          </Box>
          <Typography>Aucune prospection trouvée.</Typography>
        </Box>
      ) : (
        <Box sx={{ width: "100%", overflowX: "auto", mt: 2 }}>
          <ProspectionTable
            prospections={prospections}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onRowClick={handleRowClick}
            onDeleteClick={handleDeleteClick}
          />
        </Box>
      )}

      {/* ───────────── Confirmation suppression ───────────── */}
      <Dialog open={showConfirm} onClose={() => setShowConfirm(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color="warning" />
          Confirmation
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedId
              ? "Supprimer cette prospection ?"
              : `Supprimer les ${selectedIds.length} prospections sélectionnées ?`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirm(false)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      {/* ───────────── Détail prospection ───────────── */}
      <ProspectionDetailModal
        open={showDetail}
        onClose={() => setShowDetail(false)}
        prospectionId={detailId}
        onEdit={(id) => navigate(`/prospections/${id}/edit`)}
      />
    </PageTemplate>
  );
}
