import { Typography, Button, Stack } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import PageTemplate from "../components/PageTemplate";

const ForbiddenPage = () => {
  return (
    <PageTemplate
      title="403"
      subtitle="Accès interdit"
      centered
      maxWidth="sm"
    >
      <Stack spacing={2} alignItems="center" textAlign="center">
        <Typography variant="body1" color="text.secondary">
          Vous n’avez pas les droits nécessaires pour accéder à cette page.
        </Typography>

        <Button
          variant="contained"
          color="primary"
          component={RouterLink}
          to="/"
        >
          Retour à l’accueil
        </Button>
      </Stack>
    </PageTemplate>
  );
};

export default ForbiddenPage;