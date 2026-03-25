// src/pages/widgets/groupeddashboard/GroupedDashboard.tsx
import * as React from "react";
import { Box } from "@mui/material";
import FormationGroupedWidget from "./FormationGroupedWidget";
import ProspectionGroupedWidget from "./ProspectionGroupedWidget";
import AppairageGroupedTableWidget from "./AppairageGroupedTableWidget";
import CandidatGroupedTableWidget from "./CandidatGroupedTableWidget";
import AteliersTREGroupedWidget from "./AteliersTREGroupedWidget";
import EvenementGroupedWidget from "./EvenementGroupedWidget";
import PrepaGroupedWidget from "../../prepa/PrepaGroupedWidget";
import DeclicGroupedWidget from "../../declic/DeclicGroupedWidget";

export default function GroupedDashboard() {
  return (
    <Box
      display="flex"
      flexDirection="column"
      gap={2}
      width="100%"
      overflow="hidden"
    >
      {/* Formations */}
      <FormationGroupedWidget />

      {/* Prospections */}
      <ProspectionGroupedWidget />

      {/* Evenements */}
      <EvenementGroupedWidget />

      {/* Appairages */}
      <AppairageGroupedTableWidget />

      {/* Candidats */}
      <CandidatGroupedTableWidget />

      {/* Ateliers TRE */}
      <AteliersTREGroupedWidget />

      {/* Prepa */}
      <PrepaGroupedWidget />

      {/* Declic */}
      <DeclicGroupedWidget />
    </Box>
  );
}
