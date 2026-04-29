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
        <Typography variant="h6" fontWeight={700}>
          <EmojiEventsIcon fontSize="small" sx={{ mr: 1, verticalAlign: "middle", color: theme.palette.primary.main }} />
          {title}
        </Typography>

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

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={4}>
          <StatTile
            label="Objectif annuel"
            value={data.objectif_total ?? 0}
            hint={`Reste réel: ${(data.reste_a_faire_presents ?? 0).toLocaleString("fr-FR")}`}
            accent={theme.palette.info.main}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatTile
            label="Atelier 1 inscrits"
            value={data.atelier1_inscrits ?? 0}
            hint={`Atteinte engagée: ${(data.taux_atteinte_objectif_inscrits ?? 0).toFixed(1)} %`}
            accent={theme.palette.warning.main}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatTile
            label="Atelier 1 présents"
            value={data.atelier1_presents ?? 0}
            hint={`Atteinte réelle: ${(data.taux_atteinte_objectif_presents ?? 0).toFixed(1)} %`}
            accent={theme.palette.success.main}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
        <Grid item xs={12} md={7}>
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2.5,
              bgcolor: isDark ? alpha(theme.palette.primary.main, 0.08) : alpha(theme.palette.primary.main, 0.04),
              border: `1px solid ${alpha(theme.palette.primary.main, isDark ? 0.28 : 0.12)}`,
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
              Pilotage objectif atelier 1
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <StatTile
                  label="Reste à faire engagés"
                  value={data.reste_a_faire_inscrits ?? 0}
                  hint="Basé sur les inscrits atelier 1"
                  accent={theme.palette.warning.dark}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <StatTile
                  label="Reste à faire réel"
                  value={data.reste_a_faire_presents ?? 0}
                  hint="Basé sur les présents atelier 1"
                  accent={theme.palette.success.dark}
                />
              </Grid>
            </Grid>
          </Box>
        </Grid>

        <Grid item xs={12} md={5}>
          <Box
            sx={{
              p: 2.5,
              height: "100%",
              borderRadius: 2.5,
              background: isDark
                ? `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.18)}, ${alpha(theme.palette.info.dark, 0.14)})`
                : `linear-gradient(135deg, ${alpha(theme.palette.secondary.light, 0.32)}, ${alpha(theme.palette.info.light, 0.28)})`,
              border: `1px solid ${alpha(theme.palette.secondary.main, 0.16)}`,
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
              Funnel Prépa
            </Typography>
            <Stack spacing={1.25}>
              <Box display="flex" justifyContent="space-between" gap={2}>
                <Typography color="text.secondary">Adhésions IC</Typography>
                <Typography fontWeight={700}>{(data.nb_adhesions ?? 0).toLocaleString("fr-FR")}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" gap={2}>
                <Typography color="text.secondary">Sorties atelier 6</Typography>
                <Typography fontWeight={700}>{(data.sorties_atelier_6 ?? 0).toLocaleString("fr-FR")}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" gap={2}>
                <Typography color="text.secondary">Taux adhésion IC</Typography>
                <Typography fontWeight={700}>
                  {(data.taux_adhesion_ic ?? 0).toFixed(1)} %
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" gap={2}>
                <Typography color="text.secondary">Taux rétention A1 → A6</Typography>
                <Typography fontWeight={700}>
                  {(data.taux_retention_global ?? 0).toFixed(1)} %
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Grid>
      </Grid>
    </Card>
  );
}
