// src/pages/NotFoundPage.tsx
import { Box, Typography, Button } from "@mui/material";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        textAlign: "center",
        p: 3,
      }}
    >
      <Typography variant="h2" color="primary" gutterBottom>
        404
      </Typography>
      <Typography variant="h5" gutterBottom>
        Oups ! La page que vous cherchez n’existe pas.
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        Vérifiez l’URL ou retournez à l’accueil.
      </Typography>
      <Button variant="contained" color="primary" component={Link} to="/">
        Retour à l’accueil
      </Button>
    </Box>
  );
}
