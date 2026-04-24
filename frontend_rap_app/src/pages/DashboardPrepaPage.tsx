import { Link as RouterLink } from "react-router-dom";
import { Typography, Button, Grid, Stack, Divider } from "@mui/material";
import { useAuth } from "../hooks/useAuth";
import PageTemplate from "../components/PageTemplate";
import ChartCard from "../components/dashboard/ChartCard";

import PrepaStatsSummary from "./prepa/PrepaStatsSummary";
import PrepaStatsOperations from "./prepa/PrepaStatsOperations";

export default function DashboardPrepaStaffPage() {
  const { user } = useAuth();

  return (
    <PageTemplate
      title="Tableau de bord Prépa"
      subtitle="Suivez vos objectifs, vos activités et vos indicateurs clés."
      backButton
      maxWidth="xl"
      headerExtra={
        <Typography variant="h6">
          Bonjour {user?.first_name || user?.email || "👋"},
        </Typography>
      }
      actions={
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <Button
            variant="contained"
            color="primary"
            component={RouterLink}
            to="/prepa"
          >
            Voir les séances Prépa
          </Button>

          <Button
            variant="outlined"
            color="secondary"
            component={RouterLink}
            to="/prepa/objectif"
          >
            Gérer les objectifs
          </Button>
        </Stack>
      }
    >
      <Divider sx={{ mb: 4 }} />

      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          <PrepaStatsSummary title="Synthèse annuelle — Objectifs & réalisations" />
        </Grid>

        <Grid item xs={12} lg={6}>
          <PrepaStatsOperations title="Indicateurs opérationnels — IC & Ateliers" />
        </Grid>

        <Grid item xs={12} lg={6}>
          <ChartCard title="À venir">
            <Typography color="text.secondary" textAlign="center">
              (Prochain widget — Graphiques, tendances, rétention…)
            </Typography>
          </ChartCard>
        </Grid>

        <Grid item xs={12} lg={6}>
          <ChartCard title="Extensions futures">
            <Typography color="text.secondary" textAlign="center">
              (Espace disponible : tableau détaillé, export rapide, heatmap…)
            </Typography>
          </ChartCard>
        </Grid>
      </Grid>
    </PageTemplate>
  );
}