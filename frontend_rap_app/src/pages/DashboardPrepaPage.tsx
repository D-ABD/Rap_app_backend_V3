import { Link as RouterLink } from "react-router-dom";
import { Typography, Button, Box, Grid, Stack, Divider } from "@mui/material";
import { useAuth } from "../hooks/useAuth";
import PageWrapper from "../components/PageWrapper";

import PrepaStatsSummary from "./prepa/PrepaStatsSummary";
import PrepaStatsOperations from "./prepa/PrepaStatsOperations";

export default function DashboardPrepaStaffPage() {
  const { user } = useAuth();

  return (
    <PageWrapper maxWidth="xl">
      {/* ----------------------------------------------------- */}
      {/* 🧩 En-tête */}
      {/* ----------------------------------------------------- */}
      <Box mb={5}>
        <Typography variant="h4" fontWeight="bold">
          Tableau de bord Prépa
        </Typography>

        <Typography variant="h6" mt={1}>
          Bonjour {user?.first_name || user?.email || "👋"},
        </Typography>

        <Typography variant="body1" color="text.secondary" mt={0.5}>
          Suivez vos objectifs, vos activités et vos indicateurs clés.
        </Typography>

        {/* Actions rapides */}
        <Stack direction="row" spacing={2} mt={3} flexWrap="wrap">
          <Button variant="contained" color="primary" component={RouterLink} to="/prepa">
            Voir les séances Prépa
          </Button>

          <Button variant="outlined" color="secondary" component={RouterLink} to="/prepa/objectif">
            Gérer les objectifs
          </Button>
        </Stack>
      </Box>

      <Divider sx={{ mb: 4 }} />

      {/* ----------------------------------------------------- */}
      {/* 📊 Widgets principaux */}
      {/* ----------------------------------------------------- */}
      <Grid container spacing={3}>
        {/* Bloc 1 : Synthèse stratégique */}
        <Grid item xs={12} lg={6}>
          <PrepaStatsSummary title="Synthèse annuelle — Objectifs & réalisations" />
        </Grid>

        {/* Bloc 2 : Indicateurs opérationnels */}
        <Grid item xs={12} lg={6}>
          <PrepaStatsOperations title="Indicateurs opérationnels — IC & Ateliers" />
        </Grid>

        {/* Bloc 3 : Zone réservée (graphique, tendances, etc.) */}
        <Grid item xs={12} lg={6}>
          <Box
            p={3}
            bgcolor="background.paper"
            borderRadius={3}
            boxShadow={2}
            height="100%"
            display="flex"
            alignItems="center"
            justifyContent="center"
            sx={{
              minHeight: 220,
              textAlign: "center",
            }}
          >
            <Typography color="text.secondary">
              (Prochain widget — Graphiques, tendances, rétention…)
            </Typography>
          </Box>
        </Grid>

        {/* Bloc 4 : Suggestion pour futures extensions */}
        <Grid item xs={12} lg={6}>
          <Box
            p={3}
            bgcolor="background.paper"
            borderRadius={3}
            boxShadow={2}
            height="100%"
            display="flex"
            alignItems="center"
            justifyContent="center"
            sx={{
              minHeight: 220,
              textAlign: "center",
            }}
          >
            <Typography color="text.secondary">
              (Espace disponible : tableau détaillé, export rapide, heatmap…)
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </PageWrapper>
  );
}
