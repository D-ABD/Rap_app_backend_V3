// -----------------------------------------------------------------------------
// 📊 ObjectifPrepaPage — Liste + filtres + CRUD (création / édition modale)
// -----------------------------------------------------------------------------
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Stack,
  Typography,
  CircularProgress,
  Button,
  Select,
  MenuItem,
  Pagination,
  Box,
  Menu,
} from "@mui/material";
import { toast } from "react-toastify";

import PageTemplate from "src/components/PageTemplate";
import ObjectifPrepaTable from "./ObjectifPrepaTable";
import usePagination from "src/hooks/usePagination";
import ObjectifPrepaForm from "./ObjectifPrepaForm";

import {
  useObjectifsPrepa,
  useObjectifsPrepaFiltersOptions,
} from "src/hooks/usePrepaObjectifs";

import type { ObjectifPrepaFiltresValues } from "src/types/prepa";
import FiltresObjectifsPrepaPanel from "src/components/filters/FiltresObjectifsPrepaPanel";
import ExportButtonObjectifsPrepa from "src/components/export_buttons/ExportButtonPrepaObjectifs";
import SearchInput from "src/components/SearchInput";
import { useAuth } from "src/hooks/useAuth";
import { canWritePrepaRole } from "src/utils/roleGroups";

export default function ObjectifPrepaPage() {
  const { user } = useAuth();
  const canWritePrepa = canWritePrepaRole(user?.role);
  const [searchParams] = useSearchParams();

  const scopedCentre = useMemo(() => {
    const raw = searchParams.get("centre");
    if (!raw) return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [searchParams]);

  // 🎛️ États des filtres
  const [filters, setFilters] = useState<ObjectifPrepaFiltresValues>({
    annee: new Date().getFullYear(),
    centre: scopedCentre,
    ordering: "-annee",
    page: 1,
  });

  // 🔄 Affichage des filtres (persisté)
  const [showFilters, setShowFilters] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("objectifsPrepa.showFilters");
    return saved ? saved === "1" : false;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("objectifsPrepa.showFilters", showFilters ? "1" : "0");
    }
  }, [showFilters]);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, centre: scopedCentre }));
  }, [scopedCentre]);

  // 🔢 Pagination locale
  const { page, setPage, pageSize, setPageSize, count, setCount, totalPages } =
    usePagination();

  // 🔍 Filtres envoyés à l’API
  const effectiveFilters = useMemo(
    () => ({ ...filters, page, page_size: pageSize }),
    [filters, page, pageSize]
  );

  // 📥 Données depuis l’API
  const { data, isLoading, isError, refetch } = useObjectifsPrepa(effectiveFilters);
  const { data: options, isLoading: isLoadingOptions } =
    useObjectifsPrepaFiltersOptions();

  // ✅ Toujours un tableau (évite les erreurs .reduce)
  const objectifs = useMemo(() => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray((data as any).results)) return (data as any).results;
    return [];
  }, [data]);

  // ✅ Met à jour le compteur uniquement quand tout est prêt
  useEffect(() => {
    if (!isLoading && !isLoadingOptions) {
      setCount(objectifs.length);
    }
  }, [isLoading, isLoadingOptions, objectifs, setCount]);

  // ⚠️ Affiche une seule erreur si chargement échoue
  useEffect(() => {
    if (isError) {
      toast.error("Erreur lors du chargement des objectifs Prépa");
    }
  }, [isError]);

  // ♻️ Changement des filtres
  const handleFiltersChange = (next: ObjectifPrepaFiltresValues) => {
    setFilters(next);
    setPage(1);
  };

  // 🧮 Nombre de filtres actifs
  const activeFiltersCount = useMemo(() => {
    const ignored = new Set(["ordering", "page"]);
    return Object.entries(filters).filter(([key, val]) => {
      if (ignored.has(key)) return false;
      if (val == null) return false;
      if (typeof val === "string") return val.trim() !== "";
      return true;
    }).length;
  }, [filters]);

  // 🧩 État du formulaire (modale)
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [anchorOptions, setAnchorOptions] = useState<null | HTMLElement>(null);

  const isBusy = isLoading || isLoadingOptions;
  const hasResults = objectifs.length > 0;

  return (
    <PageTemplate
      refreshButton
      onRefresh={() => refetch()}
      headerExtra={
        <SearchInput
          placeholder="🔍 Rechercher un objectif Prépa..."
          value={filters.search ?? ""}
          onChange={(e) => {
            setFilters((prev) => ({
              ...prev,
              search: e.target.value || undefined,
            }));
            setPage(1);
          }}
        />
      }
      filters={
        showFilters && (
          <FiltresObjectifsPrepaPanel
            options={options ?? { annee: [], centre: [], departement: [] }}
            values={filters}
            hideSearch
            hideToggle
            onChange={handleFiltersChange}
            onRefresh={() => refetch()}
          />
        )
      }
      showFilters={showFilters}
      actions={
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Button
            variant="outlined"
            size="small"
            onClick={() => setShowFilters((v) => !v)}
          >
            {showFilters ? "🫣 Masquer filtres" : "🔎 Afficher filtres"}
            {activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ""}
          </Button>

          <Button
            variant="outlined"
            size="small"
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
            {[10, 20, 50].map((s) => (
              <MenuItem key={s} value={s}>
                {s} / page
              </MenuItem>
            ))}
          </Select>

          {canWritePrepa && (
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                setEditId(null);
                setShowForm(true);
              }}
            >
              + Ajouter un objectif
            </Button>
          )}

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
              <ExportButtonObjectifsPrepa data={objectifs} selectedIds={[]} />
            </Stack>
          </Menu>
        </Stack>
      }
      footer={
        hasResults ? (
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
        ) : null
      }
    >
      {isBusy ? (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
          <CircularProgress />
        </Stack>
      ) : !hasResults ? (
        <Box sx={{ textAlign: "center", color: "text.secondary", py: 4 }}>
          <Typography>
            Aucun objectif trouvé pour {filters.annee ?? new Date().getFullYear()}.
          </Typography>
        </Box>
      ) : (
        <ObjectifPrepaTable data={objectifs} />
      )}

      <ObjectifPrepaForm
        open={showForm}
        onClose={() => {
          setShowForm(false);
          refetch();
        }}
        id={editId}
      />
    </PageTemplate>
  );
}