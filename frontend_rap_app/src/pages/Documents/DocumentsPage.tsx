// src/pages/documents/DocumentsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Menu,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";

import PageTemplate from "../../components/PageTemplate";
import SearchInput from "../../components/SearchInput";
import usePagination from "../../hooks/usePagination";
import useFetch from "../../hooks/useFetch";
import useFiltresDocuments from "../../hooks/useFiltresDocuments";
import type { Document } from "../../types/document";
import type { FiltresValues } from "../../types/Filtres";
import DocumentsFiltresPanel from "../../components/filters/DocumentsFiltresPanel";
import DocumentsTable from "./DocumentsTable";
import { useDocumentsApi } from "../../hooks/useDocuments";
import { useAuth } from "../../hooks/useAuth";
import { isAdminLikeRole } from "../../utils/roleGroups";
import Lot1ExcelActions from "../../components/import_export/Lot1ExcelActions";
import { buildDocumentExportQueryParams } from "../../api/lot1ImportExport";

export default function DocumentsPage() {
  const [search, setSearch] = useState("");
  const [searchParams] = useSearchParams();

  const [hardDeleteId, setHardDeleteId] = useState<number | null>(null);
  const [anchorImportExport, setAnchorImportExport] =
    useState<null | HTMLElement>(null);

  const { user } = useAuth();
  const canHardDelete = isAdminLikeRole(user?.role);

  const [filters, setFilters] = useState<FiltresValues>({
    centre_id: undefined,
    statut_id: undefined,
    type_offre_id: undefined,
    avec_archivees: undefined,
    archives_seules: undefined,
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
  const formationIdFromQuery =
    searchParams.get("formation") || searchParams.get("formation_id");
  const scopedFormationId = formationIdFromQuery ?? formation_id ?? undefined;

  const navigate = useNavigate();

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    hasNext,
    hasPrev,
    count,
    setCount,
    totalPages,
  } = usePagination();

  const { filtres, loading: filtresLoading, error: filtresError } =
    useFiltresDocuments();
  const { deleteDocument, restoreDocument, hardDeleteDocument } =
    useDocumentsApi();

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
    () =>
      Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== undefined)
      ),
    [filters]
  );

  const effectiveParams = useMemo(
    () => ({
      search,
      page,
      page_size: pageSize,
      ordering: "-created_at",
      formation: scopedFormationId,
      ...cleanFilters,
    }),
    [search, page, pageSize, scopedFormationId, cleanFilters]
  );

  const documentIeParams = useMemo(
    () =>
      buildDocumentExportQueryParams({
        search,
        formation: scopedFormationId,
        centre_id: filters.centre_id,
        statut_id: filters.statut_id,
        type_offre_id: filters.type_offre_id,
        avec_archivees: filters.avec_archivees === true,
        archives_seules: filters.archives_seules === true,
        ordering: "-created_at",
      }),
    [search, scopedFormationId, filters]
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

  const handleDeleteById = async (id: number) => {
    try {
      await deleteDocument(id);
      toast.success("📦 Document archivé");
      fetchData();
    } catch {
      toast.error("Erreur lors de l'archivage");
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await restoreDocument(id);
      toast.success("♻️ Document restauré");
      fetchData();
    } catch {
      toast.error("Erreur lors de la restauration");
    }
  };

  const handleHardDelete = async () => {
    if (!hardDeleteId) return;
    try {
      await hardDeleteDocument(hardDeleteId);
      toast.success("🗑️ Document supprimé définitivement");
      setHardDeleteId(null);
      fetchData();
    } catch {
      toast.error("Erreur lors de la suppression définitive");
    }
  };

  if (filtresLoading) {
    return (
      <Box
        sx={{
          minHeight: 240,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (filtresError) {
    return (
      <Box
        sx={{
          minHeight: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <Typography color="error">
          ⚠️ Erreur lors du chargement des filtres : {filtresError}
        </Typography>
      </Box>
    );
  }

  const footer = (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      justifyContent="space-between"
      alignItems={{ xs: "stretch", sm: "center" }}
      spacing={1.5}
    >
      <Typography color="text.secondary">
        Page {page} / {totalPages} ({count} résultats)
      </Typography>

      <Stack
        direction="row"
        spacing={1}
        justifyContent={{ xs: "flex-start", sm: "flex-end" }}
      >
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
  );

  return (
    <PageTemplate
      backButton
      onRefresh={fetchData}
      headerExtra={
        <SearchInput
          placeholder="Rechercher un document..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      }
      actions={
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", sm: "center" }}
          flexWrap="wrap"
          useFlexGap
        >
          <Button variant="outlined" onClick={() => setShowFilters((v) => !v)}>
            {showFilters ? "🫣 Masquer filtres" : "🔎 Afficher filtres"}
            {activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ""}
          </Button>

          <Button
            variant={
              filters.avec_archivees || filters.archives_seules
                ? "contained"
                : "outlined"
            }
            onClick={() => {
              setFilters((prev) => ({
                ...prev,
                avec_archivees:
                  !prev.avec_archivees && !prev.archives_seules
                    ? true
                    : undefined,
                archives_seules: undefined,
              }));
              setPage(1);
            }}
          >
            {filters.avec_archivees || filters.archives_seules
              ? "Masquer archivés"
              : "Inclure archivés"}
          </Button>

          {(filters.avec_archivees || filters.archives_seules) && (
            <Button
              variant={filters.archives_seules ? "contained" : "outlined"}
              onClick={() => {
                setFilters((prev) => ({
                  ...prev,
                  avec_archivees: undefined,
                  archives_seules: prev.archives_seules ? undefined : true,
                }));
                setPage(1);
              }}
            >
              {filters.archives_seules ? "Voir tout" : "Archives seules"}
            </Button>
          )}

          <Button
            variant="outlined"
            onClick={(event) => setAnchorImportExport(event.currentTarget)}
          >
            Import / Export
          </Button>

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
              navigate(
                `/documents/create${
                  scopedFormationId ? `?formation_id=${scopedFormationId}` : ""
                }`
              )
            }
          >
            ➕ Ajouter un document
          </Button>

          <Menu
            anchorEl={anchorImportExport}
            open={Boolean(anchorImportExport)}
            onClose={() => setAnchorImportExport(null)}
            PaperProps={{
              sx: {
                mt: 1,
                width: 340,
                maxWidth: "calc(100vw - 32px)",
                p: 1.25,
                borderRadius: 3,
              },
            }}
          >
            <Box sx={{ px: 1, pt: 0.5, pb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Import / Export
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Actions techniques et échanges Excel
              </Typography>
            </Box>
            <Stack spacing={1} sx={{ px: 1, pb: 1 }}>
              <Lot1ExcelActions
                resource="document"
                exportParams={documentIeParams}
                isMobile={false}
              />
            </Stack>
          </Menu>
        </Stack>
      }
      filters={
        showFilters ? (
          <DocumentsFiltresPanel
            filtres={safeFiltres}
            values={filters}
            onChange={(updated) => {
              setFilters(updated);
              setPage(1);
            }}
          />
        ) : undefined
      }
      footer={footer}
    >
      {loading ? (
        <Box
          sx={{
            minHeight: 240,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box
          sx={{
            minHeight: 180,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <Typography color="error">
            ⚠️ Erreur lors du chargement des documents.
          </Typography>
        </Box>
      ) : documentsUniques.length > 0 ? (
        <DocumentsTable
          documents={documentsUniques}
          showActions
          onDelete={handleDeleteById}
          onRestore={handleRestore}
          onHardDelete={(id) => setHardDeleteId(id)}
          canHardDelete={canHardDelete}
        />
      ) : (
        <Box
          sx={{
            minHeight: 180,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <Typography color="text.secondary">
            📭 Aucun document trouvé.
          </Typography>
        </Box>
      )}

      <Dialog
        open={hardDeleteId !== null}
        onClose={() => setHardDeleteId(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Suppression définitive</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Cette action est irréversible. Le document archivé sera supprimé
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