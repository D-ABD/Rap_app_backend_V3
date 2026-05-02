import { Link as RouterLink } from "react-router-dom";
import { Typography, Button, Stack, Divider } from "@mui/material";
import { useAuth } from "../hooks/useAuth";
import PageTemplate from "../components/PageTemplate";
import PrepaDashboardSection from "./prepa/PrepaDashboardSection";

export default function DashboardPrepaStaffPage() {
  const { user } = useAuth();

  return (
    <PageTemplate
      title="Tableau de bord Prépa"
      subtitle="Suivez vos objectifs, vos activités et vos indicateurs clés."
      backButton
      maxWidth="xl"
      headerExtra={
        <Typography variant="h6">
          Bonjour {user?.first_name || user?.email || "👋"},
        </Typography>
      }
      actions={
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <Button
            variant="contained"
            color="primary"
            component={RouterLink}
            to="/prepa"
          >
            Voir les séances Prépa
          </Button>

        </Stack>
      }
    >
      <Divider sx={{ mb: 4 }} />
      <PrepaDashboardSection />
    </PageTemplate>
  );
}
