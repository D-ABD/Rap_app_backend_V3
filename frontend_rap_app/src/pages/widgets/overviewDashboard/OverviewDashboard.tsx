// src/pages/widgets/overviewDashboard/OverviewDashboard.tsx
import * as React from "react";
import { Grid, Box } from "@mui/material";
import FormationOverviewWidget from "./FormationOverviewWidget";
import FormationOverviewWidget2 from "./FormationOverviewWidget2";
import FormationPlacesWidget from "./FormationPlacesWidget";
import CandidatOverviewWidget from "./CandidatOverviewWidget";
import CandidatContratOverviewWidget from "./CandidatContratOverviewWidget";
import ProspectionOverviewWidget from "./ProspectionOverviewWidget";
import AppairageOverviewWidget from "./AppairageOverviewWidget";
import AteliersTREOverviewWidget from "./AteliersTREOverviewWidget";

export default function OverviewDashboard() {
  return (
    <Box sx={{ p: { xs: 1, md: 2 }, width: "100%" }}>
      <Grid container spacing={2} alignItems="stretch">
        {/* 🟦 Formations */}
        <Grid item xs={12} md={4}>
          <FormationOverviewWidget title="Overview Formations" />
        </Grid>

        <Grid item xs={12} md={4}>
          <FormationOverviewWidget2 title="Overview Formations2" />
        </Grid>

        <Grid item xs={12} md={4}>
          <FormationPlacesWidget title="Overview Formations places" />
        </Grid>

        {/* 🟩 Candidats */}
        <Grid item xs={12} md={4}>
          <CandidatOverviewWidget title="Overview Candidats" />
        </Grid>

        <Grid item xs={12} md={4}>
          <CandidatContratOverviewWidget title="Overview Candidats Contrats" />
        </Grid>

        {/* 🟧 Prospection & appairages */}
        <Grid item xs={12} md={4}>
          <ProspectionOverviewWidget title="Overview Prospections" />
        </Grid>

        <Grid item xs={12} md={4}>
          <AppairageOverviewWidget />
        </Grid>

        <Grid item xs={12} md={4}>
          <AteliersTREOverviewWidget />
        </Grid>
      </Grid>
    </Box>
  );
}
