import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Box, Stack, Button, Checkbox, Typography, Paper, useTheme, useMediaQuery } from "@mui/material";

import { buildLot1ExportQueryParams } from "../../api/lot1ImportExport";
import Lot1ExcelActions from "../../components/import_export/Lot1ExcelActions";
import useFetch from "../../hooks/useFetch";
import usePagination from "../../hooks/usePagination";
import PageTemplate from "../../components/PageTemplate";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import EmptyState from "../../components/ui/EmptyState";
import LoadingState from "../../components/ui/LoadingState";
import FilterTemplate, { type FieldConfig } from "../../components/filters/FilterTemplate";
import EntityToolbar from "../../components/filters/EntityToolbar";
import PageSizeSelect from "../../components/filters/PageSizeSelect";
import ListPaginationBar from "../../components/tables/ListPaginationBar";
import SelectionToolbar from "../../components/tables/SelectionToolbar";
import type { AppTheme } from "../../theme";

type TypeOffre = {
  id: number;
  nom: string;
  nom_display: string;
  autre: string;
  couleur: string;
  is_personnalise: boolean;
  is_active: boolean;
};

type TypeOffreChoice = {
  value: string;
  label: string;
  default_color: string;
};

type TypeOffresFilterForm = { search: string };

const TYPE_OFFRES_FILTER_FIELDS: FieldConfig<TypeOffresFilterForm>[] = [
  {
    key: "search",
    label: "Recherche",
    type: "text",
    placeholder: "Rechercher un type...",
  },
];

