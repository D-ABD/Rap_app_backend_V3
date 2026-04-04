import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import {
  useListPartenaires,
  useDeletePartenaire,
  usePartenaireChoices,
  usePartenaireFilters,
} from "../../hooks/usePartenaires";
import { useMe } from "../../hooks/useUsers";
import usePagination from "../../hooks/usePagination";

import FiltresPartenairesPanel, {
  type PartenaireFilters,
} from "../../components/filters/FiltresPartenairesPanel";
import type { Partenaire } from "../../types/partenaire";
import PageTemplate from "../../components/PageTemplate";
import SearchInput from "../../components/SearchInput";
import ExportButtonPartenaires from "../../components/export_buttons/ExportButtonPartenaires";
import PartenairesTable from "./PartenaireTable";
import PartenaireCandidatDetailModal from "./PartenaireCandidatDetailModal";
import { isCoreStaffRole } from "../../utils/roleGroups";

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */
const defaultFilters: PartenaireFilters = {
  search: "",
  city: "",
  secteur_activite: "",
  type: "",
  created_by: undefined,
  has_appairages: "",
  has_prospections: "",
};

function isPaginatedPartenaires(d: unknown): d is { results: Partenaire[]; count: number } {
  if (typeof d !== "object" || d === null) return false;
  const obj = d as Record<string, unknown>;
  return Array.isArray(obj.results) && typeof obj.count === "number";
}

function dedupeByValueLabel<
  T extends { value?: string | number | null; label?: string | number | null },
