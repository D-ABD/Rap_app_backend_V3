import { Link as RouterLink } from "react-router-dom";
import { Typography, Button, Grid, Stack, Divider } from "@mui/material";
import { useAuth } from "../hooks/useAuth";
import PageTemplate from "../components/PageTemplate";

import PrepaStatsSummary from "./prepa/PrepaStatsSummary";
import PrepaStatsOperations from "./prepa/PrepaStatsOperations";
import PrepaStatsParcours from "./prepa/PrepaStatsParcours";

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

        </Stack>
      }
    >
      <Divider sx={{ mb: 4 }} />

      <Grid >
        <Grid >
          <PrepaStatsSummary title="Synthèse annuelle — Objectifs & réalisations" />
        </Grid>

        <Grid >
          <PrepaStatsOperations title="Indicateurs opérationnels — IC & Ateliers" />
        </Grid>

        <Grid >
          <PrepaStatsParcours title="Parcours individuels — Stagiaires Prépa" />
        </Grid>

      </Grid>
    </PageTemplate>
  );
}