export default function TypeOffresPage() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [choicesMap, setChoicesMap] = useState<Record<string, TypeOffreChoice>>({});
  const [hardDeleteId, setHardDeleteId] = useState<number | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [hardDeleteLoading, setHardDeleteLoading] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [archivesOnly, setArchivesOnly] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const { page, setPage, count, setCount, totalPages, pageSize, setPageSize } = usePagination();

  const navigate = useNavigate();
  const theme = useTheme<AppTheme>();
  const colorFallback = theme.palette.grey[600];
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { data, loading, error, fetchData } = useFetch<{
    results: TypeOffre[];
    count: number;
  }>("/typeoffres/", {
    search: search.trim(),
    page,
    page_size: pageSize,
    ...(includeArchived ? { avec_archivees: true } : {}),
    ...(archivesOnly ? { archives_seules: true } : {}),
  });

  const typeoffres = data?.results || [];

  const lot1ExportParams = useMemo(
    () =>
      buildLot1ExportQueryParams({
        search,
        includeArchived,
        archivesOnly,
      }),
    [search, includeArchived, archivesOnly]
  );

  // 🔄 Fetch initial
  useEffect(() => {
    fetchData();
  }, [fetchData, reloadKey]);

  // 🔄 Update count
  useEffect(() => {
    if (typeof data?.count === "number") {
      setCount(data.count);
    }
  }, [data?.count, setCount]);

  // 🔄 Fetch des choices
  useEffect(() => {
    const fetchChoices = async () => {
      try {
        const api = await import("../../api/axios");
        const res = await api.default.get("/typeoffres/choices/");
        const rawChoices = res.data.data as TypeOffreChoice[];
        const mapped = rawChoices.reduce<Record<string, TypeOffreChoice>>((acc, item) => {
          acc[item.value] = item;
          return acc;
        }, {});
        setChoicesMap(mapped);
      } catch {
        toast.error("Erreur lors du chargement des types disponibles");
      }
    };
    fetchChoices();
  }, []);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const clearSelection = () => setSelectedIds([]);
  const selectAll = () => setSelectedIds(typeoffres.map((t) => t.id));

  const handleDelete = async () => {
    const idsToDelete = selectedId ? [selectedId] : selectedIds;
    if (!idsToDelete.length) return;

    setArchiveLoading(true);
    try {
      const mod = await import("../../api/axios");
      const api = mod.default as import("axios").AxiosInstance;
      await Promise.all(idsToDelete.map((id) => api.delete(`/typeoffres/${id}/`)));
      toast.success(`📦 ${idsToDelete.length} type(s) archivé(s)`);
      setShowConfirm(false);
      setSelectedId(null);
      setSelectedIds([]);
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Erreur lors de l'archivage");
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleRestore = async (id: number) => {
    try {
      const mod = await import("../../api/axios");
      const api = mod.default as import("axios").AxiosInstance;
      await api.post(`/typeoffres/${id}/desarchiver/`);
      toast.success("Type d’offre restauré");
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Erreur lors de la restauration");
    }
  };

  const handleHardDelete = async () => {
    if (!hardDeleteId) return;
    setHardDeleteLoading(true);
    try {
      const mod = await import("../../api/axios");
      const api = mod.default as import("axios").AxiosInstance;
      await api.post(`/typeoffres/${hardDeleteId}/hard-delete/`);
      toast.success("Type d’offre supprimé définitivement");
      setHardDeleteId(null);
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Erreur lors de la suppression définitive");
    } finally {
      setHardDeleteLoading(false);
    }
  };

  return (
    <PageTemplate
      title="📦 Types d’offre"
      backButton
      onBack={() => navigate(-1)}
      refreshButton
      onRefresh={() => setReloadKey((k) => k + 1)}
      actions={
        <EntityToolbar>
          <PageSizeSelect
            value={pageSize}
            onChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />

          <Lot1ExcelActions resource="type_offre" exportParams={lot1ExportParams} isMobile={isMobile} />

          <Button
            variant="contained"
            onClick={() => navigate("/typeoffres/create")}
            fullWidth={isMobile}
          >
            ➕ Ajouter un type
          </Button>

          <Button
            variant={includeArchived || archivesOnly ? "contained" : "outlined"}
            onClick={() => {
              if (includeArchived || archivesOnly) {
                setIncludeArchived(false);
                setArchivesOnly(false);
              } else {
                setIncludeArchived(true);
              }
              setPage(1);
            }}
          >
            {includeArchived || archivesOnly ? "Masquer archivés" : "Inclure archivés"}
          </Button>

          {(includeArchived || archivesOnly) && (
            <Button
              variant={archivesOnly ? "contained" : "outlined"}
              onClick={() => {
                if (archivesOnly) {
                  setArchivesOnly(false);
                  setIncludeArchived(false);
                } else {
                  setArchivesOnly(true);
                  setIncludeArchived(true);
                }
                setPage(1);
              }}
            >
              {archivesOnly ? "Voir tout" : "Archives seules"}
            </Button>
          )}

          <SelectionToolbar
            count={selectedIds.length}
            onClear={clearSelection}
            onSelectAll={selectAll}
            selectAllLabel="✅ Tout sélectionner"
            clearLabel="❌ Annuler"
          >
            <Button variant="contained" color="error" onClick={() => setShowConfirm(true)}>
              📦 Archiver ({selectedIds.length})
            </Button>
          </SelectionToolbar>
        </EntityToolbar>
      }
      filters={
        <FilterTemplate<TypeOffresFilterForm>
          values={{ search }}
          onChange={(next) => {
            setSearch(next.search);
            setPage(1);
          }}
          fields={TYPE_OFFRES_FILTER_FIELDS}
          cols={1}
        />
      }
      footer={
        count > 0 ? (
          <ListPaginationBar
            page={page}
            totalPages={totalPages}
            count={count}
            onPageChange={setPage}
            size={isMobile ? "small" : "medium"}
          />
        ) : null
      }
    >
      {loading ? (
        <LoadingState label="Chargement des types d'offre..." />
      ) : error ? (
        <Typography color="error">Erreur lors du chargement des types.</Typography>
      ) : typeoffres.length === 0 ? (
        <EmptyState
          title="Aucun type trouvé"
          description="Modifiez la recherche ou créez un type d'offre."
          action={
            <Button variant="contained" onClick={() => navigate("/typeoffres/create")}>
              Ajouter un type
            </Button>
          }
        />
      ) : (
        <Stack spacing={1}>
          {typeoffres.map((type) => {
            const label = type.is_personnalise
              ? type.autre
              : choicesMap[type.nom]?.label || type.nom_display;
            const color = type.couleur || choicesMap[type.nom]?.default_color || colorFallback;

            return (
              <Paper
                key={type.id}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  p: 2,
                  cursor: "pointer",
                }}
                onClick={() => navigate(`/typeoffres/${type.id}/edit`)}
              >
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Checkbox
                    checked={selectedIds.includes(type.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSelect(type.id)}
                  />
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {label}
                    </Typography>
                    <Box
                      sx={{
                        display: "inline-block",
                        backgroundColor: color,
                        width: 40,
                        height: 20,
                        borderRadius: 1,
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                      title={label}
                    />
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1}>
                  {type.is_active ? (
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(type.id);
                        setShowConfirm(true);
                      }}
                    >
                      📦 Archiver
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outlined"
                        color="success"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleRestore(type.id);
                        }}
                      >
                        Restaurer
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          setHardDeleteId(type.id);
                        }}
                      >
                        Supprimer définitivement
                      </Button>
                    </>
                  )}
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}

      <ConfirmDialog
        open={showConfirm}
        onClose={() => !archiveLoading && setShowConfirm(false)}
        onConfirm={handleDelete}
        loading={archiveLoading}
        tone="warning"
        title="Confirmation"
        description={
          selectedId
            ? "Archiver ce type d’offre ?"
            : `Archiver les ${selectedIds.length} types sélectionnés ?`
        }
        confirmLabel="Archiver"
        cancelLabel="Annuler"
      />

      <ConfirmDialog
        open={Boolean(hardDeleteId)}
        onClose={() => !hardDeleteLoading && setHardDeleteId(null)}
        onConfirm={handleHardDelete}
        loading={hardDeleteLoading}
        tone="danger"
        title="Suppression définitive"
        description="Cette action est irréversible. Supprimer définitivement ce type d’offre archivé ?"
        confirmLabel="Supprimer définitivement"
        cancelLabel="Annuler"
      />
    </PageTemplate>
  );
}
