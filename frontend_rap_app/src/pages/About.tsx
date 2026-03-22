import { Typography, Box, Button, Stack } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";

export default function About() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        p: 3,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <Typography variant="h4" gutterBottom>
        ℹ️ Page À propos
      </Typography>

      <Typography variant="body1" color="text.secondary" maxWidth="600px" mb={3}>
        Cette application a été développée pour faciliter la gestion des prospections, appairages,
        formations et suivi des candidats.
      </Typography>

      {/* 🔹 Boutons de navigation */}
      <Stack spacing={2} direction="row" flexWrap="wrap" justifyContent="center">
        <Button variant="outlined" onClick={() => navigate(-1)}>
          ⬅️ Retour
        </Button>
        <Button variant="contained" component={Link} to="/">
          🏠 Accueil
        </Button>
        <Button variant="contained" color="primary" component={Link} to="/dashboard">
          📊 Dashboard
        </Button>
        <Button variant="text" color="secondary" component={Link} to="/politique-confidentialite">
          🔒 Politique de confidentialité
        </Button>
      </Stack>
    </Box>
  );
}
