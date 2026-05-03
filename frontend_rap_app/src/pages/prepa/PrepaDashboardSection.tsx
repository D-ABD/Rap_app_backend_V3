import * as React from "react";
import {
  Alert,
  Box,
  Card,
  FormControl,
  FormControlLabel,
  Grid,
  MenuItem,
  Select,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import type { AppTheme } from "src/theme";
import { useAuth } from "src/hooks/useAuth";
import { useStagiairesPrepaSynthese } from "src/hooks/useStagiairesPrepa";
import { isAdminLikeRole } from "src/utils/roleGroups";
import {
  PrepaFilters,
  PrepaGroupRow,
  resolveGroupLabel,
  usePrepaGrouped,
  usePrepaResume,
} from "src/types/prepaStats";
import StatCardSkeleton from "src/components/ui/StatCardSkeleton";

const PREPA_DASHBOARD_YEARS = [2023, 2024, 2025, 2026] as const;

function DashboardTile({
  label,
  value,
  hint,
  emphasis,
  accent,
}: {
  label: string;
  value: number | string;
  hint?: string;
  emphasis?: string;
  accent: string;
}) {
  const theme = useTheme<AppTheme>();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        p: 2,
        height: "100%",
        borderRadius: 2.5,
        bgcolor: isDark ? alpha(accent, 0.12) : alpha(accent, 0.08),
        border: `1px solid ${alpha(accent, isDark ? 0.26 : 0.16)}`,
      }}
    >
      <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="h4" sx={{ mt: 0.5, color: accent, fontWeight: 800, lineHeight: 1.05 }}>
        {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
      </Typography>
      {emphasis ? (
        <Typography
          variant="body2"
          sx={{
            mt: 0.9,
            fontWeight: 800,
            color: accent,
            lineHeight: 1.2,
          }}
        >
          {emphasis}
        </Typography>
      ) : null}
      {hint ? (
        <Typography variant="caption" sx={{ display: "block", mt: 0.9, color: theme.palette.text.secondary }}>
          {hint}
        </Typography>
      ) : null}
    </Box>
  );
}

