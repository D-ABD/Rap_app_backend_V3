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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import PageWrapper from "../components/PageWrapper";

// ---------- Widgets ----------
import FormationSaturationWidget from "./widgets/saturationdashboard/FormationSaturationWidget";
import ProspectionConversionKpi from "./widgets/saturationdashboard/ProspectionConversionKpi";
import AppairageConversionKpi from "./widgets/saturationdashboard/AppairageSaturationWidget";

import FormationOverviewWidget from "./widgets/overviewDashboard/FormationOverviewWidget";
import FormationOverviewWidget2 from "./widgets/overviewDashboard/FormationOverviewWidget2";
import FormationPlacesWidget from "./widgets/overviewDashboard/FormationPlacesWidget";

import CandidatOverviewWidget from "./widgets/overviewDashboard/CandidatOverviewWidget";
import CandidatContratOverviewWidget from "./widgets/overviewDashboard/CandidatContratOverviewWidget";

import ProspectionOverviewWidget from "./widgets/overviewDashboard/ProspectionOverviewWidget";
import AppairageOverviewWidget from "./widgets/overviewDashboard/AppairageOverviewWidget";
import AteliersTREOverviewWidget from "./widgets/overviewDashboard/AteliersTREOverviewWidget";

import ProspectionGroupedWidget from "./widgets/groupeddashboard/ProspectionGroupedWidget";
import FormationGroupedWidget from "./widgets/groupeddashboard/FormationGroupedWidget";
import AppairageGroupedTableWidget from "./widgets/groupeddashboard/AppairageGroupedTableWidget";
import CandidatGroupedTableWidget from "./widgets/groupeddashboard/CandidatGroupedTableWidget";
import AteliersTREGroupedWidget from "./widgets/groupeddashboard/AteliersTREGroupedWidget";

import FormationStatsSummary from "./widgets/overviewDashboard/FormationStatsSummary";
import DeclicStatsSummary from "./declic/DeclicStatsSummary";
import PrepaStatsSummary from "./prepa/PrepaStatsSummary";
import PrepaStatsOperations from "./prepa/PrepaStatsOperations";
import DeclicGroupedWidget from "./widgets/groupeddashboard/DeclicGroupedWidget";
import PrepaGroupedWidget from "./widgets/groupeddashboard/PrepaGroupedWidget";

type PaletteColorKey = "primary" | "secondary" | "success" | "warning" | "info" | "error";

