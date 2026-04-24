// src/pages/NotFoundPage.tsx
import { Typography, Button, Stack } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import PageTemplate from "../components/PageTemplate";

export default function NotFoundPage() {
  return (
    <PageTemplate
      title="404"
      subtitle="Oups ! La page que vous cherchez n’existe pas."
      centered
      maxWidth="sm"
    >
      <Stack spacing={2} alignItems="center" textAlign="center">
        <Typography variant="body1" color="text.secondary">
          Vérifiez l’URL ou retournez à l’accueil.
        </Typography>

        <Button variant="contained" color="primary" component={RouterLink} to="/">
          Retour à l’accueil
        </Button>
      </Stack>
    </PageTemplate>
  );
}