>(arr: T[] = []): T[] {
  const seen = new Set<string>();
  return arr.filter((o) => {
    const k = `${String(o.value ?? "")}::${String(o.label ?? "")}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function dedupeById<T extends { id: number }>(arr: T[] = []): T[] {
  const seen = new Set<number>();
  return arr.filter((o) => {
    if (seen.has(o.id)) return false;
    seen.add(o.id);
    return true;
  });
}

/* ─────────────────────────────────────────────
   Composant principal
   ───────────────────────────────────────────── */
export default function PartenairesCandidatPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { user, loading: userLoading, error: userError } = useMe();
  const { remove } = useDeletePartenaire();
  const { data: partenaireChoices } = usePartenaireChoices();
  const { data: filterOptions, loading: filtersLoading } = usePartenaireFilters();

  const isStaff = isCoreStaffRole(user?.role);

  const [filters, setFilters] = useState<PartenaireFilters>(defaultFilters);
  const [showFilters, setShowFilters] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("partenaires.showFilters") === "1";
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("partenaires.showFilters", showFilters ? "1" : "0");
    }
  }, [showFilters]);

  const activeFiltersCount = useMemo(() => {
    const ignored = new Set(["search"]);
    return Object.entries(filters).filter(([k, v]) => {
      if (ignored.has(k)) return false;
      if (v == null) return false;
      if (typeof v === "string") return v.trim() !== "";
      if (Array.isArray(v)) return v.length > 0;
      return true;
    }).length;
  }, [filters]);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const { page, setPage, pageSize, setPageSize, count, setCount, totalPages } = usePagination();

  const queryParams = useMemo(() => {
    const base: Record<string, string | number | boolean> = {
      search: filters.search ?? "",
      page,
      page_size: pageSize,
      reloadKey,
    };
    if (isStaff && filters.created_by) base.created_by = filters.created_by as number;
    if (filters.city) base.city = filters.city;
    if (filters.secteur_activite) base.secteur_activite = filters.secteur_activite;
    if (filters.type) base.type = filters.type;
    if (filters.has_appairages) base.has_appairages = filters.has_appairages;
    if (filters.has_prospections) base.has_prospections = filters.has_prospections;
    return base;
  }, [filters, page, pageSize, reloadKey, isStaff]);

  const { data, loading, error } = useListPartenaires(queryParams);

  const partenaires: Partenaire[] = useMemo(() => {
    if (isPaginatedPartenaires(data)) return data.results;
    return Array.isArray(data) ? (data as Partenaire[]) : [];
  }, [data]);

  useEffect(() => {
    if (isPaginatedPartenaires(data)) setCount(data.count);
    else setCount(partenaires.length);
  }, [data, partenaires.length, setCount]);

  useEffect(() => {
    const visible = new Set(partenaires.map((p) => p.id));
    setSelectedIds((prev) => prev.filter((id) => visible.has(id)));
  }, [partenaires]);

  const handleDelete = async () => {
    const idsToDelete = selectedId ? [selectedId] : selectedIds;
    if (!idsToDelete.length) return;
    try {
      await Promise.all(idsToDelete.map((id) => remove(id)));
      toast.success(`📦 ${idsToDelete.length} partenaire(s) archivé(s)`);
      setShowConfirm(false);
      setSelectedId(null);
      setSelectedIds([]);
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Erreur lors de l'archivage");
    }
  };

  const handleResetFilters = () => {
    setFilters(defaultFilters);
    setPage(1);
  };

  const userOptions = useMemo(() => dedupeById(filterOptions?.users ?? []), [filterOptions]);
  const cityOptions = useMemo(
    () => dedupeByValueLabel(filterOptions?.cities ?? []),
    [filterOptions]
  );
  const secteurOptions = useMemo(
    () => dedupeByValueLabel(filterOptions?.secteurs ?? []),
    [filterOptions]
  );

  // 🔹 Gestion de la modale de détail
  const [showDetail, setShowDetail] = useState(false);
  const [selectedPartenaire, setSelectedPartenaire] = useState<Partenaire | null>(null);

  const handleRowClick = (id: number) => {
    const partenaire = partenaires.find((p) => p.id === id);
    if (partenaire) {
      setSelectedPartenaire(partenaire);
      setShowDetail(true);
    }
  };

  const handleEdit = (id: number) => {
    setShowDetail(false);
    navigate(`/partenaires/${id}/edit/candidat`);
  };

  return (
    <PageTemplate
      title="👥 Partenaires"
      refreshButton
      onRefresh={() => setReloadKey((k) => k + 1)}
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

          <SearchInput
            placeholder="Rechercher par nom, ville, secteur..."
            value={filters.search ?? ""}
            onChange={(e) => {
              setFilters({ ...filters, search: e.target.value });
              setPage(1);
            }}
          />

          <Button variant="outlined" onClick={handleResetFilters}>
            Réinitialiser
          </Button>

          <ExportButtonPartenaires
            data={
              selectedIds.length > 0
                ? partenaires.filter((p) => selectedIds.includes(p.id))
                : partenaires
            }
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
            onClick={() => navigate("/partenaires/create/candidat")}
            fullWidth={isMobile}
          >
            ➕ Nouveau partenaire
          </Button>

          {selectedIds.length > 0 && (
            <>
              <Button color="error" onClick={() => setShowConfirm(true)}>
                Archiver ({selectedIds.length})
              </Button>
              <Button
                variant="outlined"
                onClick={() => setSelectedIds(partenaires.map((p) => p.id))}
              >
                Tout sélectionner
              </Button>
              <Button variant="outlined" onClick={() => setSelectedIds([])}>
                Annuler
              </Button>
            </>
          )}
        </Stack>
      }
      filters={
        showFilters && (
          <FiltresPartenairesPanel
            values={filters}
            onChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
            users={userOptions}
            typeOptions={partenaireChoices?.types ?? []}
            secteurOptions={secteurOptions}
            cityOptions={cityOptions}
            showCreatedByFilter={isStaff}
            loading={filtersLoading}
          />
        )
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
      {userLoading || loading ? (
        <CircularProgress />
      ) : userError ? (
        <Typography color="error">Erreur utilisateur.</Typography>
      ) : error ? (
        <Typography color="error">Erreur lors du chargement des partenaires.</Typography>
      ) : partenaires.length === 0 ? (
        <Box textAlign="center" color="text.secondary" my={4}>
          <Box fontSize={48} mb={1}>
            📭
          </Box>
          <Typography>Aucun partenaire trouvé.</Typography>
        </Box>
      ) : (
        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <PartenairesTable
            partenaires={partenaires}
            selectedIds={selectedIds}
            buildProspectionsUrl={(partenaireId) => `/prospections?partenaire=${partenaireId}`}
            buildAppairagesUrl={(partenaireId) => `/appairages?partenaire=${partenaireId}`}
            onToggleSelect={(id) =>
              setSelectedIds((prev) =>
                prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
              )
            }
            onRowClick={handleRowClick} // ✅ clic ligne → modale
            onDeleteClick={(id) => {
              setSelectedId(id);
              setShowConfirm(true);
            }}
          />
        </Box>
      )}

      {/* ───────────── Détail du partenaire (modale) ───────────── */}
      <PartenaireCandidatDetailModal
        open={showDetail}
        onClose={() => setShowDetail(false)}
        partenaire={selectedPartenaire}
        onEdit={handleEdit}
      />

      {/* ───────────── Confirmation archivage ───────────── */}
      <Dialog open={showConfirm} onClose={() => setShowConfirm(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color="warning" />
          Confirmation
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedId
              ? "Archiver ce partenaire ?"
              : `Archiver les ${selectedIds.length} partenaires sélectionnés ?`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirm(false)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Archiver
          </Button>
        </DialogActions>
      </Dialog>
    </PageTemplate>
  );
}
