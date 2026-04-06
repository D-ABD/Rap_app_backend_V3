// src/pages/DashboardCandidatPage.tsx
import { Link as RouterLink } from "react-router-dom";
import { Typography, Button, Box, Grid } from "@mui/material";
import { useAuth } from "../hooks/useAuth";
import PageWrapper from "../components/PageWrapper";
import BackNavButton from "../components/BackNavButton";
import DashboardGrid from "../components/dashboard/DashboardGrid";

// Widgets
import ProspectionOverviewWidget from "./widgets/overviewDashboard/ProspectionOverviewWidget";
import ProspectionCommentStatsDashboard from "./widgets/commentsDahboard/ProspectionCommentStatsDashboard";
import ProspectionConversionKpi from "./widgets/saturationdashboard/ProspectionConversionKpi";

const DashboardCandidatPage = () => {
  const { user } = useAuth();

  return (
    <PageWrapper maxWidth="md">
      <Box mb={2}>
        <BackNavButton />
      </Box>

      <Box mb={3}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Bonjour, {user?.first_name || user?.email || "candidat"} 👋
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Voici votre tableau de bord personnel.
        </Typography>

        <Button variant="contained" component={RouterLink} to="/mon-profil" sx={{ mt: 2 }}>
          Voir / Modifier mon profil
        </Button>
      </Box>

      {/* Widgets pour un candidat */}
      <DashboardGrid>
        <Grid item xs={12} sm={6}>
          <ProspectionOverviewWidget title="Mes Prospections" />
        </Grid>

        <Grid item xs={12} sm={6}>
          <ProspectionConversionKpi title="Tx transformation Prospections" />
        </Grid>

        <Grid item xs={12}>
          <ProspectionCommentStatsDashboard />
        </Grid>
      </DashboardGrid>
    </PageWrapper>
  );
};

export default DashboardCandidatPage;
