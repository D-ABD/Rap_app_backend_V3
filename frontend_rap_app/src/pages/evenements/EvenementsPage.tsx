import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { toast } from "react-toastify";
import usePagination from "../../hooks/usePagination";
import PageTemplate from "../../components/PageTemplate";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import EmptyState from "../../components/ui/EmptyState";
import TableSkeleton from "../../components/ui/TableSkeleton";
import EvenementDetailModal from "./EvenementDetailModal";
import EvenementTable from "./EvenementTable";
import { useDeleteEvenement, useEvenementChoices, useEvenements, useEvenementStats } from "../../hooks/useEvenements";
import type { Evenement, EvenementFilters } from "../../types/evenement";
import FilterTemplate, { type FieldConfig } from "../../components/filters/FilterTemplate";
import EntityToolbar from "../../components/filters/EntityToolbar";
import PageSizeSelect from "../../components/filters/PageSizeSelect";
import ListPaginationBar from "../../components/tables/ListPaginationBar";

export default function EvenementsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { page, setPage, pageSize, setPageSize, count, setCount, totalPages } = usePagination();
  const [reloadKey, setReloadKey] = useState(0);
  const { types, formations, loading: loadingChoices } = useEvenementChoices();

  const evenementFilterFields = useMemo<FieldConfig<EvenementFilters>[]>(
    () => [
      {
        key: "formation",
        label: "Formation",
        type: "select",
        options: formations.map((formation) => ({ value: formation.id, label: formation.nom })),
      },
      {
        key: "type_evenement",
        label: "Type d'événement",
        type: "select",
        options: types.map((type) => ({ value: type.value, label: type.label })),
      },
      { key: "date_min", label: "Date min", type: "date" },
      { key: "date_max", label: "Date max", type: "date" },
    ],
    [formations, types]
  );
  const { deleteEvenement } = useDeleteEvenement();

  const toNum = (value: string | null) => {
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const urlFilters = useMemo<EvenementFilters>(
    () => ({
      formation: toNum(searchParams.get("formation")),
      type_evenement: searchParams.get("type_evenement") || undefined,
      date_min: searchParams.get("date_min") || undefined,
      date_max: searchParams.get("date_max") || undefined,
    }),
    [searchParams]
  );

  const [filters, setFilters] = useState<EvenementFilters>(urlFilters);
  useEffect(() => {
    setFilters(urlFilters);
    setPage(1);
  }, [setPage, urlFilters]);

  const effectiveFilters = useMemo(() => ({ ...filters, page, page_size: pageSize }), [filters, page, pageSize]);
  const { data, loading, error, refresh } = useEvenements(effectiveFilters, reloadKey);
  const { data: stats, loading: loadingStats } = useEvenementStats(filters.date_min, filters.date_max);

  const evenements = useMemo<Evenement[]>(() => data?.results ?? [], [data]);
  useEffect(() => {
    setCount(data?.count ?? 0);
  }, [data, setCount]);

  const [detail, setDetail] = useState<Evenement | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Evenement | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteEvenement(deleteTarget.id);
      toast.success("Événement archivé avec succès.");
      setDeleteTarget(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible d'archiver l'événement.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <PageTemplate
      title="Événements"
      backButton
      onBack={() => navigate(-1)}
      refreshButton
      onRefresh={() => {
        void refresh();
        setReloadKey((k) => k + 1);
      }}
      actions={
        <EntityToolbar>
          <PageSizeSelect
            value={pageSize}
            disabled={loadingChoices}
            onChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
          <Button variant="contained" onClick={() => navigate("/evenements/create")}>
            Ajouter un événement
          </Button>
        </EntityToolbar>
      }
      filters={
        <FilterTemplate<EvenementFilters>
          title="Filtres"
          values={filters}
          onChange={(next) => {
            setFilters(next);
            setPage(1);
          }}
          fields={evenementFilterFields}
          cols={4}
          loading={loadingChoices}
        />
      }
      footer={
        count > 0 ? (
          <ListPaginationBar page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
        ) : null
      }
    >
      {error ? <Alert severity="error">{error}</Alert> : null}

      {!loadingStats && stats ? (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            Répartition par type
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} flexWrap="wrap">
            {Object.entries(stats).map(([key, value]) => (
              <Alert key={key} severity="info" sx={{ py: 0 }}>
                {key} : {value.count}
              </Alert>
            ))}
          </Stack>
        </Box>
      ) : null}

      {loading || loadingChoices ? (
        <TableSkeleton columns={6} rows={8} showToolbar={false} />
      ) : null}

      {!loading && !loadingChoices && !error && evenements.length === 0 ? (
        <EmptyState
          title="Aucun événement trouvé"
          description="Modifiez les filtres ou ajoutez un événement."
          compact
          action={
            <Button variant="contained" onClick={() => navigate("/evenements/create")}>
              Ajouter un événement
            </Button>
          }
        />
      ) : null}

      {!loading && !loadingChoices && evenements.length > 0 ? (
        <EvenementTable
          evenements={evenements}
          onRowClick={(id) => {
            const event = evenements.find((item) => item.id === id) ?? null;
            setDetail(event);
            setShowDetail(true);
          }}
          onEdit={(id) => navigate(`/evenements/${id}/edit`)}
          onDelete={(id) => setDeleteTarget(evenements.find((item) => item.id === id) ?? null)}
        />
      ) : null}

      <EvenementDetailModal open={showDetail} onClose={() => setShowDetail(false)} evenement={detail} />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => !deleteLoading && setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        tone="warning"
        title="Archiver l'événement ?"
        description="L'événement sera archivé. Vous pourrez le retrouver selon les règles métier en vigueur."
        confirmLabel="Archiver"
        cancelLabel="Annuler"
      />
    </PageTemplate>
  );
}
