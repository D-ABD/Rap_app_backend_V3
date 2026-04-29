import * as React from "react";
import {
  Alert,
  Box,
  Card,
  FormControl,
  Grid,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import type { AppTheme } from "src/theme";
import StatCardSkeleton from "../../components/ui/StatCardSkeleton";
import { useAuth } from "src/hooks/useAuth";
import { isAdminLikeRole } from "src/utils/roleGroups";
import {
  PrepaFilters,
  PrepaGroupRow,
  PrepaResumeCentre,
  PrepaResumeDepartement,
  resolveGroupLabel,
  usePrepaGrouped,
  usePrepaResume,
} from "src/types/prepaStats";

function omit<T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Omit<T, K> {
  const clone = { ...obj };
  for (const k of keys) delete clone[k];
  return clone;
}

function MetricMiniCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  const theme = useTheme<AppTheme>();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2.5,
        bgcolor: isDark ? alpha(accent, 0.12) : alpha(accent, 0.08),
        border: `1px solid ${alpha(accent, isDark ? 0.24 : 0.18)}`,
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h6" sx={{ mt: 0.5, color: accent, fontWeight: 800 }}>
        {value.toLocaleString("fr-FR")}
      </Typography>
    </Box>
  );
}

function GroupList({
  title,
  rows,
  labelFor,
  progressAccent,
  emptyMessage,
}: {
  title: string;
  rows: Array<PrepaResumeCentre | PrepaResumeDepartement>;
  labelFor: (row: PrepaResumeCentre | PrepaResumeDepartement) => string;
  progressAccent: string;
  emptyMessage: string;
}) {
  const theme = useTheme<AppTheme>();
  const maxReal = Math.max(...rows.map((row) => row.total ?? 0), 0);

  return (
    <Box
      sx={{
        p: 2.25,
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
        bgcolor: alpha(theme.palette.background.paper, 0.8),
        height: "100%",
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.75 }}>
        {title}
      </Typography>

      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {emptyMessage}
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {rows.slice(0, 6).map((row) => {
            const realised = row.total ?? 0;
            const engaged = row.engages ?? 0;
            const adhesions = row.adhesions ?? 0;
            const progress = maxReal > 0 ? (realised / maxReal) * 100 : 0;

            return (
              <Box
                key={`${labelFor(row)}-${realised}-${engaged}-${adhesions}`}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.03 : 0.72),
                  border: `1px solid ${alpha(theme.palette.divider, 0.65)}`,
                }}
              >
                <Box display="flex" justifyContent="space-between" gap={1.5} alignItems="center" mb={0.75}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {labelFor(row)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    A1 présents {realised.toLocaleString("fr-FR")}
                  </Typography>
                </Box>

                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    height: 8,
                    borderRadius: 999,
                    bgcolor: alpha(progressAccent, 0.12),
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 999,
                      backgroundColor: progressAccent,
                    },
                  }}
                />

                <Box display="flex" justifyContent="space-between" gap={1} mt={1}>
                  <Typography variant="caption" color="text.secondary">
                    Inscrits A1: {engaged.toLocaleString("fr-FR")}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Adhésions IC: {adhesions.toLocaleString("fr-FR")}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}

export default function PrepaStatsRepartition({
  title = "Répartition Prépa — centres & départements",
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
  const deptQuery = usePrepaGrouped("departement", omit(filters, ["departement"]));

  if (isLoading) return <StatCardSkeleton count={4} />;

  if (error) {
    return (
      <Card sx={{ p: 3, borderRadius: 3 }}>
        <Alert severity="error">Erreur : {(error as Error).message}</Alert>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card
      sx={{
        p: 3,
        borderRadius: 3,
        boxShadow: theme.custom.surface.elevated.boxShadowRest,
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            <AccountTreeIcon
              fontSize="small"
              sx={{ mr: 1, verticalAlign: "middle", color: theme.palette.primary.main }}
            />
            {title}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: theme.palette.text.secondary }}>
            Lecture terrain des entrées réelles atelier 1, des engagés et des adhésions IC par périmètre.
          </Typography>
        </Box>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={filters.annee ?? new Date().getFullYear()}
            onChange={(e) => setFilters((f) => ({ ...f, annee: Number(e.target.value) }))}
          >
            {[2023, 2024, 2025, 2026].map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
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
            onChange={(e) => setFilters((f) => ({ ...f, departement: e.target.value || undefined }))}
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

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={4}>
          <MetricMiniCard
            label="Centres actifs"
            value={data.par_centre?.length ?? 0}
            accent={theme.palette.primary.main}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <MetricMiniCard
            label="Départements couverts"
            value={data.par_departement?.length ?? 0}
            accent={theme.palette.info.main}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <MetricMiniCard
            label="Centres sans entrée réelle A1"
            value={(data.par_centre ?? []).filter((row) => (row.total ?? 0) === 0).length}
            accent={theme.palette.warning.dark}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <GroupList
            title="Répartition par centre"
            rows={data.par_centre ?? []}
            labelFor={(row) => ("centre__nom" in row ? row.centre__nom : "—")}
            progressAccent={theme.palette.primary.main}
            emptyMessage="Aucune donnée centre pour ce périmètre."
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <GroupList
            title="Répartition par département"
            rows={data.par_departement ?? []}
            labelFor={(row) => ("departement" in row ? row.departement : "—")}
            progressAccent={theme.palette.info.main}
            emptyMessage="Aucune donnée département pour ce périmètre."
          />
        </Grid>
      </Grid>
    </Card>
  );
}
