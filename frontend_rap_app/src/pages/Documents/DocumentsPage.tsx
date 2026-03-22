// src/pages/documents/DocumentsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Box, Button, CircularProgress, MenuItem, Select, Stack, Typography } from "@mui/material";

import PageTemplate from "../../components/PageTemplate";
import usePagination from "../../hooks/usePagination";
import useFetch from "../../hooks/useFetch";
import useFiltresDocuments from "../../hooks/useFiltresDocuments";
import type { Document } from "../../types/document";
import type { FiltresValues } from "../../types/Filtres";
import DocumentsFiltresPanel from "../../components/filters/DocumentsFiltresPanel";
import DocumentsTable from "./DocumentsTable";
import DocumentPreview from "./DocumentPreview"; // ✅ import ajouté

export default function DocumentsPage() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [previewDoc] = useState<Document | null>(null); // ✅ nouveau

  const [filters, setFilters] = useState<FiltresValues>({
    centre_id: undefined,
    statut_id: undefined,
    type_offre_id: undefined,
  });

  const [showFilters, setShowFilters] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("documents.showFilters") === "1";
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("documents.showFilters", showFilters ? "1" : "0");
    }
  }, [showFilters]);

  const activeFiltersCount = useMemo(
    () =>
      Object.values(filters).filter((v) => {
        if (v == null) return false;
        if (typeof v === "string") return v.trim() !== "";
        if (Array.isArray(v)) return v.length > 0;
        return true;
      }).length,
    [filters]
  );

  const { formation_id } = useParams<{ formation_id?: string }>();
  const navigate = useNavigate();

  const { page, setPage, pageSize, setPageSize, hasNext, hasPrev, count, setCount, totalPages } =
    usePagination();

  const { filtres, loading: filtresLoading, error: filtresError } = useFiltresDocuments();

  const safeFiltres = useMemo(
    () =>
      filtres ?? {
        centres: [],
        statuts: [],
        type_offres: [],
        formation_etats: [],
      },
    [filtres]
  );

  const cleanFilters = useMemo(
    () => Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined)),
    [filters]
  );

  const effectiveParams = useMemo(
    () => ({
      search,
      page,
      page_size: pageSize,
      ordering: "-created_at",
      ...cleanFilters,
    }),
    [search, page, pageSize, cleanFilters]
  );

  const { data, loading, error, fetchData } = useFetch<{
    results: Document[];
    count: number;
  }>("/documents/", effectiveParams);

  useEffect(() => {
    fetchData();
  }, [fetchData, effectiveParams]);

  const documentsUniques = useMemo(() => {
    const seen = new Set<number>();
    return (data?.results ?? []).filter((d) => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });
  }, [data]);

  useEffect(() => {
    if (typeof data?.count === "number") setCount(data.count);
  }, [data, setCount]);

  const handleDelete = async () => {
    if (!selectedId) return;
    try {
      const api = await import("../../api/axios");
      await api.default.delete(`/documents/${selectedId}/`);
      toast.success("🗑️ Document supprimé");
      setSelectedId(null);
      fetchData();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  if (filtresLoading) return <CircularProgress />;
  if (filtresError) {
    return (
      <Typography color="error">
        ⚠️ Erreur lors du chargement des filtres : {filtresError}
      </Typography>
    );
  }

  return (
    <PageTemplate
      title="📄 Documents"
      backButton
      onRefresh={fetchData}
      actions={
        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="outlined" onClick={() => setShowFilters((v) => !v)}>
            {showFilters ? "🫣 Masquer filtres" : "🔎 Afficher filtres"}
            {activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ""}
          </Button>

          <input
            type="text"
            placeholder="Rechercher un document..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ padding: "6px 8px", borderRadius: 4, border: "1px solid #ccc" }}
          />

          <Select
            size="small"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {[5, 10, 20].map((n) => (
              <MenuItem key={n} value={n}>
                {n} / page
              </MenuItem>
            ))}
          </Select>

          <Button
            variant="contained"
            onClick={() =>
              navigate(`/documents/create${formation_id ? `?formation_id=${formation_id}` : ""}`)
            }
          >
            ➕ Ajouter un document
          </Button>
        </Stack>
      }
    >
      {showFilters && (
        <Box mb={2}>
          <DocumentsFiltresPanel
            filtres={safeFiltres}
            values={filters}
            onChange={(updated) => {
              setFilters(updated);
              setPage(1);
            }}
          />
        </Box>
      )}

      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Typography color="error">⚠️ Erreur lors du chargement des documents.</Typography>
      ) : documentsUniques.length ? (
        <DocumentsTable documents={documentsUniques} showActions onDelete={handleDelete} />
      ) : (
        <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
          📭 Aucun document trouvé.
        </Typography>
      )}

      {/* ✅ Pagination */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2}>
        <Typography>
          Page {page} / {totalPages} ({count} résultats)
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

      {/* ✅ Modale d’aperçu */}
      {previewDoc && (
        <DocumentPreview
          url={previewDoc.download_url || previewDoc.fichier}
          nom={previewDoc.nom_fichier}
        />
      )}
    </PageTemplate>
  );
}
