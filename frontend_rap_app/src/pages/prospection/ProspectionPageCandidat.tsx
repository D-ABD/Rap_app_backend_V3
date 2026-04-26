import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  Alert,
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
  Menu,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import api from "../../api/axios";

import FiltresProspectionsPanel from "../../components/filters/FiltresProspectionsPanel";
import usePagination from "../../hooks/usePagination";
import useFiltresProspections, {
  prefetchProspectionDetail,
  useProspections,
} from "../../hooks/useProspection";
import type {
  Prospection,
  ProspectionFiltresValues,
} from "../../types/prospection";
import { useRedirectToCreateProspection } from "../../hooks/useRedirectToCreateProspection";
import { useAuth } from "../../hooks/useAuth";
import ProspectionTable from "./ProspectionTable";
import SearchInput from "../../components/SearchInput";
import PageTemplate from "../../components/PageTemplate";
import ExportButtonProspection from "../../components/export_buttons/ExportButtonProspection";
import ProspectionDetailModalCandidat from "./ProspectionDetailModalCandidat";

export default function ProspectionPageCandidat() {
  const redirectToCreate = useRedirectToCreateProspection();
  const { user } = useAuth();
  const isCandidat = ["candidat", "stagiaire"].includes(user?.role ?? "");

  // ── filtres
  const [filters, setFilters] = useState<ProspectionFiltresValues>({
    search: "",
    owner: undefined,
  });

  const [showFilters, setShowFilters] = useState(false);

  // ── pagination
  const { page, setPage, pageSize, setPageSize, count, setCount, totalPages } =
    usePagination();

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

  const {
    filtres,
    loading: filtresLoading,
    error: filtresError,
  } = useFiltresProspections();

  const [reloadKey, setReloadKey] = useState(0);

  const { pageData, loading, error } = useProspections(
    effectiveFilters,
    reloadKey
  );

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
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  // ── archivage via DELETE legacy
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [anchorOptions, setAnchorOptions] = useState<null | HTMLElement>(null);

  const handleDelete = async () => {
    const idsToDelete = selectedId ? [selectedId] : selectedIds;
    if (!idsToDelete.length) return;

    try {
      await Promise.all(
        idsToDelete.map((id) => api.delete(`/prospections/${id}/candidat`))
      );
      toast.success(`📦 ${idsToDelete.length} prospection(s) archivée(s)`);
      setShowConfirm(false);
      setSelectedId(null);
      setSelectedIds([]);
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Impossible d'archiver une ou plusieurs prospections.");
    }
  };

  // ── modal de détail
  const [showDetail, setShowDetail] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [selectedProspection, setSelectedProspection] =
    useState<Prospection | null>(null);

  const handleRowClick = (id: number, prospection?: Prospection) => {
    setSelectedProspection(prospection ?? null);
    setDetailId(id);
    setShowDetail(true);

    void prefetchProspectionDetail(id)
      .then((detail) => {
        setSelectedProspection((current) =>
          current?.id === id || !current ? detail : current
        );
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

  const hasResults = prospections.length > 0;

  return (
    <PageTemplate
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
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
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
                  return {
                    ...prev,
                    avec_archivees: undefined,
                    activite: undefined,
                  };
                }
                return { ...prev, avec_archivees: next ? true : undefined };
              });
              setPage(1);
            }}
          >
            {filters.avec_archivees
              ? "🗂️ Masquer archivés"
              : "🗃️ Inclure archivés"}
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

          <Button
            variant="outlined"
            onClick={(event) => setAnchorOptions(event.currentTarget)}
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
                width: 320,
                maxWidth: "calc(100vw - 32px)",
                p: 1.25,
              },
            }}
          >
            <Box sx={{ px: 1, pt: 0.5, pb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Options
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Export et actions secondaires
              </Typography>
            </Box>

            <Stack spacing={1} sx={{ px: 1, pb: 1 }}>
              <ExportButtonProspection
                data={prospections}
                selectedIds={selectedIds}
              />
            </Stack>
          </Menu>
        </Stack>
      }
      filters={
        showFilters &&
        (filtresLoading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 2 }}>
            <CircularProgress size={24} />
          </Stack>
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
          <Alert severity="error" variant="outlined">
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Impossible de charger les filtres de prospection.
            </Typography>
            <Typography variant="body2">
              {filtresError?.message ||
                "Les filtres ne sont pas disponibles pour le moment."}
            </Typography>
          </Alert>
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
        <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
          <CircularProgress />
        </Stack>
      ) : error ? (
        <Alert severity="error" variant="outlined">
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            Impossible de charger les prospections.
          </Typography>
          <Typography variant="body2">
            {error.message ||
              "Le chargement de la liste a échoué. Réessayez dans un instant."}
          </Typography>
        </Alert>
      ) : !hasResults ? (
        <Box sx={{ textAlign: "center", color: "text.secondary", py: 4 }}>
          <Box sx={{ fontSize: 48, mb: 1 }}>📭</Box>
          <Typography>Aucune prospection trouvée.</Typography>
        </Box>
      ) : (
        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <ProspectionTable
            prospections={prospections}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onRowClick={handleRowClick}
            onRowHover={handleRowHover}
            onDeleteClick={handleDeleteClick}
            onRestoreClick={handleRestoreClick}
          />
        </Box>
      )}

      {/* ───────────── Confirmation archivage ───────────── */}
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

      {/* ───────────── Détail prospection ───────────── */}
      <ProspectionDetailModalCandidat
        open={showDetail}
        onClose={() => {
          setShowDetail(false);
          setSelectedProspection(null);
        }}
        prospectionId={detailId}
        prospection={selectedProspection}
      />
    </PageTemplate>
  );
}
