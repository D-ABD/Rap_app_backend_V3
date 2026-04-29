import * as React from "react";
import {
  Alert,
  Box,
  Card,
  FormControl,
  Grid,
  MenuItem,
  Select,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import InsightsIcon from "@mui/icons-material/Insights";
import type { AppTheme } from "src/theme";
import StatCardSkeleton from "../../components/ui/StatCardSkeleton";
import { useAuth } from "src/hooks/useAuth";
import { isAdminLikeRole } from "src/utils/roleGroups";
import {
  PrepaFilters,
  PrepaGroupRow,
  resolveGroupLabel,
  usePrepaGrouped,
  usePrepaResume,
} from "src/types/prepaStats";

function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[]
): Omit<T, K> {
  const clone = { ...obj };
  for (const k of keys) delete clone[k];
  return clone;
}

export default function PrepaStatsOperations({
  title = "Indicateurs opérationnels Prépa",
  initialFilters = {},
}: {
  title?: string;
  initialFilters?: PrepaFilters;
}) {
  const theme = useTheme<AppTheme>();
  const isDark = theme.palette.mode === "dark";
  const { user } = useAuth();
  const isAdminLike = isAdminLikeRole(user?.role);

  const [filters, setFilters] = React.useState<PrepaFilters>({
    annee: new Date().getFullYear(),
    ...initialFilters,
  });

  const { data, isLoading, error } = usePrepaResume(filters);
  const centreQuery = usePrepaGrouped("centre", omit(filters, ["centre"]));
  const deptQuery = usePrepaGrouped(
    "departement",
    omit(filters, ["departement"])
  );

  if (isLoading) return <StatCardSkeleton count={6} />;

  if (error) {
    return (
      <Card sx={{ p: 3, borderRadius: 3 }}>
        <Alert severity="error">Erreur : {(error as Error).message}</Alert>
      </Card>
    );
  }

  if (!data) return null;

  const stats = [
    {
      label: "Prescriptions IC",
      value: data.nb_prescriptions ?? 0,
      color: theme.palette.info.main,
    },
    {
      label: "Présents IC",
      value: data.presents_info ?? 0,
      color: theme.palette.info.dark,
    },
    {
      label: "Adhésions IC",
      value: data.nb_adhesions ?? 0,
      color: theme.palette.secondary.main,
    },
    {
      label: "Taux présence IC",
      value: `${(data.taux_presence_ic ?? 0).toFixed(1)} %`,
      color: theme.palette.success.dark,
    },
    {
      label: "Taux adhésion IC",
      value: `${(data.taux_adhesion_ic ?? 0).toFixed(1)} %`,
      color: theme.palette.secondary.dark,
    },
    {
      label: "Taux présence ateliers",
      value: `${(data.taux_presence_ateliers ?? 0).toFixed(1)} %`,
      color: theme.palette.warning.dark,
    },
  ];

  const selectSx = {
    borderRadius: 2,
    bgcolor: isDark
      ? alpha(theme.palette.common.white, 0.06)
      : alpha(theme.palette.common.white, 0.9),
    boxShadow: isDark ? "none" : "0 8px 20px rgba(15, 23, 42, 0.06)",
    "& .MuiSelect-select": {
      py: 1,
      fontWeight: 600,
      fontSize: 14,
    },
  };

  return (
    <Card
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 4,
        overflow: "hidden",
        position: "relative",
        border: `1px solid ${alpha(
          isDark ? theme.palette.common.white : theme.palette.primary.main,
          isDark ? 0.1 : 0.08
        )}`,
        background: isDark
          ? `linear-gradient(135deg, ${alpha(
              theme.palette.background.paper,
              0.96
            )}, ${alpha(theme.palette.primary.dark, 0.16)})`
          : `linear-gradient(135deg, ${theme.palette.background.paper}, ${alpha(
              theme.palette.primary.light,
              0.08
            )})`,
        boxShadow: theme.custom.surface.elevated.boxShadowRest,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: "0 auto auto 0",
          width: 220,
          height: 220,
          borderRadius: "50%",
          bgcolor: alpha(theme.palette.primary.main, isDark ? 0.12 : 0.08),
          filter: "blur(32px)",
          transform: "translate(-35%, -45%)",
          pointerEvents: "none",
        }}
      />

      <Box position="relative">
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
          mb={2.5}
          flexDirection={{ xs: "column", sm: "row" }}
          gap={2}
        >
          <Box>
            <Typography
              variant="h6"
              fontWeight={800}
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <Box
                component="span"
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: 2,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  color: theme.palette.primary.main,
                }}
              >
                <InsightsIcon fontSize="small" />
              </Box>
              {title}
            </Typography>

            <Typography
              variant="body2"
              sx={{ mt: 0.75, color: theme.palette.text.secondary }}
            >
              Suivi des volumes, présences et taux opérationnels.
            </Typography>
          </Box>

          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 130 } }}>
            <Select
              value={filters.annee ?? new Date().getFullYear()}
              onChange={(e) =>
                setFilters((f) => ({ ...f, annee: Number(e.target.value) }))
              }
              sx={selectSx}
            >
              {[2023, 2024, 2025, 2026].map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box
          display="flex"
          gap={1.5}
          mb={3}
          flexWrap="wrap"
          sx={{
            p: 1.25,
            borderRadius: 3,
            bgcolor: isDark
              ? alpha(theme.palette.common.white, 0.035)
              : alpha(theme.palette.common.white, 0.72),
            border: `1px solid ${alpha(
              theme.palette.divider,
              isDark ? 0.18 : 0.7
            )}`,
          }}
        >
          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 220 } }}>
            <Select
              value={filters.centre ?? ""}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  centre: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              displayEmpty
              sx={selectSx}
            >
              <MenuItem value="">
                {isAdminLike ? "Tous les centres (global)" : "Tous mes centres"}
              </MenuItem>
              {centreQuery.data?.results?.map((r: PrepaGroupRow, i: number) => {
                const value = r.id ?? r.group_key;
                return value ? (
                  <MenuItem key={i} value={String(value)}>
                    {resolveGroupLabel(r)}
                  </MenuItem>
                ) : null;
              })}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 190 } }}>
            <Select
              value={(filters as { departement?: string }).departement ?? ""}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  departement: e.target.value || undefined,
                }))
              }
              displayEmpty
              sx={selectSx}
            >
              <MenuItem value="">Tous départements</MenuItem>
              {deptQuery.data?.results?.map((r: PrepaGroupRow, i: number) => (
                <MenuItem key={i} value={String(r.group_key)}>
                  {resolveGroupLabel(r)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Grid container spacing={2}>
          {stats.map((s) => (
            <Grid item xs={12} sm={6} md={4} lg={2} key={s.label}>
              <Box
                sx={{
                  p: 2.25,
                  height: "100%",
                  minHeight: 118,
                  borderRadius: 3,
                  position: "relative",
                  overflow: "hidden",
                  bgcolor: isDark
                    ? alpha(s.color, 0.1)
                    : alpha(theme.palette.background.paper, 0.86),
                  border: `1px solid ${alpha(s.color, isDark ? 0.28 : 0.18)}`,
                  boxShadow: isDark
                    ? theme.custom.kpi.elevation.rest.dark
                    : theme.custom.kpi.elevation.rest.light,
                  transition:
                    "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    borderColor: alpha(s.color, isDark ? 0.42 : 0.32),
                    boxShadow: isDark
                      ? theme.custom.kpi.elevation.hover.dark
                      : theme.custom.kpi.elevation.hover.light,
                  },
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    top: -24,
                    right: -24,
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    bgcolor: alpha(s.color, isDark ? 0.18 : 0.1),
                  }}
                />

                <Typography
                  variant="h5"
                  sx={{
                    color: s.color,
                    fontWeight: 900,
                    mb: 0.75,
                    letterSpacing: "-0.03em",
                  }}
                >
                  {typeof s.value === "number"
                    ? s.value.toLocaleString("fr-FR")
                    : s.value}
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontWeight: 700,
                    lineHeight: 1.25,
                  }}
                >
                  {s.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Card>
  );
}