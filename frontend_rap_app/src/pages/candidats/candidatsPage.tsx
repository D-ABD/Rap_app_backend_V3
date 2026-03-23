// src/pages/candidats/CandidatsPage.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
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
  FormControl,
  InputLabel,
  Alert,
} from "@mui/material";

import {
  useCandidats,
  useCandidatFiltres,
  useDeleteCandidat,
  useCandidateBulkActions,
} from "../../hooks/useCandidats";
import usePagination from "../../hooks/usePagination";
import type { Candidat, CandidatFiltresValues } from "../../types/candidat";

import CandidatsTable from "./CandidatsTable";
import FiltresCandidatsPanel from "../../components/filters/FiltresCandidatsPanel";
import PageTemplate from "../../components/PageTemplate";
import ExportButtonCandidat from "../../components/export_buttons/ExportButtonCandidat";
import CandidatDetailModal from "./CandidatDetailModal";
import api from "../../api/axios";

type AtelierTreOption = {
  id: number;
  type_atelier_display?: string | null;
  date_atelier?: string | null;
  centre_detail?: { id: number; label: string } | null;
};

export default function CandidatsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const toNum = useCallback((value: string | null) => {
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, []);

  const parseBool = useCallback((value: string | null) => {
    if (!value) return undefined;
    const lowered = value.toLowerCase();
    if (["1", "true", "yes", "on"].includes(lowered)) return true;
    if (["0", "false", "no", "off"].includes(lowered)) return false;
    return undefined;
  }, []);

  const urlFilters = useMemo<CandidatFiltresValues>(
    () => ({
      search: searchParams.get("search") || "",
      ordering: searchParams.get("ordering") || "-date_inscription",
      centre: toNum(searchParams.get("centre")),
      formation: toNum(searchParams.get("formation")),
      owner: toNum(searchParams.get("owner")),
      parcours_phase: (searchParams.get("parcours_phase") as CandidatFiltresValues["parcours_phase"]) || undefined,
      statut: searchParams.get("statut") || undefined,
      cv_statut: (searchParams.get("cv_statut") as CandidatFiltresValues["cv_statut"]) || undefined,
      type_contrat: searchParams.get("type_contrat") || undefined,
      disponibilite: searchParams.get("disponibilite") || undefined,
      resultat_placement: searchParams.get("resultat_placement") || undefined,
      contrat_signe: searchParams.get("contrat_signe") || undefined,
      responsable_placement: toNum(searchParams.get("responsable_placement")),
      admissible: parseBool(searchParams.get("admissible")),
      inscrit_gespers: parseBool(searchParams.get("inscrit_gespers")),
      en_accompagnement_tre: parseBool(searchParams.get("en_accompagnement_tre")),
      en_appairage: parseBool(searchParams.get("en_appairage")),
      rqth: parseBool(searchParams.get("rqth")),
      permis_b: parseBool(searchParams.get("permis_b")),
      entretien_done: parseBool(searchParams.get("entretien_done")),
      test_is_ok: parseBool(searchParams.get("test_is_ok")),
      date_min: searchParams.get("date_min") || undefined,
      date_max: searchParams.get("date_max") || undefined,
    }),
    [parseBool, searchParams, toNum]
  );

  const [refreshNonce, setRefreshNonce] = useState(0);
  // Filtres
  const [filters, setFilters] = useState<CandidatFiltresValues>(urlFilters);

  const [showFilters, setShowFilters] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return false;
  });

  // Pagination
  const { page, setPage, pageSize, setPageSize, count, setCount, totalPages } = usePagination();

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("candidats.showFilters", showFilters ? "1" : "0");
    }
  }, [showFilters]);

  useEffect(() => {
    setFilters(urlFilters);
    setPage(1);
  }, [setPage, urlFilters]);

  type EffectiveFilters = CandidatFiltresValues & {
    page: number;
    page_size: number;
  };
  const effectiveFilters: EffectiveFilters = useMemo(
    () => ({ ...filters, page, page_size: pageSize }),
    [filters, page, pageSize]
  );

  const activeFiltersCount = useMemo(() => {
    const ignored = new Set(["page", "page_size", "search", "ordering"]);
    return Object.entries(effectiveFilters).filter(([key, val]) => {
      if (ignored.has(key)) return false;
      if (val == null) return false;
      if (typeof val === "string") return val.trim() !== "";
      if (Array.isArray(val)) return val.length > 0;
      return true;
    }).length;
  }, [effectiveFilters]);

  // Data
  const { data: pageData, loading } = useCandidats(effectiveFilters, refreshNonce);
  const { options, loading: loadingOptions } = useCandidatFiltres();
  const { remove } = useDeleteCandidat();
  const {
    loading: bulkLoading,
    bulkValidateInscription,
    bulkStartFormation,
    bulkAbandon,
    bulkAssignAtelierTre,
  } = useCandidateBulkActions();

  const items: Candidat[] = useMemo(() => pageData?.results ?? [], [pageData]);
  useEffect(() => {
    setCount(pageData?.count ?? 0);
  }, [pageData, setCount]);

  // Sélection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  useEffect(() => {
    const visible = new Set(items.map((i) => i.id));
    setSelectedIds((prev) => prev.filter((id) => visible.has(id)));
  }, [items]);

  const clearSelection = () => setSelectedIds([]);
  const selectAll = () => setSelectedIds(items.map((i) => i.id));

  const [showAtelierBulkDialog, setShowAtelierBulkDialog] = useState(false);
  const [atelierOptions, setAtelierOptions] = useState<AtelierTreOption[]>([]);
  const [loadingAteliers, setLoadingAteliers] = useState(false);
  const [selectedAtelierId, setSelectedAtelierId] = useState<number | "">("");

  const summarizeBulkResult = useCallback(
    (
      result: {
        summary: { requested: number; succeeded: number; failed: number };
        failed: Array<{ id: number; error: string }>;
      },
      successLabel: string
    ) => {
      const { summary, failed } = result;

      if (summary.failed === 0) {
        toast.success(`${successLabel} ${summary.succeeded} candidat(s).`);
        return;
      }

      if (summary.succeeded === 0) {
        const firstError = failed[0]?.error || "Aucune opération n'a pu être exécutée.";
        toast.error(firstError);
        return;
      }

      const firstError = failed[0]?.error ? ` Premier échec: ${failed[0].error}` : "";
      toast.warning(
        `${successLabel} ${summary.succeeded} candidat(s). ${summary.failed} échec(s).${firstError}`
      );
    },
    []
  );

  // Suppression
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    const idsToDelete = selectedId ? [selectedId] : selectedIds;
    if (!idsToDelete.length) return;
    try {
      await Promise.all(idsToDelete.map((id) => remove(id)));
      toast.success(`🗑️ ${idsToDelete.length} candidat(s) supprimé(s)`);
      setShowConfirm(false);
      setSelectedId(null);
      setSelectedIds([]);
      setPage((p) => p); // refresh soft
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleBulkValidate = async () => {
    if (!selectedIds.length) return;
    try {
      const result = await bulkValidateInscription(selectedIds);
      summarizeBulkResult(result, "Entrée dans le parcours de recrutement validée pour");
      clearSelection();
      refreshList();
    } catch (error: any) {
      toast.error(error?.message || "Impossible de valider l'entrée dans le parcours de recrutement.");
    }
  };

  const handleBulkStartFormation = async () => {
    if (!selectedIds.length) return;
    try {
      const result = await bulkStartFormation(selectedIds);
      summarizeBulkResult(result, "Passage en formation enregistré pour");
      clearSelection();
      refreshList();
    } catch (error: any) {
      toast.error(error?.message || "Impossible d'enregistrer l'entrée en formation.");
    }
  };

  const handleBulkAbandon = async () => {
    if (!selectedIds.length) return;
    try {
      const result = await bulkAbandon(selectedIds);
      summarizeBulkResult(result, "Abandon enregistré pour");
      clearSelection();
      refreshList();
    } catch (error: any) {
      toast.error(error?.message || "Impossible d'enregistrer l'abandon.");
    }
  };

  const openBulkAssignAtelierDialog = async () => {
    if (!selectedIds.length) return;

    setLoadingAteliers(true);
    setSelectedAtelierId("");
    setShowAtelierBulkDialog(true);

    try {
      const response = await api.get("/ateliers-tre/", {
        params: { page_size: 200, ordering: "-date_atelier" },
      });
      const payload = response.data as {
        data?: { results?: AtelierTreOption[] };
        results?: AtelierTreOption[];
      };
      const results = payload.data?.results ?? payload.results ?? [];
      setAtelierOptions(results);
    } catch {
      toast.error("Impossible de charger les ateliers TRE.");
      setShowAtelierBulkDialog(false);
    } finally {
      setLoadingAteliers(false);
    }
  };

  const handleBulkAssignAtelier = async () => {
    if (!selectedIds.length || typeof selectedAtelierId !== "number") {
      toast.error("Veuillez sélectionner un atelier TRE.");
      return;
    }

    try {
      const result = await bulkAssignAtelierTre(selectedIds, selectedAtelierId);
      summarizeBulkResult(result, "Affectation à l'atelier TRE réussie pour");
      setShowAtelierBulkDialog(false);
      clearSelection();
      refreshList();
    } catch (error: any) {
      toast.error(error?.message || "Impossible d'affecter les candidats à cet atelier TRE.");
    }
  };

  const formatAtelierLabel = useCallback((atelier: AtelierTreOption) => {
    const parts = [
      atelier.type_atelier_display || "Atelier TRE",
      atelier.date_atelier
        ? new Date(atelier.date_atelier).toLocaleDateString("fr-FR")
        : null,
      atelier.centre_detail?.label || null,
    ].filter(Boolean);

    return parts.join(" - ");
  }, []);
  // ── Détail du candidat ─────────────────────────────────────────────
  const [showDetail, setShowDetail] = useState(false);
  const [selectedCandidat, setSelectedCandidat] = useState<Candidat | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const handleRowClick = async (id: number) => {
    setLoadingDetail(true);
    setShowDetail(true);
    try {
      const api = (await import("../../api/axios")).default;
      const { data } = await api.get<Candidat>(`/candidats/${id}/`);
      const candidat = (data as { data?: Candidat }).data ?? data;
      setSelectedCandidat(candidat);
    } catch {
      toast.error("Erreur lors du chargement du candidat");
      setShowDetail(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const refreshList = useCallback(() => {
    setRefreshNonce((value) => value + 1);
  }, []);

  const refreshSelectedCandidate = useCallback(async () => {
    if (!selectedCandidat?.id) {
      refreshList();
      return;
    }

    setLoadingDetail(true);
    try {
      const api = (await import("../../api/axios")).default;
      const { data } = await api.get<Candidat>(`/candidats/${selectedCandidat.id}/`);
      const candidat = (data as { data?: Candidat }).data ?? data;
      setSelectedCandidat(candidat);
      refreshList();
    } catch {
      toast.error("Le candidat a été mis à jour, mais le rafraîchissement de l'affichage a échoué.");
      refreshList();
    } finally {
      setLoadingDetail(false);
    }
  }, [refreshList, selectedCandidat?.id]);

  const handleEdit = (id: number) => {
    navigate(`/candidats/${id}/edit`);
  };

  return (
    <PageTemplate
      title="👥 Candidats"
      refreshButton
      onRefresh={() => {
        refreshList();
      }}
      actions={
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap">
          <Button variant="outlined" onClick={() => setShowFilters((v) => !v)} fullWidth={isMobile}>
            {showFilters ? "🫣 Masquer filtres" : "🔎 Afficher filtres"}
            {activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ""}
          </Button>

          <ExportButtonCandidat
            selectedIds={selectedIds}
            label="⬇️ Exporter"
            filenameBase="candidats"
            endpointBase="/candidats"
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
            onClick={() => navigate("/candidats/create")}
            fullWidth={isMobile}
          >
            ➕ Nouveau candidat
          </Button>

          {selectedIds.length > 0 && (
            <>
              <Button variant="contained" onClick={handleBulkValidate} disabled={bulkLoading}>
                Valider le parcours ({selectedIds.length})
              </Button>
              <Button variant="contained" onClick={handleBulkStartFormation} disabled={bulkLoading}>
                Passer en formation
              </Button>
              <Button variant="outlined" onClick={openBulkAssignAtelierDialog} disabled={bulkLoading}>
                Affecter à un atelier TRE
              </Button>
              <Button variant="outlined" color="warning" onClick={handleBulkAbandon} disabled={bulkLoading}>
                Enregistrer un abandon
              </Button>
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
        (loadingOptions ? (
          <CircularProgress />
        ) : options ? (
          <FiltresCandidatsPanel
            options={options}
            values={effectiveFilters}
            onChange={(v) => {
              setFilters((f) => ({ ...f, ...v }));
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
        <CircularProgress />
      ) : !items.length ? (
        <Box textAlign="center" color="text.secondary" my={4}>
          <Typography>Aucun candidat trouvé.</Typography>
        </Box>
      ) : (
        <CandidatsTable
          items={items}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onDelete={(id) => {
            setSelectedId(id);
            setShowConfirm(true);
          }}
          onRowClick={handleRowClick} // ✅ clic → ouvre la modale
        />
      )}

      {/* Confirmation dialog */}
      <Dialog open={showConfirm} onClose={() => setShowConfirm(false)} fullWidth maxWidth="xs">
        <DialogTitle>Confirmation</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedId
              ? "Supprimer ce candidat ?"
              : `Supprimer les ${selectedIds.length} candidats sélectionnés ?`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirm(false)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
      {/* ───────────── Détail du candidat ───────────── */}
      <CandidatDetailModal
        open={showDetail}
        onClose={() => setShowDetail(false)}
        candidat={selectedCandidat}
        loading={loadingDetail}
        onEdit={handleEdit}
        onLifecycleSuccess={refreshSelectedCandidate}
      />

      <Dialog open={showAtelierBulkDialog} onClose={() => setShowAtelierBulkDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Affecter les candidats sélectionnés à un atelier TRE</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Choisissez l'atelier TRE à utiliser pour les {selectedIds.length} candidat(s) sélectionné(s).
          </DialogContentText>

          {loadingAteliers ? (
            <Box py={2} display="flex" justifyContent="center">
              <CircularProgress />
            </Box>
          ) : !atelierOptions.length ? (
            <Alert severity="warning">Aucun atelier TRE disponible pour cette affectation.</Alert>
          ) : (
            <FormControl fullWidth sx={{ mt: 1 }}>
              <InputLabel id="bulk-atelier-select-label">Atelier TRE</InputLabel>
              <Select
                labelId="bulk-atelier-select-label"
                value={selectedAtelierId}
                label="Atelier TRE"
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedAtelierId(typeof value === "number" ? value : Number(value));
                }}
              >
                {atelierOptions.map((atelier) => (
                  <MenuItem key={atelier.id} value={atelier.id}>
                    {formatAtelierLabel(atelier)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAtelierBulkDialog(false)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleBulkAssignAtelier}
            disabled={bulkLoading || loadingAteliers || !atelierOptions.length}
          >
            Affecter
          </Button>
        </DialogActions>
      </Dialog>
    </PageTemplate>
  );
}
