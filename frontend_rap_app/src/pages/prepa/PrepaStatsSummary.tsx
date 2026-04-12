// -----------------------------------------------------------------------------
// 📊 PrepaStatsSummary — version corrigée avec taux de rétention global
// -----------------------------------------------------------------------------
import * as React from "react";
import { Card, Typography, Box, Grid, Alert, FormControl, Select, MenuItem, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { AppTheme } from "src/theme";
import StatCardSkeleton from "../../components/ui/StatCardSkeleton";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { useAuth } from "src/hooks/useAuth";
import { isAdminLikeRole } from "src/utils/roleGroups";

import {
  usePrepaResume,
  usePrepaGrouped,
  PrepaFilters,
  PrepaGroupRow,
  resolveGroupLabel,
} from "src/types/prepaStats";

// ───────────────────────────────────────────────
// 🔧 Utilitaire pour retirer des clés d'un objet
// ───────────────────────────────────────────────
function omit<T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Omit<T, K> {
  const clone = { ...obj };
  for (const k of keys) delete clone[k];
  return clone;
}

// ───────────────────────────────────────────────
// 📊 Composant principal
// ───────────────────────────────────────────────
export default function PrepaStatsSummary({
  title = "Statistiques Prépa",
  initialFilters = {},
}: {
  title?: string;
  initialFilters?: PrepaFilters;
}) {
  const theme = useTheme<AppTheme>();
  const isDark = theme.palette.mode === "dark";
  const { user } = useAuth();
  const isAdminLike = isAdminLikeRole(user?.role);

  // 🔹 Filtres locaux
  const [filters, setFilters] = React.useState<PrepaFilters>({
    annee: new Date().getFullYear(),
    ...initialFilters,
  });

  // 📊 Données principales du backend
  const { data, isLoading, error } = usePrepaResume(filters);
  const centreQuery = usePrepaGrouped("centre", omit(filters, ["centre"]));
  const deptQuery = usePrepaGrouped("departement", omit(filters, ["departement"]));

  const resume = data;

  // 🌀 États de chargement / erreur
  if (isLoading) {
    return <StatCardSkeleton count={3} />;
  }

  if (error) {
    return (
      <Card sx={{ p: 3, borderRadius: 3 }}>
        <Alert severity="error">Erreur : {(error as Error).message}</Alert>
      </Card>
    );
  }

  if (!resume) return null;

  const statBoxBg = isDark ? theme.custom.kpi.cardBackground.rest.dark : theme.custom.kpi.cardBackground.rest.light;
  const statShadow = isDark ? theme.custom.kpi.elevation.rest.dark : theme.custom.kpi.elevation.rest.light;

  // 🧮 Données principales (basées sur ton backend Prépa)
  const objectif = resume.objectif_total ?? 0;
  const realise = resume.realise_total ?? 0;
  const reste = resume.reste_a_faire_total ?? 0;
  const tauxAtteinte = resume.taux_atteinte_total ?? 0;

  // 📊 Statistiques à afficher
  const stats = [
    {
      label: "Objectif annuel",
      value: objectif,
      color: theme.palette.info.main,
    },
    {
      label: "Total participants",
      value: realise,
      color: theme.palette.success.main,
    },
    {
      label: "Taux d’atteinte (%)",
      value: tauxAtteinte,
      color: theme.palette.primary.main,
    },
    {
      label: "Reste à faire",
      value: reste,
      color: theme.palette.warning.main,
    },
  ];

  return (
    <Card
      sx={{
        p: 3,
        borderRadius: 3,
        boxShadow: theme.custom.surface.elevated.boxShadowRest,
        transition: "all 0.3s ease",
      }}
    >
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap">
        <Typography variant="h6" fontWeight={700}>
          <EmojiEventsIcon
            fontSize="small"
            sx={{ mr: 1, verticalAlign: "middle", color: theme.palette.primary.main }}
          />
          {title}
        </Typography>

        {/* Filtre année */}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={filters.annee ?? new Date().getFullYear()}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                annee: Number(e.target.value),
              }))
            }
          >
            {[2023, 2024, 2025, 2026].map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Filtres */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        {/* Centre */}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <Select
            value={filters.centre ?? ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                centre: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
            displayEmpty
            sx={{
              bgcolor: isDark ? alpha(theme.palette.common.white, 0.06) : "background.paper",
              borderRadius: 1,
            }}
          >
            <MenuItem value="">
              {isAdminLike ? "Tous les centres (global)" : "Tous mes centres"}
            </MenuItem>
            {centreQuery.data?.results?.map((r: PrepaGroupRow, i: number) => {
              const label = resolveGroupLabel(r);
              const value = r.id ?? r.group_key;
              return value ? (
                <MenuItem key={i} value={String(value)}>
                  {label}
                </MenuItem>
              ) : null;
            })}
          </Select>
        </FormControl>

        {/* Département */}
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select
            value={(filters as any).departement ?? ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                departement: e.target.value || undefined,
              }))
            }
            displayEmpty
            sx={{
              bgcolor: isDark ? alpha(theme.palette.common.white, 0.06) : "background.paper",
              borderRadius: 1,
            }}
          >
            <MenuItem value="">Tous départements</MenuItem>
            {deptQuery.data?.results?.map((r: PrepaGroupRow, i: number) => {
              const label = resolveGroupLabel(r);
              const value = r.group_key;
              return value ? (
                <MenuItem key={i} value={String(value)}>
                  {label}
                </MenuItem>
              ) : null;
            })}
          </Select>
        </FormControl>
      </Box>

      {/* Statistiques principales */}
      <Grid container spacing={2.5}>
        {stats.map((s) => (
          <Grid item xs={6} sm={4} md={3} key={s.label}>
            <Box
              sx={{
                p: 2.5,
                borderRadius: 2.5,
                textAlign: "center",
                bgcolor: statBoxBg,
                boxShadow: statShadow,
                transition: "all 0.2s ease",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: isDark ? theme.custom.kpi.elevation.hover.dark : theme.custom.kpi.elevation.hover.light,
                },
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  color: s.color,
                  fontWeight: 700,
                  mb: 0.5,
                  lineHeight: 1.2,
                }}
              >
                {typeof s.value === "number" ? s.value.toLocaleString("fr-FR") : s.value}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}
              >
                {s.label}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Card>
  );
}
