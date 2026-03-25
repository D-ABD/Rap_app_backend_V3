// src/pages/widgets/overviewDashboard/OverviewDashboard.tsx
import * as React from "react";
import { Grid, Box } from "@mui/material";
import FormationOverviewWidget from "./FormationOverviewWidget";
import FormationFinanceursOverviewWidget from "./FormationFinanceursOverviewWidget";
import FormationPlacesWidget from "./FormationPlacesWidget";
import CandidatOverviewWidget from "./CandidatOverviewWidget";
import CandidatContratOverviewWidget from "./CandidatContratOverviewWidget";
import ProspectionOverviewWidget from "./ProspectionOverviewWidget";
import AppairageOverviewWidget from "./AppairageOverviewWidget";
import AteliersTREOverviewWidget from "./AteliersTREOverviewWidget";
import EvenementOverviewWidget from "./EvenementOverviewWidget";

export default function OverviewDashboard() {
  return (
    <Box sx={{ p: { xs: 1, md: 2 }, width: "100%" }}>
      <Grid container spacing={2} alignItems="stretch">
        {/* Formations */}
        <Grid item xs={12} md={4}>
          <FormationOverviewWidget title="Vue d'ensemble Formations" />
        </Grid>

        <Grid item xs={12} md={4}>
          <FormationFinanceursOverviewWidget title="Types d'offres" />
        </Grid>

        <Grid item xs={12} md={4}>
          <FormationPlacesWidget title="Places disponibles" />
        </Grid>

        {/* Candidats */}
        <Grid item xs={12} md={4}>
          <CandidatOverviewWidget title="Statuts candidats" />
        </Grid>

        <Grid item xs={12} md={4}>
          <CandidatContratOverviewWidget title="Repartition contrats" />
        </Grid>

        {/* Prospections, appairages, ateliers, evenements */}
        <Grid item xs={12} md={4}>
          <ProspectionOverviewWidget title="Vue d'ensemble Prospections" />
        </Grid>

        <Grid item xs={12} md={4}>
          <AppairageOverviewWidget />
        </Grid>

        <Grid item xs={12} md={4}>
          <AteliersTREOverviewWidget />
        </Grid>

        <Grid item xs={12} md={4}>
          <EvenementOverviewWidget title="Vue d'ensemble Evenements" />
        </Grid>
      </Grid>
    </Box>
  );
}
