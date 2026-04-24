import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Pagination,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import PageTemplate from "src/components/PageTemplate";
import SearchInput from "src/components/SearchInput";
import usePagination from "src/hooks/usePagination";
import {
  useObjectifsDeclic,
  useObjectifsDeclicFiltersOptions,
} from "src/hooks/useDeclicObjectifs";
import { useAuth } from "src/hooks/useAuth";
import { canWriteDeclicRole } from "src/utils/roleGroups";
import type { ObjectifDeclicFiltresValues } from "src/types/declic";

import ObjectifDeclicForm from "./ObjectifDeclicForm";
import ObjectifDeclicTable from "./ObjectifDeclicTable";

export default function ObjectifDeclicPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const canWriteDeclic = canWriteDeclicRole(user?.role);
  const initialCentre = Number(searchParams.get("centre"));

  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ObjectifDeclicFiltresValues>({
    ordering: "centre__nom",
    centre: Number.isFinite(initialCentre) && initialCentre > 0 ? initialCentre : undefined,
  });

  const { page, setPage, count, setCount, totalPages } = usePagination();
  const effectiveFilters = useMemo(
    () => ({
      ...filters,
      page,
    }),
    [filters, page]
  );

  const { data, isLoading, isError, error, refetch } = useObjectifsDeclic(effectiveFilters);
  const { data: filterOptions, isLoading: filtersLoading } = useObjectifsDeclicFiltersOptions();
  const objectifs = data?.results ?? [];

  useEffect(() => {
    setCount(data?.count ?? 0);
  }, [data?.count, setCount]);

  const updateFilters = (next: Partial<ObjectifDeclicFiltresValues>) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({ ordering: "centre__nom" });
    setPage(1);
  };

  return (
    <PageTemplate
      refreshButton
      onRefresh={() => refetch()}
      headerExtra={
        <SearchInput
          placeholder="Rechercher un objectif Declic..."
          value={filters.search ?? ""}
          onChange={(event) => updateFilters({ search: event.target.value || undefined })}
        />
      }
      actions={
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
          <Button variant="outlined" onClick={() => setShowFilters((value) => !value)}>
            {showFilters ? "Masquer filtres" : "Afficher filtres"}
          </Button>

          <Button variant="outlined" color="warning" onClick={resetFilters}>
            Reinitialiser filtres
          </Button>

          {canWriteDeclic ? (
            <Button variant="contained" onClick={() => setShowForm(true)}>
              Nouvel objectif
            </Button>
          ) : null}
        </Stack>
      }
      filters={
        showFilters ? (
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Annee"
              type="number"
              size="small"
              value={filters.annee ?? ""}
              onChange={(event) =>
                updateFilters({
                  annee: event.target.value ? Number(event.target.value) : undefined,
                })
              }
              sx={{ minWidth: 140 }}
            />

            <TextField
              label="Departement"
              size="small"
              value={filters.departement ?? ""}
              onChange={(event) =>
                updateFilters({ departement: event.target.value || undefined })
              }
              sx={{ minWidth: 180 }}
            />

            <Select
              size="small"
              displayEmpty
              value={filters.centre ?? ""}
              onChange={(event) =>
                updateFilters({
                  centre: event.target.value ? Number(event.target.value) : undefined,
                })
              }
              sx={{ minWidth: 240 }}
              disabled={filtersLoading}
            >
              <MenuItem value="">Tous les centres</MenuItem>
              {(filterOptions?.centre ?? []).map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </Stack>
        ) : undefined
      }
      footer={
        count > 0 ? (
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", sm: "center" }}
            spacing={1}
          >
            <Typography variant="body2" color="text.secondary">
              Page {page} / {totalPages} ({count} resultats)
            </Typography>

            <Box sx={{ display: "flex", justifyContent: { xs: "center", sm: "flex-end" } }}>
              <Pagination
                page={page}
                count={totalPages}
                onChange={(_, value) => setPage(value)}
                color="primary"
              />
            </Box>
          </Stack>
        ) : undefined
      }
    >
      {isLoading ? (
        <Box minHeight={220} display="flex" alignItems="center" justifyContent="center">
          <CircularProgress />
        </Box>
      ) : isError ? (
        <Box minHeight={180} display="flex" alignItems="center" justifyContent="center">
          <Typography color="error" textAlign="center">
            {error?.message || "Impossible de charger les objectifs Declic."}
          </Typography>
        </Box>
      ) : objectifs.length === 0 ? (
        <Box minHeight={180} display="flex" alignItems="center" justifyContent="center">
          <Typography color="text.secondary" textAlign="center">
            Aucun objectif Declic ne correspond aux filtres actuels.
          </Typography>
        </Box>
      ) : (
        <ObjectifDeclicTable data={objectifs} />
      )}

      <ObjectifDeclicForm
        open={showForm}
        onClose={() => {
          setShowForm(false);
          void refetch();
        }}
      />
    </PageTemplate>
  );
}
