// ======================================================
// Liste des plans d'action formation — LOT 4
// ======================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import { AxiosError } from "axios";

import PageTemplate from "../../components/PageTemplate";
import usePagination from "../../hooks/usePagination";
import {
  deletePlanActionFormation,
  downloadPlanActionFormationPdf,
  usePlansActionFormation,
} from "../../hooks/usePlansActionFormation";
import { readRapAppApiError } from "../../api/readRapAppApiError";
import type { PlanActionFormationListQuery } from "../../types/planActionFormation";
import api from "../../api/axios";
import SearchInput from "../../components/SearchInput";
import FilterTemplate, { type FieldConfig } from "../../components/filters/FilterTemplate";
import EntityToolbar from "../../components/filters/EntityToolbar";
import PageSizeSelect from "../../components/filters/PageSizeSelect";
import ListPaginationBar from "../../components/tables/ListPaginationBar";
import PlansActionFormationTable from "./PlansActionFormationTable";

type FilterValues = {
  search: string;
  statut: string;
  centre: string;
  formation: string;
  date_debut: string;
  date_fin: string;
};

const STATUT_OPTIONS = [
  { value: "", label: "Tous" },
  { value: "brouillon", label: "Brouillon" },
  { value: "valide", label: "Validé" },
  { value: "archive", label: "Archivé" },
];

