// -----------------------------------------------------------------------------
// 📊 PrepaStatsOperations — statistiques opérationnelles (IC + Ateliers)
// -----------------------------------------------------------------------------
import * as React from "react";
import {
  Card,
  Typography,
  Box,
  Grid,
  CircularProgress,
  Alert,
  FormControl,
  Select,
  MenuItem,
  useTheme,
} from "@mui/material";
import InsightsIcon from "@mui/icons-material/Insights";
import { useAuth } from "src/hooks/useAuth";

import {
  usePrepaResume,
  usePrepaGrouped,
  PrepaFilters,
  PrepaGroupRow,
  resolveGroupLabel,
} from "src/types/prepaStats";

// -----------------------------------------------------------------------------
// 🔧 Utilitaire pour supprimer certaines clés d'un objet
// -----------------------------------------------------------------------------
function omit<T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Omit<T, K> {
  const clone = { ...obj };
  for (const k of keys) delete clone[k];
  return clone;
}

// -----------------------------------------------------------------------------
// 📊 Composant principal
// -----------------------------------------------------------------------------
export default function PrepaStatsOperations({
  title = "Indicateurs opérationnels Prépa",
  initialFilters = {},
}: {
  title?: string;
  initialFilters?: PrepaFilters;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const { user } = useAuth();
  const isAdminLike = ["admin", "superadmin"].includes((user?.role ?? "").toLowerCase());

  // -------------------------------------------------------
  // 🔹 Filtres locaux (identiques à PrepaStatsSummary)
  // -------------------------------------------------------
  const [filters, setFilters] = React.useState<PrepaFilters>({
    annee: new Date().getFullYear(),
    ...initialFilters,
  });

  // -------------------------------------------------------
  // 🔹 Chargements backend
  // -------------------------------------------------------
  const { data, isLoading, error } = usePrepaResume(filters);

  // pour listes des centres / départements
  const centreQuery = usePrepaGrouped("centre", omit(filters, ["centre"]));
  const deptQuery = usePrepaGrouped("departement", omit(filters, ["departement"]));

  if (isLoading) {
    return (
      <Card sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
        <CircularProgress size={24} />
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ p: 3, borderRadius: 3 }}>
        <Alert severity="error">Erreur : {(error as Error).message}</Alert>
      </Card>
    );
  }

  if (!data) return null;

  const statBoxBg = isDark ? "rgba(255,255,255,0.04)" : "background.paper";
  const statShadow = isDark ? "0 2px 6px rgba(0,0,0,0.5)" : "0 2px 6px rgba(0,0,0,0.05)";

  // ---------------------------------------------------------------------------
  // 🎯 Données opérationnelles (IC + ateliers)
  // ---------------------------------------------------------------------------
  const stats = [
    // 🔵 Information collective — prescriptions
    {
      label: "Prescriptions IC",
      value: data.nb_prescriptions ?? 0,
      color: theme.palette.info.main,
    },
    {
      label: "Taux prescriptions (%)",
      value: data.taux_prescription ?? 0,
      color: theme.palette.info.dark,
    },

    // 🟢 Présence IC
    {
      label: "Taux présence IC (%)",
      value: data.taux_presence_ic ?? 0,
      color: theme.palette.success.dark,
    },

    // 🟣 Ateliers
    {
      label: "Taux présence ateliers (%)",
      value: data.taux_presence_ateliers ?? 0,
      color: theme.palette.secondary.dark,
    },
  ];

  // ===========================================================================
  // 🌟 TEMPLATE IDENTIQUE À PrepaStatsSummary (filtres + affichage)
  // ===========================================================================
  return (
    <Card
      sx={{
        p: 3,
        borderRadius: 3,
        boxShadow: isDark ? "0 2px 12px rgba(0,0,0,0.6)" : 2,
        transition: "all 0.3s ease",
      }}
    >
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap">
        <Typography variant="h6" fontWeight={700}>
          <InsightsIcon
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

      {/* Filtres secondaires */}
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
              bgcolor: isDark ? "rgba(255,255,255,0.06)" : "background.paper",
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
              bgcolor: isDark ? "rgba(255,255,255,0.06)" : "background.paper",
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

      {/* Statistiques */}
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
                  boxShadow: isDark ? "0 4px 14px rgba(0,0,0,0.7)" : "0 4px 12px rgba(0,0,0,0.08)",
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