export default function PrepaDashboardSection() {
  const theme = useTheme<AppTheme>();
  const isDark = theme.palette.mode === "dark";
  const { user } = useAuth();
  const isAdminLike = isAdminLikeRole(user?.role);

  const [filters, setFilters] = React.useState<PrepaFilters>({
    annee: new Date().getFullYear(),
    avec_archivees: false,
  });

  const groupedFilters = React.useMemo(
    () => ({
      ...filters,
    }),
    [filters]
  );

  const parcoursFilters = React.useMemo(
    () => ({
      annee: filters.annee,
      centre: typeof filters.centre === "number" ? filters.centre : undefined,
      departement: filters.departement,
      avec_archivees: filters.avec_archivees,
    }),
    [filters]
  );

  const centreQuery = usePrepaGrouped("centre", groupedFilters);
  const departementQuery = usePrepaGrouped("departement", groupedFilters);

  const resumeQuery = usePrepaResume(groupedFilters);
  const parcoursQuery = useStagiairesPrepaSynthese(parcoursFilters);
  const resume = resumeQuery.data;
  const parcours = parcoursQuery.data;
  const tunnelSteps = React.useMemo(
    () => [
      {
        label: "Prescriptions IC",
        value: resume?.nb_prescriptions ?? 0,
        accent: theme.palette.info.main,
        metrics: [
          {
            label: "Taux prescription",
            value: `${(resume?.taux_prescription ?? 0).toFixed(1)} %`,
          },
        ],
      },
      {
        label: "Présents IC",
        value: resume?.presents_info ?? 0,
        accent: theme.palette.primary.main,
        metrics: [
          {
            label: "Taux présence IC",
            value: `${(resume?.taux_presence_ic ?? 0).toFixed(1)} %`,
          },
        ],
      },
      {
        label: "Adhésions IC",
        value: resume?.nb_adhesions ?? 0,
        accent: theme.palette.secondary.main,
        metrics: [
          {
            label: "Taux adhésion IC",
            value: `${(resume?.taux_adhesion_ic ?? 0).toFixed(1)} %`,
          },
        ],
      },
      {
        label: "AT1 présents",
        value: resume?.atelier1_presents ?? 0,
        accent: theme.palette.success.main,
        metrics: [
          {
            label: "Transformation IC → AT1",
            value: `${(
              resume?.nb_adhesions
                ? ((resume?.atelier1_presents ?? 0) / Math.max(resume.nb_adhesions, 1)) * 100
                : 0
            ).toFixed(1)} %`,
          },
        ],
      },
    ],
    [
      resume?.atelier1_presents,
      resume?.nb_adhesions,
      resume?.nb_prescriptions,
      resume?.presents_info,
      resume?.taux_adhesion_ic,
      resume?.taux_presence_ic,
      resume?.taux_prescription,
      theme.palette.info.main,
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.success.main,
    ]
  );

  if (resumeQuery.isLoading || parcoursQuery.isLoading) {
    return <StatCardSkeleton count={8} />;
  }

  if (resumeQuery.error || parcoursQuery.error) {
    return (
      <Card sx={{ p: 3, borderRadius: 3 }}>
        <Alert severity="error">
          Erreur : {(resumeQuery.error ?? parcoursQuery.error)?.message}
        </Alert>
      </Card>
    );
  }

  if (!resume || !parcours) return null;

  const atteinteReelle = resume.objectif_total
    ? ((resume.atelier1_presents ?? 0) / Math.max(resume.objectif_total, 1)) * 100
    : 0;
  const atteinteEngagee = resume.objectif_total
    ? ((resume.nb_adhesions ?? 0) / Math.max(resume.objectif_total, 1)) * 100
    : 0;

  return (
    <Card
      sx={{
        p: 3,
        borderRadius: 3,
        boxShadow: theme.custom.surface.elevated.boxShadowRest,
      }}
    >
      <Stack spacing={3}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "stretch", md: "center" },
            flexDirection: { xs: "column", md: "row" },
            gap: 1.5,
          }}
        >
          <Box>
            <Typography variant="h6" fontWeight={800}>
              Dashboard Prépa
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Objectif, tunnel IC → AT1 et suivi des parcours stagiaires.
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} useFlexGap>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={Boolean(filters.avec_archivees)}
                  onChange={(_, checked) =>
                    setFilters((prev) => ({
                      ...prev,
                      avec_archivees: checked || undefined,
                    }))
                  }
                />
              }
              label="Inclure les archivés"
              sx={{ mx: 0.25 }}
            />

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={filters.annee ?? new Date().getFullYear()}
                onChange={(e) => setFilters((prev) => ({ ...prev, annee: Number(e.target.value) }))}
              >
                {PREPA_DASHBOARD_YEARS.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <Select
                value={filters.departement ?? ""}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    departement: e.target.value || undefined,
                    centre: undefined,
                  }))
                }
                displayEmpty
              >
                <MenuItem value="">Tous départements</MenuItem>
                {departementQuery.data?.results?.map((row: PrepaGroupRow, index: number) => (
                  <MenuItem key={index} value={String(row.group_key)}>
                    {resolveGroupLabel(row)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 240 }}>
              <Select
                value={filters.centre ?? ""}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    centre: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                displayEmpty
              >
                <MenuItem value="">{isAdminLike ? "Tous les centres" : "Tous mes centres"}</MenuItem>
                {centreQuery.data?.results?.map((row: PrepaGroupRow, index: number) => {
                  const value = row.id ?? row.group_key;
                  return value ? (
                    <MenuItem key={index} value={String(value)}>
                      {resolveGroupLabel(row)}
                    </MenuItem>
                  ) : null;
                })}
              </Select>
            </FormControl>
          </Stack>
        </Box>

        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
            Synthèse annuelle
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <DashboardTile
                label="Objectif annuel"
                value={resume.objectif_total ?? 0}
                hint={`Atteinte réelle : ${atteinteReelle.toFixed(1)} %`}
                accent={theme.palette.info.main}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DashboardTile
                label="Nombre d'IC"
                value={resume.nombre_ic ?? 0}
                hint="Séances d'information collective"
                accent={theme.palette.primary.main}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DashboardTile
                label="Reste à faire vs AT1"
                value={resume.reste_a_faire_presents ?? 0}
                emphasis={`Réalisé : ${(resume.atelier1_presents ?? 0).toLocaleString("fr-FR")}`}
                hint={`Atteinte réelle : ${atteinteReelle.toFixed(1)} %`}
                accent={theme.palette.warning.dark}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DashboardTile
                label="Reste à faire vs adhésions"
                value={Math.max((resume.objectif_total ?? 0) - (resume.nb_adhesions ?? 0), 0)}
                emphasis={`Adhésions IC : ${(resume.nb_adhesions ?? 0).toLocaleString("fr-FR")}`}
                hint={`Atteinte engagée : ${atteinteEngagee.toFixed(1)} %`}
                accent={theme.palette.secondary.main}
              />
            </Grid>
          </Grid>
        </Box>

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
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
            Tunnel Prépa
          </Typography>
          <Grid container spacing={1.5} alignItems="stretch">
            {tunnelSteps.map((step) => (
              <Grid item xs={12} sm={6} md={3} key={step.label}>
                <Box
                  sx={{
                    p: 1.75,
                    height: "100%",
                    borderRadius: 2.5,
                    bgcolor: alpha(step.accent, isDark ? 0.16 : 0.12),
                    border: `1px solid ${alpha(step.accent, isDark ? 0.3 : 0.18)}`,
                  }}
                >
                  <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}>
                    {step.label}
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 0.35, color: step.accent, fontWeight: 800 }}>
                    {step.value.toLocaleString("fr-FR")}
                  </Typography>
                  <Stack spacing={0.6} sx={{ mt: 1.2 }}>
                    {step.metrics.map((metric) => (
                      <Box
                        key={metric.label}
                        sx={{
                          px: 1,
                          py: 0.75,
                          borderRadius: 1.5,
                          bgcolor: alpha(theme.palette.common.white, isDark ? 0.08 : 0.55),
                          border: `1px solid ${alpha(step.accent, isDark ? 0.18 : 0.12)}`,
                        }}
                      >
                        <Typography variant="caption" sx={{ display: "block", color: theme.palette.text.secondary }}>
                          {metric.label}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: step.accent }}>
                          {metric.value}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
            Parcours stagiaires
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <DashboardTile
                label="Total suivis"
                value={parcours.total_stagiaires ?? 0}
                accent={theme.palette.text.primary}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DashboardTile
                label="En attente de parcours"
                value={parcours.pipeline_en_attente_demarrage ?? parcours.en_attente_entree ?? 0}
                accent={theme.palette.text.secondary}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DashboardTile
                label="Parcours terminés"
                value={parcours.termines ?? parcours.pipeline_termine ?? 0}
                accent={theme.palette.success.main}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DashboardTile
                label="Orientés AFPA"
                value={parcours.orientes_afpa ?? 0}
                hint={`Transformation : ${(parcours.taux_transformation_vers_afpa ?? 0).toFixed(1)} %`}
                accent={theme.palette.info.dark}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DashboardTile
                label="En attente de suite"
                value={parcours.pipeline_en_attente_suite ?? parcours.en_attente_prochain_atelier ?? 0}
                accent={theme.palette.info.main}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DashboardTile
                label="Abandons"
                value={parcours.abandons ?? 0}
                hint={`Taux abandon : ${(parcours.taux_abandon_vers_entrees ?? 0).toFixed(1)} %`}
                accent={theme.palette.error.main}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DashboardTile
                label="En attente bilan"
                value={parcours.pipeline_en_attente_bilan ?? 0}
                accent={theme.palette.secondary.dark}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DashboardTile
                label="Bilans enregistrés"
                value={parcours.nb_bilans ?? 0}
                hint={`Écart bilans : ${(parcours.ecart_bilans ?? 0).toLocaleString("fr-FR")}`}
                accent={theme.palette.success.dark}
              />
            </Grid>
          </Grid>
        </Box>
      </Stack>
    </Card>
  );
}
