import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Stack,
  Typography,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import ReplayIcon from "@mui/icons-material/Replay";

import PageTemplate from "../../components/PageTemplate";
import SearchInput from "../../components/SearchInput";
import usePagination from "../../hooks/usePagination";

import { CVThequeItem } from "src/types/cvtheque";
import { useCVThequeList, useDeleteCV } from "src/hooks/useCvtheque";
import CVThequeFiltresPanel from "../../components/filters/CVThequeFiltresPanel";
import { toast } from "react-toastify";
import CVThequeTable from "./cvthequeTable";
import CVThequePreview from "./cvthequePreview";

// -------------------------------
// TYPES FILTRES
// -------------------------------
export type CVFilters = {
  search?: string;
  ville?: string;
  centre_id?: number;
  formation_id?: number;
  type_offre_id?: number;
  statut_formation?: number;
  document_type?: string;
};

const defaultFilters: CVFilters = {};

export default function CVThequePage() {
  const navigate = useNavigate();

  const [filters, setFilters] = useState<CVFilters>(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);

  const [previewItem, setPreviewItem] = useState<CVThequeItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const {
    page,
    setPage,
    pageSize,
    setCount,
    totalPages,
    hasNext,
    hasPrev,
  } = usePagination();

  // -------------------------------
  // QUERY PARAMS
  // -------------------------------
  const queryParams = useMemo(
    () => ({
      search: filters.search || "",
      ville: filters.ville || undefined,
      document_type: filters.document_type || undefined,
      centre_id: filters.centre_id || undefined,
      formation_id: filters.formation_id || undefined,
      type_offre_id: filters.type_offre_id || undefined,
      statut_formation: filters.statut_formation || undefined,
      page,
      page_size: pageSize,
    }),
    [filters, page, pageSize]
  );

  // -------------------------------
  // DATA
  // -------------------------------
  const { data, loading, reload } = useCVThequeList(queryParams);
  const { remove } = useDeleteCV();

  const items: CVThequeItem[] = useMemo(
    () => (Array.isArray(data?.results) ? data.results : []),
    [data]
  );

  useEffect(() => {
    if (data?.count != null) setCount(data.count);
  }, [data?.count, setCount]);

  // -------------------------------
  // MULTI DELETE
  // -------------------------------
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDeleteMultiple = async () => {
    try {
      await Promise.all(selectedIds.map((id) => remove(id)));
      toast.success("🗑️ CV supprimés !");
      setConfirmOpen(false);
      setSelectedIds([]);
      reload();
    } catch {
      toast.error("❌ Erreur lors de la suppression");
    }
  };

  const handleDeleteOne = async (id: number) => {
    try {
      await remove(id);
      toast.success("🗑️ CV supprimé !");
      reload();
    } catch {
      toast.error("❌ Erreur lors de la suppression");
    }
  };

  // -------------------------------
  // PREVIEW
  // -------------------------------
  const handlePreview = (item: CVThequeItem) => {
    setPreviewItem(item);
    setPreviewOpen(true);
  };

const handleEdit = (id: number) => {
  navigate(`/cvtheque/${id}/edit`);
};


  // -------------------------------
  // RENDER
  // -------------------------------
  return (
    <PageTemplate
      title="📁 CVThèque"
      refreshButton
      onRefresh={() => reload()}
      actions={
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap">
          {/* Filtres */}
          <Button
            variant="outlined"
            startIcon={<FilterAltIcon />}
            onClick={() => setShowFilters((v) => !v)}
          >
            {showFilters ? "Masquer filtres" : "Afficher filtres"}
          </Button>

          {showFilters && (
            <Button
              color="warning"
              variant="outlined"
              startIcon={<ReplayIcon />}
              onClick={() => {
                setFilters(defaultFilters);
                setPage(1);
              }}
            >
              Réinitialiser
            </Button>
          )}

          {/* Search */}
          <SearchInput
            placeholder="Rechercher un titre, candidat, mot clé..."
            value={filters.search || ""}
            onChange={(e) => {
              setFilters({ ...filters, search: e.target.value });
              setPage(1);
            }}
          />

          {/* Ajout */}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate("/cvtheque/create")}
          >
            Ajouter un CV
          </Button>

          {/* Suppression */}
          {selectedIds.length > 0 && (
            <Button
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setConfirmOpen(true)}
            >
              Supprimer ({selectedIds.length})
            </Button>
          )}
        </Stack>
      }
      filters={
        showFilters &&
        data?.filters && (
          <CVThequeFiltresPanel
            filtres={data.filters}
            values={filters}
            onChange={(values) => {
              const clean: CVFilters = {
                search: filters.search,
                ville: filters.ville,
                document_type: values.document_type || undefined,
                centre_id: values.centre_id ? Number(values.centre_id) : undefined,
                formation_id: values.formation_id ? Number(values.formation_id) : undefined,
                type_offre_id: values.type_offre_id ? Number(values.type_offre_id) : undefined,
                statut_formation: values.statut_formation ? Number(values.statut_formation) : undefined,
              };
              setFilters(clean);
              setPage(1);
            }}
          />
        )
      }
    >
      {/* CONTENU */}
      {loading ? (
        <CircularProgress />
      ) : items.length === 0 ? (
        <Typography textAlign="center" color="text.secondary">
          Aucun document trouvé.
        </Typography>
      ) : (
<CVThequeTable
  rows={items}
  selectedIds={selectedIds}
  onToggleSelect={(id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }}
  onPreview={handlePreview}
  onEdit={handleEdit}   // ✅ CORRECTION ICI
  onDelete={handleDeleteOne}
/>

      )}

      {/* PAGINATION */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mt={3}>
        <Typography>
          Page {page} / {totalPages} ({data?.count || 0} résultats)
        </Typography>

        <Stack direction="row" spacing={1}>
          {hasPrev && (
            <Button variant="outlined" onClick={() => setPage(page - 1)}>
              ← Précédent
            </Button>
          )}
          {hasNext && (
            <Button variant="outlined" onClick={() => setPage(page + 1)}>
              Suivant →
            </Button>
          )}
        </Stack>
      </Stack>

      {/* CONFIRM DELETE MULTIPLE */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirmation</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Confirmer la suppression de {selectedIds.length} document(s) ?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleDeleteMultiple}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      {/* PREVIEW */}
      {previewItem && (
        <CVThequePreview
          item={previewItem}
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </PageTemplate>
  );
}
