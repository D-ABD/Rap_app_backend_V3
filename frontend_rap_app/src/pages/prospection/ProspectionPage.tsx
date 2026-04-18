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
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  InputLabel,
  SelectChangeEvent,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import api from "../../api/axios";

import FiltresProspectionsPanel from "../../components/filters/FiltresProspectionsPanel";
import usePagination from "../../hooks/usePagination";
import useFiltresProspections, {
  prefetchProspectionDetail,
  useProspections,
} from "../../hooks/useProspection";
import type { Prospection, ProspectionFiltresValues } from "../../types/prospection";
import { useRedirectToCreateProspection } from "../../hooks/useRedirectToCreateProspection";
import { useAuth } from "../../hooks/useAuth";
import ProspectionTable from "./ProspectionTable";
import SearchInput from "../../components/SearchInput";
import PageTemplate from "../../components/PageTemplate";
import ExportButtonProspection from "../../components/export_buttons/ExportButtonProspection";
import ProspectionDetailModal from "./ProspectionDetailModal";
import { isAdminLikeRole, isCandidateLikeRole } from "../../utils/roleGroups";

export default function ProspectionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectToCreate = useRedirectToCreateProspection();
  const { user } = useAuth();
  const isCandidat = isCandidateLikeRole(user?.role);
  const canHardDelete = isAdminLikeRole(user?.role);

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

  // ── archivage logique via endpoint DELETE legacy
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [hardDeleteId, setHardDeleteId] = useState<number | null>(null);
  const [showBulkStatusDialog, setShowBulkStatusDialog] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [bulkStatusLoading, setBulkStatusLoading] = useState(false);
  const [anchorOptions, setAnchorOptions] = useState<null | HTMLElement>(null);

  const handleDelete = async () => {
    const idsToDelete = selectedId ? [selectedId] : selectedIds;
    if (!idsToDelete.length) return;
    try {
      await Promise.all(idsToDelete.map((id) => api.delete(`/prospections/${id}/`)));
      toast.success(`📦 ${idsToDelete.length} prospection(s) archivée(s)`);
      setShowConfirm(false);
      setSelectedId(null);
      setSelectedIds([]);
      setReloadKey((k) => k + 1);
    } catch (err) {
      const message =
        err && typeof err === "object" && "response" in err
          ? "Impossible d'archiver une ou plusieurs prospections."
          : "Une erreur inattendue est survenue pendant l'archivage.";
      toast.error(message);
    }
  };

  // ── modal de détail
  const [showDetail, setShowDetail] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [selectedProspection, setSelectedProspection] = useState<Prospection | null>(null);

  const handleRowClick = (id: number, prospection?: Prospection) => {
    setSelectedProspection(prospection ?? null);
    setDetailId(id);
    setShowDetail(true);
    void prefetchProspectionDetail(id)
      .then((detail) => {
        setSelectedProspection((current) => (current?.id === id || !current ? detail : current));
      })
      .catch(() => {
        // Ignore prefetch failures here; the modal manages loading/fallback.
      });
  };

  const handleRowHover = (prospection: Prospection) => {
    void prefetchProspectionDetail(prospection.id).catch(() => {
      // Ignore hover prefetch failures.
    });
  };

  const handleDeleteClick = (id: number) => {
    setSelectedId(id);
    setShowConfirm(true);
  };

  const handleRestoreClick = async (id: number) => {
    try {
      await api.post(`/prospections/${id}/desarchiver/`);
      toast.success("♻️ Prospection restaurée");
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Impossible de restaurer cette prospection.");
    }
  };

  const handleHardDelete = async () => {
    if (!hardDeleteId) return;
    try {
      await api.post(`/prospections/${hardDeleteId}/hard-delete/`);
      toast.success("🗑️ Prospection supprimée définitivement");
      setHardDeleteId(null);
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Impossible de supprimer définitivement cette prospection.");
    }
  };

  const handleBulkChangeStatus = async () => {
    if (!selectedIds.length || !bulkStatus) {
      toast.error("Choisis d'abord un statut à appliquer.");
      return;
    }

    setBulkStatusLoading(true);
    try {
      const results = await Promise.allSettled(
        selectedIds.map((id) => api.post(`/prospections/${id}/changer-statut/`, { statut: bulkStatus }))
      );

      const succeeded = results.filter((result) => result.status === "fulfilled").length;
      const failed = results.length - succeeded;

      if (failed === 0) {
        toast.success(`Statut mis à jour pour ${succeeded} prospection(s).`);
      } else if (succeeded === 0) {
        toast.error("Aucune prospection n'a pu être mise à jour.");
      } else {
        toast.warning(`Statut mis à jour pour ${succeeded} prospection(s). ${failed} échec(s).`);
      }

      setShowBulkStatusDialog(false);
      setBulkStatus("");
      setSelectedIds([]);
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Impossible de changer le statut des prospections sélectionnées.");
    } finally {
      setBulkStatusLoading(false);
    }
  };

  return (
    <PageTemplate
      backButton
      onBack={() => navigate(-1)}
      refreshButton
      onRefresh={() => setReloadKey((k) => k + 1)}
      headerExtra={
        <SearchInput
          placeholder="🔍 Rechercher..."
          value={filters.search || ""}
          onChange={(e) => {
            setFilters({ ...filters, search: e.target.value });
            setPage(1);
          }}
        />
      }
      actions={
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button variant="outlined" onClick={() => setShowFilters((v) => !v)}>
            {showFilters ? "🫣 Masquer filtres" : "🔎 Afficher filtres"}
            {activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ""}
          </Button>

          <Button
            variant="outlined"
            onClick={() => {
              setFilters((prev) => {
                const next = !prev.avec_archivees;
                if (!next && prev.activite === "archivee") {
                  return { ...prev, avec_archivees: undefined, activite: undefined };
                }
                return { ...prev, avec_archivees: next ? true : undefined };
              });
              setPage(1);
            }}
          >
            {filters.avec_archivees ? "🗂️ Masquer archivés" : "🗃️ Inclure archivés"}
          </Button>

          <Button
            variant="outlined"
            onClick={() => {
              setFilters((prev) => {
                const archivesOnly = prev.activite === "archivee";
                return archivesOnly
                  ? { ...prev, activite: undefined, avec_archivees: undefined }
                  : { ...prev, activite: "archivee", avec_archivees: true };
              });
              setPage(1);
            }}
          >
            {filters.activite === "archivee" ? "📂 Voir tout" : "🗄️ Archives seules"}
          </Button>

          <Button variant="outlined" onClick={(event) => setAnchorOptions(event.currentTarget)}>
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
            {[5, 10, 20].map((s) => (
              <MenuItem key={s} value={s}>
                {s} / page
              </MenuItem>
            ))}
          </Select>

          <Button variant="contained" onClick={redirectToCreate}>
            ➕ Nouvelle prospection
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
              <ExportButtonProspection data={prospections} selectedIds={selectedIds} />
            </Stack>
          </Menu>

          {selectedIds.length > 0 && (
            <>
              <Button variant="contained" onClick={() => setShowBulkStatusDialog(true)}>
                Changer le statut ({selectedIds.length})
              </Button>
              <Button color="error" variant="contained" onClick={() => setShowConfirm(true)}>
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
            onRowHover={handleRowHover}
            onDeleteClick={handleDeleteClick}
            onRestoreClick={handleRestoreClick}
            onHardDeleteClick={(id) => setHardDeleteId(id)}
            canHardDelete={canHardDelete}
          />
        </Box>
      )}

      {/* ───────────── Confirmation archivage ───────────── */}
      <Dialog open={showConfirm} onClose={() => setShowConfirm(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color="warning" />
          Confirmation
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedId
              ? "Archiver cette prospection ?"
              : `Archiver les ${selectedIds.length} prospections sélectionnées ?`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirm(false)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Archiver
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={hardDeleteId !== null} onClose={() => setHardDeleteId(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color="error" />
          Suppression définitive
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Cette action est irréversible. La prospection archivée sera supprimée définitivement.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHardDeleteId(null)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleHardDelete}>
            Supprimer définitivement
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showBulkStatusDialog} onClose={() => setShowBulkStatusDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Changer le statut des prospections sélectionnées</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Choisis le nouveau statut à appliquer aux {selectedIds.length} prospection(s) sélectionnée(s).
          </DialogContentText>
          <FormControl fullWidth>
            <InputLabel id="bulk-prospection-status-label">Nouveau statut</InputLabel>
            <Select
              labelId="bulk-prospection-status-label"
              value={bulkStatus}
              label="Nouveau statut"
              onChange={(event: SelectChangeEvent) => setBulkStatus(event.target.value)}
            >
              {(filtres?.statut ?? []).map((choice) => (
                <MenuItem key={choice.value} value={choice.value}>
                  {choice.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBulkStatusDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleBulkChangeStatus} disabled={bulkStatusLoading || !bulkStatus}>
            {bulkStatusLoading ? "Mise à jour..." : "Appliquer"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ───────────── Détail prospection ───────────── */}
      <ProspectionDetailModal
        open={showDetail}
        onClose={() => {
          setShowDetail(false);
          setSelectedProspection(null);
        }}
        prospectionId={detailId}
        prospection={selectedProspection}
        onEdit={(id) => navigate(`/prospections/${id}/edit`)}
      />
    </PageTemplate>
  );
}
