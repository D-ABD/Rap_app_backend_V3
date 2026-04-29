// ======================================================
// src/pages/DashboardPage.tsx
// 🎨 Version Premium Optimisée — Lisibilité, structure et UX
// ======================================================

import { Link as RouterLink } from "react-router-dom";
import {
  Typography,
  Button,
  Grid,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
  useMediaQuery,
  Divider,
  Stack,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import PageTemplate from "../components/PageTemplate";
import DashboardGrid from "../components/dashboard/DashboardGrid";
import type { AppTheme } from "../theme";

// ---------- Widgets ----------
import FormationSaturationWidget from "./widgets/saturationdashboard/FormationSaturationWidget";
import ProspectionConversionKpi from "./widgets/saturationdashboard/ProspectionConversionKpi";
import AppairageConversionKpi from "./widgets/saturationdashboard/AppairageSaturationWidget";

import FormationOverviewWidget from "./widgets/overviewDashboard/FormationOverviewWidget";
import FormationFinanceursOverviewWidget from "./widgets/overviewDashboard/FormationFinanceursOverviewWidget";
import FormationPlacesWidget from "./widgets/overviewDashboard/FormationPlacesWidget";

import CandidatOverviewWidget from "./widgets/overviewDashboard/CandidatOverviewWidget";
import CandidatContratOverviewWidget from "./widgets/overviewDashboard/CandidatContratOverviewWidget";

import ProspectionOverviewWidget from "./widgets/overviewDashboard/ProspectionOverviewWidget";
import AppairageOverviewWidget from "./widgets/overviewDashboard/AppairageOverviewWidget";
import AteliersTREOverviewWidget from "./widgets/overviewDashboard/AteliersTREOverviewWidget";
import EvenementOverviewWidget from "./widgets/overviewDashboard/EvenementOverviewWidget";

import ProspectionGroupedWidget from "./widgets/groupeddashboard/ProspectionGroupedWidget";
import FormationGroupedWidget from "./widgets/groupeddashboard/FormationGroupedWidget";
import AppairageGroupedTableWidget from "./widgets/groupeddashboard/AppairageGroupedTableWidget";
import CandidatGroupedTableWidget from "./widgets/groupeddashboard/CandidatGroupedTableWidget";
import AteliersTREGroupedWidget from "./widgets/groupeddashboard/AteliersTREGroupedWidget";
import EvenementGroupedWidget from "./widgets/groupeddashboard/EvenementGroupedWidget";

import FormationStatsSummary from "./widgets/overviewDashboard/FormationStatsSummary";
import ProspectionCommentStatsDashboard from "./widgets/commentsDahboard/ProspectionCommentStatsDashboard";
import DeclicStatsSummary from "./declic/DeclicStatsSummary";
import PrepaStatsSummary from "./prepa/PrepaStatsSummary";
import PrepaStatsOperations from "./prepa/PrepaStatsOperations";
import PrepaStatsParcours from "./prepa/PrepaStatsParcours";
import DeclicGroupedWidget from "./widgets/groupeddashboard/DeclicGroupedWidget";
import PrepaGroupedWidget from "./widgets/groupeddashboard/PrepaGroupedWidget";

type PaletteColorKey =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "info"
  | "error";

export default function DashboardPage() {
  const { user } = useAuth();
  const theme = useTheme<AppTheme>();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const minCardHeight = isMobile ? 200 : 240;

const styledAccordion = useMemo(
  () =>
    (
      children: React.ReactNode,
      title: string,
      color: PaletteColorKey,
      expanded = false
    ) => {
      const mainColor = theme.palette[color].main;
      const darkColor = theme.palette[color].dark;
      const textColor = theme.palette.getContrastText(mainColor);

      return (
        <Accordion
          defaultExpanded={expanded}
          disableGutters
          sx={{
            mb: 2,
            borderRadius: 2,
            overflow: "hidden",
            border: `1px solid ${alpha(mainColor, 0.22)}`,
            boxShadow: theme.shadows[2],
            transition: "box-shadow 0.25s ease",
            "&:hover": {
              boxShadow: theme.shadows[4],
            },
            "&:before": { display: "none" },
          }}
        >
          <AccordionSummary
            expandIcon={
              <ExpandMoreIcon
                sx={{
                  color: textColor,
                }}
              />
            }
            sx={{
              minHeight: 54,
              color: textColor,
              background: `linear-gradient(135deg, ${mainColor}, ${darkColor})`,
              "& .MuiAccordionSummary-content": {
                alignItems: "center",
              },
              "&:hover": {
                background: `linear-gradient(135deg, ${darkColor}, ${mainColor})`,
              },
            }}
          >
            <Typography
              variant="subtitle1"
              fontWeight={800}
              sx={{
                color: "inherit",
                letterSpacing: 0.2,
              }}
            >
              {title}
            </Typography>
          </AccordionSummary>

          <AccordionDetails
            sx={{
              backgroundColor: theme.palette.background.paper,
              p: { xs: 2, md: 3 },
            }}
          >
            {children}
          </AccordionDetails>
        </Accordion>
      );
    },
  [theme]
);

  return (
    <PageTemplate
      title="Tableau de bord général"
      subtitle="Suivez vos formations, candidats, prospections, ateliers et vos dispositifs Prepa / Declic."
      backButton
      maxWidth="xl"
      headerExtra={
        <Stack spacing={0.5}>
          <Typography variant="h6">
            Bonjour, {user?.first_name || user?.email || "👋"}
          </Typography>
        </Stack>
      }
      actions={
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <Button variant="contained" component={RouterLink} to="/formations">
            Formations
          </Button>
          <Button variant="contained" component={RouterLink} to="/candidats">
            Candidats
          </Button>
          <Button variant="contained" component={RouterLink} to="/prospections">
            Prospections
          </Button>
          <Button variant="contained" component={RouterLink} to="/appairages">
            Appairages
          </Button>
          <Button variant="contained" component={RouterLink} to="/evenements">
            Événements
          </Button>
          <Button variant="contained" component={RouterLink} to="/cvtheque">
            CVtheque
          </Button>
          <Button variant="contained" component={RouterLink} to="/cerfa">
            CERFA
          </Button>
          <Button variant="contained" component={RouterLink} to="/prepa">
            Prepa
          </Button>
          <Button variant="contained" component={RouterLink} to="/declic">
            Declic
          </Button>
          <Button variant="contained" component={RouterLink} to="/parametres">
            Parametres
          </Button>
        </Stack>
      }
    >
      <Divider sx={{ mb: 4 }} />

      {styledAccordion(
        <Stack spacing={2.5} sx={{ width: "100%" }}>
          <Box sx={{ width: "100%" }}>
            <PrepaStatsSummary title="Prepa - Synthese" />
          </Box>

          <Box sx={{ width: "100%" }}>
            <PrepaStatsOperations title="Indicateurs operationnels Prepa" />
          </Box>

          <Box sx={{ width: "100%" }}>
            <PrepaStatsParcours title="Parcours Prepa" />
          </Box>
        </Stack>,
        "Prepa-Compétences",
        "secondary",
        true
      )}

      {styledAccordion(
        <DashboardGrid>
          <Grid item xs={12}>
            <DeclicStatsSummary title="Declic - Synthese" />
          </Grid>
        </DashboardGrid>,
        "Declic",
        "secondary",
        true
      )}

      {styledAccordion(
        <DashboardGrid>
          <Grid item xs={12}>
            <FormationStatsSummary title="Formations - Synthese" />
          </Grid>

          <Grid item xs={12} sm={6} md={4} sx={{ minHeight: minCardHeight }}>
            <FormationSaturationWidget title="Saturation Formations" />
          </Grid>

          <Grid item xs={12} sm={6} md={4} sx={{ minHeight: minCardHeight }}>
            <ProspectionConversionKpi title="Taux de transformation Prospections" />
          </Grid>

          <Grid item xs={12} sm={6} md={4} sx={{ minHeight: minCardHeight }}>
            <AppairageConversionKpi title="Taux de transformation Appairages" />
          </Grid>
        </DashboardGrid>,
        "Formations - Indicateurs clés",
        "primary",
        true
      )}

      {styledAccordion(
        <DashboardGrid>
          <Grid item xs={12} sm={6} md={4}>
            <FormationOverviewWidget title="Répartition formations" />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <FormationFinanceursOverviewWidget title="Types d’offres" />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <FormationPlacesWidget title="Places disponibles" />
          </Grid>
        </DashboardGrid>,
        "Stats Formations",
        "success"
      )}

      {styledAccordion(
        <DashboardGrid>
          <Grid item xs={12} sm={6}>
            <CandidatOverviewWidget title="Statuts candidats" />
          </Grid>

          <Grid item xs={12} sm={6}>
            <CandidatContratOverviewWidget title="Répartition contrats" />
          </Grid>
        </DashboardGrid>,
        "Stats Candidats",
        "warning"
      )}

      {styledAccordion(
        <DashboardGrid>
          <Grid item xs={12} sm={6} md={4}>
            <ProspectionOverviewWidget title="Vue d'ensemble Prospections" />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <AppairageOverviewWidget />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <AteliersTREOverviewWidget />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <EvenementOverviewWidget title="Vue d'ensemble Evenements" />
          </Grid>

          <Grid item xs={12}>
            <ProspectionCommentStatsDashboard title="Commentaires de prospection récents" />
          </Grid>
        </DashboardGrid>,
        "Suivi Prospection / Appairage / TRE / Evenements",
        "info"
      )}

      {styledAccordion(
        <Box display="flex" flexDirection="column" gap={2}>
          <FormationGroupedWidget />
          <CandidatGroupedTableWidget />
          <AppairageGroupedTableWidget />
          <ProspectionGroupedWidget />
          <EvenementGroupedWidget />
          <AteliersTREGroupedWidget />
          <PrepaGroupedWidget />
          <DeclicGroupedWidget />
        </Box>,
        "Analyse groupée",
        "secondary"
      )}
    </PageTemplate>
  );
}