// src/components/dashboard/OverviewDashboard.tsx
import * as React from "react";
import { Box } from "@mui/material";
import FormationGroupedWidget from "./FormationGroupedWidget";
import ProspectionGroupedWidget from "./ProspectionGroupedWidget";
import AppairageGroupedTableWidget from "./AppairageGroupedTableWidget";
import CandidatGroupedTableWidget from "./CandidatGroupedTableWidget";
import AteliersTREGroupedWidget from "./AteliersTREGroupedWidget";
import EvenementGroupedWidget from "./EvenementGroupedWidget";

export default function GroupedDashboard() {
  return (
    <Box
      display="flex"
      flexDirection="column" // 👈 un widget par ligne
      gap={2}
      width="100%"
      overflow="hidden" // évite le scroll horizontal global
    >
      {/* 🎯 Formation */}
      <FormationGroupedWidget />

      {/* 🎯 Prospection */}
      <ProspectionGroupedWidget />

      {/* 🎯 Événements */}
      <EvenementGroupedWidget />

      {/* 🎯 Appairage */}
      <AppairageGroupedTableWidget />

      {/* 🎯 Candidats */}
      <CandidatGroupedTableWidget />

      {/* 🎯 Ateliers TRE */}
      <AteliersTREGroupedWidget />
    </Box>
  );
}
