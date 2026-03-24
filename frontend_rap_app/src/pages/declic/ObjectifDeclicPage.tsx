// -----------------------------------------------------------------------------
// 📊 ObjectifDeclicPage — Liste + filtres + CRUD (création / édition modale)
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
} from "@mui/material";
import { toast } from "react-toastify";

import PageTemplate from "src/components/PageTemplate";
import ObjectifDeclicTable from "./ObjectifDeclicTable";
import FiltresObjectifsDeclicPanel from "src/components/filters/FiltresObjectifsDeclicPanel";
import ExportButtonObjectifsDeclic from "src/components/export_buttons/ExportButtonDeclicObjectifs";
import usePagination from "src/hooks/usePagination";
import ObjectifDeclicForm from "./ObjectifDeclicForm";

import { useObjectifsDeclic, useObjectifsDeclicFiltersOptions } from "src/hooks/useDeclicObjectifs";

import type { ObjectifDeclicFiltresValues } from "src/types/declic";

export default function ObjectifDeclicPage() {
  const [searchParams] = useSearchParams();
  const scopedCentre = useMemo(() => {
    const raw = searchParams.get("centre");
    if (!raw) return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [searchParams]);
  // 🎛️ États des filtres
  const [filters, setFilters] = useState<ObjectifDeclicFiltresValues>({
    annee: new Date().getFullYear(),
    centre: scopedCentre,
    ordering: "-annee",
    page: 1,
  });

  // 🔄 Affichage des filtres (persisté)
  const [showFilters, setShowFilters] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("objectifsDeclic.showFilters");
    return saved ? saved === "1" : false;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("objectifsDeclic.showFilters", showFilters ? "1" : "0");
    }
  }, [showFilters]);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, centre: scopedCentre }));
  }, [scopedCentre]);

  // 🔢 Pagination locale
  const { page, setPage, pageSize, setPageSize, count, setCount, totalPages } = usePagination();

  // 🔍 Filtres envoyés à l’API
  const effectiveFilters = useMemo(
    () => ({ ...filters, page, page_size: pageSize }),
    [filters, page, pageSize]
  );

  // 📥 Données depuis l’API
  const { data, isLoading, isError, refetch } = useObjectifsDeclic(effectiveFilters);
  const { data: options, isLoading: isLoadingOptions } = useObjectifsDeclicFiltersOptions();

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
      toast.error("Erreur lors du chargement des objectifs Déclic");
    }
  }, [isError]);

  // ♻️ Changement des filtres
  const handleFiltersChange = (next: ObjectifDeclicFiltresValues) => {
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

  return (
    <PageTemplate
      title="Objectifs Déclic"
      subtitle={`Suivi des objectifs ${filters.annee ?? new Date().getFullYear()}`}
      refreshButton
      onRefresh={() => refetch()}
      filters={
        showFilters && (
          <FiltresObjectifsDeclicPanel
            options={options ?? { annee: [], centre: [], departement: [] }} // ✅ fallback vide
            values={filters}
            onChange={handleFiltersChange}
            onRefresh={() => refetch()}
          />
        )
      }
      showFilters={showFilters}
      actionsRight={
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {/* 🔎 Bouton filtres */}
          <Button variant="outlined" onClick={() => setShowFilters((v) => !v)} size="small">
            {showFilters ? "🫣 Masquer filtres" : "🔎 Afficher filtres"}
            {activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ""}
          </Button>

          {/* 📄 Taille page */}
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

          {/* 📤 Export Excel */}
          <ExportButtonObjectifsDeclic data={objectifs} selectedIds={[]} />

          {/* ➕ Création */}
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
        </Stack>
      }
      footer={
        count > 0 && (
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems="center"
            spacing={1}
            mt={2}
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
      {/* 🧭 Contenu principal */}
      {isLoading || isLoadingOptions ? (
        <Stack alignItems="center" justifyContent="center" sx={{ mt: 6 }}>
          <CircularProgress />
        </Stack>
      ) : objectifs.length === 0 ? (
        <Box textAlign="center" color="text.secondary" my={4}>
          <Typography>
            Aucun objectif trouvé pour {filters.annee ?? new Date().getFullYear()}.
          </Typography>
        </Box>
      ) : (
        <ObjectifDeclicTable data={objectifs} />
      )}

      {/* 🧩 Formulaire modale */}
      <ObjectifDeclicForm
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