export default function DashboardPage() {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const minCardHeight = isMobile ? 200 : 240;

  /* --------------------------
  🎚️ Wrapper d'accordéons stylés
  ----------------------------*/
  const styledAccordion = useMemo(
    () =>
      (children: React.ReactNode, title: string, color: PaletteColorKey, expanded = false) => (
        <Accordion
          defaultExpanded={expanded}
          disableGutters
          sx={{
            mb: 2,
            borderRadius: 2,
            overflow: "hidden",
            boxShadow: theme.shadows[2],
            transition: "all 0.25s ease",
            "&:hover": {
              boxShadow: theme.shadows[4],
              transform: "translateY(-2px)",
            },
            "&:before": { display: "none" },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{
              backgroundColor: theme.palette[color].light,
              "&:hover": {
                backgroundColor: theme.palette[color].main,
                color: theme.palette.getContrastText(theme.palette[color].main),
              },
            }}
          >
            <Typography variant="subtitle1" fontWeight="bold">
              {title}
            </Typography>
          </AccordionSummary>

          <AccordionDetails
            sx={{
              backgroundColor: theme.palette.background.paper,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {children}
          </AccordionDetails>
        </Accordion>
      ),
    [theme]
  );

  return (
    <PageWrapper maxWidth="xl">
      <Box display="flex" flexDirection="column">
        {/* ================================================ */}
        {/* 🏁 HERO SECTION */}
        {/* ================================================ */}
        <Box mb={4}>
          <Typography variant="h4" fontWeight="bold">
            Tableau de bord général
          </Typography>

          <Typography variant="h6" mt={1}>
            Bonjour, {user?.first_name || user?.email || "👋"}
          </Typography>

          <Typography variant="body1" color="text.secondary" mt={0.5}>
            Suivez vos formations, candidats, prospections, ateliers, et vos dispositifs Prépa /
            Déclic.
          </Typography>

          <Stack direction="row" spacing={2} mt={3} flexWrap="wrap">
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

            <Button variant="contained" component={RouterLink} to="/cvtheque">
              Cvtheque
            </Button>

            
            <Button variant="contained" component={RouterLink} to="/prepa">
              Prépa
            </Button>
            <Button variant="contained" component={RouterLink} to="/declic">
              Déclic
            </Button>
            <Button  variant="contained"component={RouterLink} to="/parametres">
              Paramètres
            </Button>
          </Stack>
        </Box>

        <Divider sx={{ mb: 4 }} />

        {/* ===================================================== */}
        {/* 🎯 WIDGETS STRATÉGIQUES — VERSION CARRÉE (4 BLOCS) */}
        {/* ===================================================== */}

        <Grid container spacing={2} mb={10}>
          <Grid item xs={8} md={6} lg={4}>
            <DeclicStatsSummary title="Déclic — Synthèse" />
          </Grid>

          <Grid item xs={8} md={6} lg={4}>
            <PrepaStatsSummary title="Prépa — Synthèse" />
          </Grid>

          <Grid item xs={8} md={6} lg={4}>
            <PrepaStatsOperations title="Indicateurs opérationnels Prépa" />
          </Grid>
        </Grid>

        {/* ================================================ */}
        {/* 📦 ACCORDÉONS */}
        {/* ================================================ */}

        {/* INDICATEURS CLÉS */}
        {styledAccordion(
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormationStatsSummary title="Formations — Synthèse" />
            </Grid>

            <Grid item xs={12} sm={6} md={4} sx={{ minHeight: minCardHeight }}>
              <FormationSaturationWidget title="Saturation Formations" />
            </Grid>
            <Grid item xs={12} sm={6} md={4} sx={{ minHeight: minCardHeight }}>
              <ProspectionConversionKpi title="Tx transformation Prospections" />
            </Grid>
            <Grid item xs={12} sm={6} md={4} sx={{ minHeight: minCardHeight }}>
              <AppairageConversionKpi title="Tx transformation Appairages" />
            </Grid>
          </Grid>,
          "Indicateurs clés",
          "primary",
          true
        )}

        {/* STATS FORMATIONS */}
        {styledAccordion(
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <FormationOverviewWidget title="Répartition formations" />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormationOverviewWidget2 title="Types d’offres" />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormationPlacesWidget title="Places disponibles" />
            </Grid>
          </Grid>,
          "Stats Formations",
          "success"
        )}

        {/* STATS CANDIDATS */}
        {styledAccordion(
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <CandidatOverviewWidget title="Statuts candidats" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <CandidatContratOverviewWidget title="Répartition contrats" />
            </Grid>
          </Grid>,
          "Stats Candidats",
          "warning"
        )}

        {/* SUIVI PROSPECTION / APPAIRAGE / TRE */}
        {styledAccordion(
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <ProspectionOverviewWidget title="Overview Prospections" />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <AppairageOverviewWidget />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <AteliersTREOverviewWidget />
            </Grid>
          </Grid>,
          "Suivi Prospection / Appairage / TRE",
          "info"
        )}

        {/* ANALYSE GROUPEE */}
        {styledAccordion(
          <Box display="flex" flexDirection="column" gap={2}>
            <FormationGroupedWidget />
            <CandidatGroupedTableWidget />
            <AppairageGroupedTableWidget />
            <ProspectionGroupedWidget />
            <AteliersTREGroupedWidget />
            <PrepaGroupedWidget />
            <DeclicGroupedWidget />
          </Box>,
          "Analyse groupée",
          "secondary"
        )}
      </Box>
    </PageWrapper>
  );
}
