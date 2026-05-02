import * as React from "react";
import {
  Alert,
  Box,
  Card,
  FormControl,
  Grid,
  MenuItem,
  Select,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
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

const PREPA_DASHBOARD_YEARS = [2023, 2024, 2025, 2026] as const;

function omit<T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Omit<T, K> {
  const clone = { ...obj };
  for (const k of keys) delete clone[k];
  return clone;
}

function StatTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number | string;
  hint?: string;
  accent: string;
}) {
  const theme = useTheme<AppTheme>();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        p: 2.25,
        height: "100%",
        borderRadius: 2.5,
        bgcolor: isDark ? alpha(accent, 0.12) : alpha(accent, 0.08),
        border: `1px solid ${alpha(accent, isDark ? 0.28 : 0.18)}`,
        boxShadow: isDark ? theme.custom.kpi.elevation.rest.dark : theme.custom.kpi.elevation.rest.light,
      }}
    >
      <Typography variant="overline" sx={{ color: theme.palette.text.secondary, letterSpacing: 0.4 }}>
        {label}
      </Typography>
      <Typography variant="h4" sx={{ mt: 0.5, color: accent, fontWeight: 800, lineHeight: 1.1 }}>
        {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
      </Typography>
      {hint ? (
        <Typography variant="body2" sx={{ mt: 1, color: theme.palette.text.secondary }}>
          {hint}
        </Typography>
      ) : null}
    </Box>
  );
}

