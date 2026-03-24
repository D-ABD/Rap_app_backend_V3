import { useEffect, useMemo, useState } from "react";
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
} from "@mui/material";

import PageTemplate from "src/components/PageTemplate";
import usePagination from "src/hooks/usePagination";
import { useDeclicFiltersOptions, useDeclicList, useDeleteDeclic } from "src/hooks/useDeclic";
import { Declic } from "src/types/declic";
import type { DeclicFiltresValues } from "src/types/declic";
import FiltresDeclicPanel from "src/components/filters/FiltresDeclicPanel";

import DeclicTable from "./DeclicTable";
import DeclicDetailModal from "./DeclicDetailModal";
import ExportButtonDeclic from "src/components/export_buttons/ExportButtonDeclic";

export default function DeclicPage() {
  const navigate = useNavigate();

  // ───────────── Filtres (avec typage complet) ─────────────
  const [filters, setFilters] = useState<DeclicFiltresValues>({
    ordering: "-date_declic",
    page: 1,
  });

  // 🔹 Récupération dynamique des options de filtres
  const { data: filterOptions, isLoading: loadingFilters } = useDeclicFiltersOptions();

  // ───────────── Toggle filtres (persisté localStorage) ─────────────
  const [showFilters, setShowFilters] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("declic.showFilters");
    return saved != null ? saved === "1" : false;
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("declic.showFilters", showFilters ? "1" : "0");
    }
  }, [showFilters]);

  // ───────────── Pagination ─────────────
  const { page, setPage, pageSize, setPageSize, count, setCount, totalPages } = usePagination();

  const effectiveFilters = useMemo(
    () => ({ ...filters, page, page_size: pageSize }),
    [filters, page, pageSize]
  );

  // ───────────── Données Déclic ─────────────
  const { data, loading, error } = useDeclicList(effectiveFilters);
  const { remove } = useDeleteDeclic();

  const items: Declic[] = useMemo(() => data?.results ?? [], [data]);

  useEffect(() => {
    setCount(data?.count ?? 0);
  }, [data, setCount]);

  // ───────────── Sélection multi ─────────────
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  useEffect(() => {
    const visible = new Set(items.map((i) => i.id));
    setSelectedIds((prev) => prev.filter((id) => visible.has(id)));
  }, [items]);

  // ───────────── Suppression ─────────────
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    if (!selectedId) return;
    try {
      await remove(selectedId);
      toast.success("🗑️ Séance Déclic supprimée");
      setShowConfirm(false);
      setSelectedId(null);
      setPage((p) => (items.length - 1 <= 0 && p > 1 ? p - 1 : p));
      setFilters((f) => ({ ...f })); // refresh soft
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  // ───────────── Détail ─────────────
  const [selectedDeclic, setSelectedDeclic] = useState<Declic | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const handleRowClick = (id: number) => {
    const d = items.find((i) => i.id === id);
    if (d) {
      setSelectedDeclic(d);
      setShowDetail(true);
    }
  };

  // ───────────── Rendu principal ─────────────
  return (
    <PageTemplate
      title="Activités Déclic"
      refreshButton
      onRefresh={() => {
        setPage((p) => p);
        setFilters((f) => ({ ...f }));
      }}
      actions={
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap">
          {/* Affichage filtres */}
          <Button variant="outlined" onClick={() => setShowFilters((v) => !v)}>
            {showFilters ? "🫣 Masquer filtres" : "🔎 Afficher filtres"}
          </Button>

          {/* Taille de page */}
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

          {/* Création */}
          <Button variant="contained" onClick={() => navigate("/declic/create")}>
            ➕ Nouvelle séance
          </Button>

          <Button variant="outlined" onClick={() => navigate("/participants-declic")}>
            👥 Participants Déclic
          </Button>

          {/* ✅ Export Excel */}
          <ExportButtonDeclic data={items} selectedIds={selectedIds} />
        </Stack>
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
      {/* ───────────── Panneau de filtres ───────────── */}
      {showFilters && (
        <Box mb={2}>
          <FiltresDeclicPanel
            options={loadingFilters ? undefined : filterOptions}
            values={filters}
            onChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
            onRefresh={() => setFilters({ ...filters })}
          />
        </Box>
      )}

      {/* ───────────── Table principale ───────────── */}
      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Typography color="error">
          ⚠️ {error.message || "Erreur de chargement des séances Déclic."}
        </Typography>
      ) : !items.length ? (
        <Box textAlign="center" color="text.secondary" my={4}>
          <Typography>Aucune séance Déclic trouvée.</Typography>
        </Box>
      ) : (
        <DeclicTable
          items={items}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onDelete={(id) => {
            setSelectedId(id);
            setShowConfirm(true);
          }}
          onRowClick={handleRowClick}
        />
      )}

      {/* ───────────── Modale de détail ───────────── */}
      <DeclicDetailModal
        open={showDetail}
        onClose={() => setShowDetail(false)}
        declic={selectedDeclic}
        onEdit={(id) => navigate(`/declic/${id}/edit`)}
      />

      {/* ───────────── Confirmation suppression ───────────── */}
      <Dialog open={showConfirm} onClose={() => setShowConfirm(false)}>
        <DialogTitle>Confirmation</DialogTitle>
        <DialogContent>
          <DialogContentText>Supprimer cette séance Déclic ?</DialogContentText>
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
