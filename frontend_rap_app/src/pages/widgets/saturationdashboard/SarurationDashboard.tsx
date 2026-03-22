// src/pages/widgets/saturationdashboard/SaturationDashboard.tsx
import * as React from "react";
import { Grid } from "@mui/material";
import FormationSaturationWidget from "./FormationSaturationWidget";
import ProspectionConversionKpi from "./ProspectionConversionKpi";
import AppairageConversionKpi from "./AppairageSaturationWidget";

export default function SaturationDashboard() {
  return (
    <Grid container spacing={2}>
      {/* 🎯 Formation */}
      <Grid item xs={12} sm={6} md={4}>
        <FormationSaturationWidget title="Saturation Formations" />
      </Grid>

      {/* 🎯 Prospection */}
      <Grid item xs={12} sm={6} md={4}>
        <ProspectionConversionKpi title="Taux de transformation Prospections" />
      </Grid>

      {/* 🎯 Appairage */}
      <Grid item xs={12} sm={6} md={4}>
        <AppairageConversionKpi title="Taux de transformation Appairages" />
      </Grid>
    </Grid>
  );
}