export default function PrepaStatsSummary({
  title = "Statistiques Prépa",
  initialFilters = {},
  filters: externalFilters,
  hideFilters = false,
}: {
  title?: string;
  initialFilters?: PrepaFilters;
  filters?: PrepaFilters;
  hideFilters?: boolean;
}) {
  const theme = useTheme<AppTheme>();
  const isDark = theme.palette.mode === "dark";
  const { user } = useAuth();
  const isAdminLike = isAdminLikeRole(user?.role);

  const [localFilters, setLocalFilters] = React.useState<PrepaFilters>({
    annee: new Date().getFullYear(),
    ...initialFilters,
  });
  const filters = externalFilters ?? localFilters;

  const groupedCentreFilters = React.useMemo(
    () => omit(filters, ["centre"]),
    [filters]
  );
  const groupedDepartementFilters = React.useMemo(
    () => omit(filters, ["departement"]),
    [filters]
  );

  const { data, isLoading, error } = usePrepaResume(filters);
  const centreQuery = usePrepaGrouped("centre", groupedCentreFilters);
  const deptQuery = usePrepaGrouped("departement", groupedDepartementFilters);

  if (isLoading) return <StatCardSkeleton count={4} />;

  if (error) {
    return (
      <Card sx={{ p: 3, borderRadius: 3 }}>
        <Alert severity="error">Erreur : {(error as Error).message}</Alert>
      </Card>
    );
  }

  if (!data) return null;

  const tunnelSteps = [
    {
      label: "Prescriptions IC",
      value: data.nb_prescriptions ?? 0,
      accent: theme.palette.info.main,
    },
    {
      label: "Présents IC",
      value: data.presents_info ?? 0,
      accent: theme.palette.primary.main,
    },
    {
      label: "Adhésions IC",
      value: data.nb_adhesions ?? 0,
      accent: theme.palette.secondary.main,
    },
    {
      label: "AT1 présents",
      value: data.atelier1_presents ?? 0,
      accent: theme.palette.success.main,
    },
  ];

  const tunnelMetrics = [
    {
      label: "Taux prescription IC",
      value: `${(data.taux_prescription ?? 0).toFixed(1)} %`,
    },
    {
      label: "Taux présence IC",
      value: `${(data.taux_presence_ic ?? 0).toFixed(1)} %`,
    },
    {
      label: "Taux adhésion IC",
      value: `${(data.taux_adhesion_ic ?? 0).toFixed(1)} %`,
    },
    {
      label: "Transformation IC → AT1",
      value: `${(
        data.nb_adhesions
          ? ((data.atelier1_presents ?? 0) / Math.max(data.nb_adhesions, 1)) * 100
          : 0
      ).toFixed(1)} %`,
    },
    {
      label: "Taux présence ateliers",
      value: `${(data.taux_presence_ateliers ?? 0).toFixed(1)} %`,
    },
  ];

  return (
    <Card
      sx={{
        p: 3,
        borderRadius: 3,
        boxShadow: theme.custom.surface.elevated.boxShadowRest,
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
        <Typography variant="h6" fontWeight={700}>
          <EmojiEventsIcon fontSize="small" sx={{ mr: 1, verticalAlign: "middle", color: theme.palette.primary.main }} />
          {title}
        </Typography>

        {!hideFilters ? (
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={filters.annee ?? new Date().getFullYear()}
              onChange={(e) => setLocalFilters((f) => ({ ...f, annee: Number(e.target.value) }))}
            >
              {PREPA_DASHBOARD_YEARS.map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : null}
      </Box>

      {!hideFilters ? (
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <Select
            value={filters.centre ?? ""}
            onChange={(e) =>
              setLocalFilters((f) => ({
                ...f,
                centre: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
            displayEmpty
            sx={{ bgcolor: isDark ? alpha(theme.palette.common.white, 0.06) : "background.paper", borderRadius: 1 }}
          >
            <MenuItem value="">{isAdminLike ? "Tous les centres (global)" : "Tous mes centres"}</MenuItem>
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

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select
            value={(filters as { departement?: string }).departement ?? ""}
            onChange={(e) => setLocalFilters((f) => ({ ...f, departement: e.target.value || undefined }))}
            displayEmpty
            sx={{ bgcolor: isDark ? alpha(theme.palette.common.white, 0.06) : "background.paper", borderRadius: 1 }}
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
      ) : null}

      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile
            label="Objectif annuel"
            value={data.objectif_total ?? 0}
            hint={`Atteinte réelle : ${(data.taux_atteinte_objectif_presents ?? 0).toFixed(1)} %`}
            accent={theme.palette.info.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile
            label="AT1 présents"
            value={data.atelier1_presents ?? 0}
            hint={`Objectif atteint : ${(data.taux_atteinte_objectif_presents ?? 0).toFixed(1)} %`}
            accent={theme.palette.success.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile
            label="Reste à faire vs AT1"
            value={data.reste_a_faire_presents ?? 0}
            hint={`Réalisé : ${(data.atelier1_presents ?? 0).toLocaleString("fr-FR")}`}
            accent={theme.palette.warning.dark}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile
            label="Reste à faire vs adhésions"
            value={Math.max((data.objectif_total ?? 0) - (data.nb_adhesions ?? 0), 0)}
            hint={`Engagé : ${(data.nb_adhesions ?? 0).toLocaleString("fr-FR")}`}
            accent={theme.palette.secondary.main}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
        <Grid item xs={12}>
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2.5,
              background: isDark
                ? `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.18)}, ${alpha(theme.palette.info.dark, 0.14)})`
                : `linear-gradient(135deg, ${alpha(theme.palette.secondary.light, 0.32)}, ${alpha(theme.palette.info.light, 0.28)})`,
              border: `1px solid ${alpha(theme.palette.secondary.main, 0.16)}`,
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
              Tunnel simple Prépa
            </Typography>
            <Grid container spacing={1.5} alignItems="stretch">
              {tunnelSteps.map((step, index) => (
                <Grid item xs={12} sm={6} md={3} key={step.label}>
                  <Box
                    sx={{
                      position: "relative",
                      p: 1.75,
                      height: "100%",
                      borderRadius: 2.5,
                      bgcolor: alpha(step.accent, isDark ? 0.16 : 0.12),
                      border: `1px solid ${alpha(step.accent, isDark ? 0.3 : 0.18)}`,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 22,
                        height: 22,
                        mb: 1,
                        borderRadius: "50%",
                        bgcolor: alpha(step.accent, isDark ? 0.34 : 0.18),
                        color: step.accent,
                        fontWeight: 800,
                      }}
                    >
                      {index + 1}
                    </Typography>
                    <Stack spacing={0.35}>
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}>
                        {step.label}
                      </Typography>
                      <Typography variant="h5" sx={{ color: step.accent, fontWeight: 800, lineHeight: 1.1 }}>
                        {step.value.toLocaleString("fr-FR")}
                      </Typography>
                    </Stack>
                  </Box>
                </Grid>
              ))}
              <Grid item xs={12}>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ pt: 0.5 }}>
                  {tunnelMetrics.map((metric) => (
                    <Box
                      key={metric.label}
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.75,
                        px: 1.25,
                        py: 0.875,
                        borderRadius: 999,
                        bgcolor: alpha(theme.palette.common.white, isDark ? 0.08 : 0.62),
                        border: `1px solid ${alpha(theme.palette.divider, isDark ? 0.22 : 0.8)}`,
                      }}
                    >
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                        {metric.label}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        {metric.value}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </Grid>
      </Grid>
    </Card>
  );
}
