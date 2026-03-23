import { Link as RouterLink } from "react-router-dom";
import { Typography, Button, Box, Grid, Stack } from "@mui/material";
import { useAuth } from "../hooks/useAuth";
import PageWrapper from "../components/PageWrapper";
import BackNavButton from "../components/BackNavButton";
import DeclicStatsSummary from "./declic/DeclicStatsSummary";

const DashboardDeclicStaffPage = () => {
  const { user } = useAuth();

  return (
    <PageWrapper maxWidth="lg">
      <Box mb={2}>
        <BackNavButton />
      </Box>

      {/* ----------------------------------------------------- */}
      {/* 🧩 En-tête */}
      {/* ----------------------------------------------------- */}
      <Box mb={4}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Bonjour, {user?.first_name || user?.email || "équipe Déclic"} 👋
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Voici votre tableau de bord Déclic : suivez vos activités, vos objectifs et vos taux
          d’atteinte.
        </Typography>

        <Stack direction="row" spacing={2} mt={2}>
          <Button variant="contained" color="primary" component={RouterLink} to="/declic">
            Voir les séances Déclic
          </Button>
        </Stack>
      </Box>

      {/* ----------------------------------------------------- */}
      {/* 📊 Widgets principaux */}
      {/* ----------------------------------------------------- */}
      <Grid>
        <Grid item xs={12} md={6}>
          <DeclicStatsSummary title="Synthèse annuelle Déclic" />
        </Grid>

        <Box p={3} bgcolor="background.paper" borderRadius={2} boxShadow={1} height="100%"></Box>
      </Grid>
    </PageWrapper>
  );
};

export default DashboardDeclicStaffPage;
