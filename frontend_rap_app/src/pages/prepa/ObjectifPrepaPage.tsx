// -----------------------------------------------------------------------------
// 📊 ObjectifPrepaPage — Liste + filtres + CRUD (création / édition modale)
// -----------------------------------------------------------------------------
import { useEffect, useMemo, useState } from "react";
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
import ObjectifPrepaTable from "./ObjectifPrepaTable";
import usePagination from "src/hooks/usePagination";
import ObjectifPrepaForm from "./ObjectifPrepaForm";

import { useObjectifsPrepa, useObjectifsPrepaFiltersOptions } from "src/hooks/usePrepaObjectifs";

import type { ObjectifPrepaFiltresValues } from "src/types/prepa";
import FiltresObjectifsPrepaPanel from "src/components/filters/FiltresObjectifsPrepaPanel";
import ExportButtonObjectifsPrepa from "src/components/export_buttons/ExportButtonPrepaObjectifs";

export default function ObjectifPrepaPage() {
  // 🎛️ États des filtres
  const [filters, setFilters] = useState<ObjectifPrepaFiltresValues>({
    annee: new Date().getFullYear(),
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

  // 🔢 Pagination locale
  const { page, setPage, pageSize, setPageSize, count, setCount, totalPages } = usePagination();

  // 🔍 Filtres envoyés à l’API
  const effectiveFilters = useMemo(
    () => ({ ...filters, page, page_size: pageSize }),
    [filters, page, pageSize]
  );

  // 📥 Données depuis l’API
  const { data, isLoading, isError, refetch } = useObjectifsPrepa(effectiveFilters);
  const { data: options, isLoading: isLoadingOptions } = useObjectifsPrepaFiltersOptions();

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

  return (
    <PageTemplate
      title="Objectifs Prépa"
      subtitle={`Suivi des objectifs ${filters.annee ?? new Date().getFullYear()}`}
      refreshButton
      onRefresh={() => refetch()}
      filters={
        showFilters && (
          <FiltresObjectifsPrepaPanel
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
          <ExportButtonObjectifsPrepa data={objectifs} selectedIds={[]} />

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
        <ObjectifPrepaTable data={objectifs} />
      )}

      {/* 🧩 Formulaire modale */}
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