function toNumOrEmpty(s: string): number | undefined {
  if (s === "" || s == null) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Récupère une liste d’objets `{ id, nom }` depuis `liste-simple` ou listes paginées.
 */
function extractIdNomList(payload: unknown): { id: number; nom: string }[] {
  if (!payload || typeof payload !== "object") return [];
  const top = payload as { data?: unknown; results?: unknown };
  const raw = top.data ?? top;
  if (Array.isArray(raw)) {
    return raw
      .map((o) => {
        if (o && typeof o === "object" && "id" in o) {
          const id = Number((o as { id: number }).id);
          if (!Number.isFinite(id)) return null;
          const r = o as { nom?: string; label?: string; name?: string };
          const nom = r.nom ?? r.label ?? r.name;
          if (typeof nom === "string" && nom) {
            return { id, nom };
          }
          return { id, nom: `Centre #${id}` };
        }
        return null;
      })
      .filter((x): x is { id: number; nom: string } => x !== null);
  }
  if (raw && typeof raw === "object" && "results" in raw && Array.isArray((raw as { results: unknown[] }).results)) {
    return extractIdNomList({ data: (raw as { results: unknown[] }).results });
  }
  return [];
}

/**
 * Page liste : filtres, pagination, tableau, états vides / erreur.
 * Les pages création / édition pleines arrivent au lot 5 (garde WIP côté routes).
 */
export default function PlansActionFormationPage() {
  const navigate = useNavigate();
  const { page, setPage, pageSize, setPageSize, setCount, totalPages } = usePagination(1, 10);
  const [filters, setFilters] = useState<FilterValues>({
    search: "",
    statut: "",
    centre: "",
    formation: "",
    date_debut: "",
    date_fin: "",
  });
  const [centreOptions, setCentreOptions] = useState<{ value: string; label: string }[]>([]);
  const [formationOptions, setFormationOptions] = useState<{ value: string; label: string }[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [deleteBusyId, setDeleteBusyId] = useState<number | null>(null);
  const [pdfBusyId, setPdfBusyId] = useState<number | null>(null);

  const listParams: PlanActionFormationListQuery = useMemo(
    () => ({
      page,
      page_size: pageSize,
      search: filters.search || undefined,
      statut: filters.statut || undefined,
      centre: toNumOrEmpty(filters.centre),
      formation: toNumOrEmpty(filters.formation),
      date_debut_gte: filters.date_debut || undefined,
      date_fin_lte: filters.date_fin || undefined,
      ordering: "-date_debut",
    }),
    [page, pageSize, filters]
  );

  const { plans, loading, error, refetch, count: apiListCount, totalPages: apiTotalPages } =
    usePlansActionFormation(listParams);

  const openPlan = useCallback(
    (id: number) => {
      void navigate(`/plans-action-formations/${id}/edit`);
    },
    [navigate]
  );

  const handleDownloadPdf = useCallback(async (id: number) => {
    setPdfBusyId(id);
    try {
      await downloadPlanActionFormationPdf(id);
      toast.success("Le PDF a été généré.");
    } catch (e) {
      toast.error(readRapAppApiError(e, "Téléchargement du PDF impossible."));
    } finally {
      setPdfBusyId(null);
    }
  }, []);

  const handleDeletePlan = useCallback(
    async (id: number) => {
      const row = plans.find((p) => p.id === id);
      const label = row?.titre?.trim() ? `« ${row.titre} »` : "ce plan d'action";
      if (!window.confirm(`Supprimer ${label} ? Cette action est irréversible.`)) {
        return;
      }
      setDeleteBusyId(id);
      try {
        await deletePlanActionFormation(id);
        toast.success("Plan d'action supprimé.");
        await refetch();
      } catch (e) {
        const ax = e as AxiosError<{ message?: string; detail?: string }>;
        const msg =
          (ax.response?.data && typeof ax.response.data === "object" && ax.response.data.message) ||
          (typeof ax.response?.data === "object" && ax.response.data && "detail" in ax.response.data
            ? String((ax.response.data as { detail?: string }).detail)
            : null) ||
          ax.message ||
          "Suppression impossible.";
        toast.error(msg);
      } finally {
        setDeleteBusyId(null);
      }
    },
    [plans, refetch]
  );

  useEffect(() => {
    setCount(apiListCount);
  }, [apiListCount, setCount]);

  useEffect(() => {
    let cancelled = false;
    setOptionsLoading(true);
    void (async () => {
      try {
        const [cRes, fRes] = await Promise.all([
          api.get("/centres/liste-simple/", { params: { page_size: 500 } }),
          api.get("/formations/liste-simple/", { params: { page_size: 500 } }),
        ]);
        if (cancelled) return;
        const centres = extractIdNomList(cRes.data);
        const forms = extractIdNomList(fRes.data);
        setCentreOptions(centres.map((c) => ({ value: String(c.id), label: c.nom })));
        setFormationOptions(forms.map((f) => ({ value: String(f.id), label: f.nom })));
      } catch {
        if (!cancelled) toast.error("Impossible de charger les listes de filtres (centres / formations).");
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const effectiveTotalPages = apiTotalPages > 0 ? apiTotalPages : totalPages;

  const onReset = useCallback(() => {
    setFilters({
      search: "",
      statut: "",
      centre: "",
      formation: "",
      date_debut: "",
      date_fin: "",
    });
    setPage(1);
  }, [setPage]);

  const filterFields: FieldConfig<FilterValues>[] = useMemo(
    () => [
      { key: "statut", label: "Statut", type: "select", options: STATUT_OPTIONS, width: 180 },
      { key: "centre", label: "Centre", type: "select", options: centreOptions, width: 220 },
      { key: "formation", label: "Formation", type: "select", options: formationOptions, width: 280 },
      { key: "date_debut", label: "Début (plan)", type: "date" },
      { key: "date_fin", label: "Fin (plan)", type: "date" },
    ],
    [centreOptions, formationOptions]
  );

  const isEmpty = !loading && !error && plans.length === 0;

  return (
    <PageTemplate
      title="Plans d'action formation"
      subtitle="Synthèse et suivi hebdo/journalier rattachés aux commentaires de formation."
      backButton
      onBack={() => navigate(-1)}
      refreshButton
      onRefresh={() => void refetch().then(() => toast.success("Liste actualisée"))}
      showFilters
      filters={
        <Stack spacing={1.5}>
          <Box sx={{ maxWidth: 400 }}>
            <SearchInput
              value={filters.search}
              onChange={(e) => {
                setFilters((f) => ({ ...f, search: e.target.value }));
                setPage(1);
              }}
              placeholder="Recherche (titre, contenus texte, slug)…"
              disabled={loading}
            />
          </Box>
          <FilterTemplate<FilterValues>
            values={filters}
            onChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
            fields={filterFields}
            loading={optionsLoading}
            title="Filtres"
            cols={4}
            actions={{
              onReset,
              onRefresh: () => void refetch(),
              resetLabel: "Réinitialiser",
              refreshLabel: "Appliquer",
            }}
          />
        </Stack>
      }
      actions={
        <EntityToolbar>
          <PageSizeSelect
            value={pageSize}
            disabled={loading}
            onChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
          <Button
            variant="contained"
            onClick={() => navigate("/plans-action-formations/create")}
            disabled={loading}
          >
            Créer un plan d'action
          </Button>
        </EntityToolbar>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} role="alert">
          {error}
        </Alert>
      )}
      {loading && (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress color="primary" />
        </Box>
      )}
      {isEmpty && !loading && !error && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Aucun plan d'action ne correspond à ces critères. Ajustez les filtres ou créez un premier plan.
        </Alert>
      )}
      {!loading && !error && plans.length > 0 && (
        <>
          <PlansActionFormationTable
            rows={plans}
            onOpen={openPlan}
            onDelete={handleDeletePlan}
            onDownloadPdf={handleDownloadPdf}
            deleteBusyId={deleteBusyId}
            pdfBusyId={pdfBusyId}
          />
          <Box sx={{ mt: 2 }}>
            <ListPaginationBar
              page={page}
              totalPages={Math.max(1, effectiveTotalPages || 1)}
              count={apiListCount}
              onPageChange={(n) => setPage(n)}
              disabled={loading}
            />
          </Box>
        </>
      )}
    </PageTemplate>
  );
}
