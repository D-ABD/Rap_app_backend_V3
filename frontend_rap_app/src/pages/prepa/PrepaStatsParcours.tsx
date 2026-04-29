import * as React from "react";
import { Alert, Box, Card, FormControl, Grid, MenuItem, Select, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { AppTheme } from "src/theme";
import StatCardSkeleton from "../../components/ui/StatCardSkeleton";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import { useStagiairesPrepaMeta, useStagiairesPrepaSynthese } from "src/hooks/useStagiairesPrepa";

export default function PrepaStatsParcours({
  title = "Parcours individuels Prépa",
}: {
  title?: string;
}) {
  const theme = useTheme<AppTheme>();
  const isDark = theme.palette.mode === "dark";
  const { data: meta } = useStagiairesPrepaMeta();
  const annees = React.useMemo(
    () =>
      ((meta?.annees as number[] | undefined) ?? []).length
        ? ((meta?.annees as number[]) ?? [])
        : [new Date().getFullYear()],
    [meta]
  );
  const centres = React.useMemo(
    () => ((meta?.centres as Array<{ id: number; nom: string }>) ?? []),
    [meta]
  );

  const [filters, setFilters] = React.useState<{ annee?: number; centre?: number }>({
    annee: annees[0] ?? new Date().getFullYear(),
  });

  React.useEffect(() => {
    if (!filters.annee && annees[0]) {
      setFilters((prev) => ({ ...prev, annee: annees[0] }));
    }
  }, [annees, filters.annee]);

  const { data, isLoading, error } = useStagiairesPrepaSynthese(filters);

  if (isLoading) return <StatCardSkeleton count={4} />;
  if (error) {
    return (
      <Card sx={{ p: 3, borderRadius: 3 }}>
        <Alert severity="error">Erreur : {error.message}</Alert>
      </Card>
    );
  }
  if (!data) return null;

  const statBoxBg = isDark ? theme.custom.kpi.cardBackground.rest.dark : theme.custom.kpi.cardBackground.rest.light;
  const statShadow = isDark ? theme.custom.kpi.elevation.rest.dark : theme.custom.kpi.elevation.rest.light;

  const stats = [
    { label: "Total suivis", value: data.total_stagiaires ?? 0, color: theme.palette.text.primary },
    { label: "Entrées atelier 1", value: data.entrees_atelier_1, color: theme.palette.primary.main },
    { label: "Sorties atelier 6", value: data.sorties_atelier_6, color: theme.palette.success.main },
    { label: "Orientés AFPA", value: data.orientes_afpa, color: theme.palette.info.main },
    {
      label: "Transformation AFPA (%)",
      value: data.taux_transformation_vers_afpa,
      color: theme.palette.secondary.main,
    },
    {
      label: "Taux abandon (%)",
      value: data.taux_abandon_vers_entrees ?? 0,
      color: theme.palette.error.dark,
    },
    { label: "En attente d'entrée", value: data.en_attente_entree, color: theme.palette.warning.dark },
    { label: "À intégrer atelier 1", value: data.a_integrer_atelier_1, color: theme.palette.warning.main },
    {
      label: "En attente atelier suivant",
      value: data.en_attente_prochain_atelier,
      color: theme.palette.info.dark,
    },
    { label: "Abandons", value: data.abandons, color: theme.palette.error.main },
    {
      label: "Orientés autre centre AFPA (%)",
      value: data.taux_orientation_autre_centre_afpa ?? 0,
      color: theme.palette.info.dark,
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
        <Typography variant="h6" fontWeight={700}>
          <PeopleAltIcon
            fontSize="small"
            sx={{ mr: 1, verticalAlign: "middle", color: theme.palette.primary.main }}
          />
          {title}
        </Typography>

        <Box display="flex" gap={1.5} flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={filters.annee ?? ""}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  annee: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            >
              {annees.map((annee) => (
                <MenuItem key={annee} value={annee}>
                  {annee}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <Select
              value={filters.centre ?? ""}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  centre: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              displayEmpty
              sx={{
                bgcolor: isDark ? alpha(theme.palette.common.white, 0.06) : "background.paper",
                borderRadius: 1,
              }}
            >
              <MenuItem value="">Tous les centres</MenuItem>
              {centres.map((centre) => (
                <MenuItem key={centre.id} value={centre.id}>
                  {centre.nom}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

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
              <Typography variant="h5" sx={{ color: s.color, fontWeight: 700, mb: 0.5, lineHeight: 1.2 }}>
                {typeof s.value === "number" ? s.value.toLocaleString("fr-FR") : s.value}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
                {s.label}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Card>
  );
}
