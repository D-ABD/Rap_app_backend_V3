import { Box, Typography, Button } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

const ForbiddenPage = () => {
  return (
    <Box
      sx={{
        minHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        p: 3,
      }}
    >
      <Typography variant="h2" color="error" gutterBottom>
        403
      </Typography>
      <Typography variant="h5" gutterBottom>
        Accès interdit
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Vous n’avez pas les droits nécessaires pour accéder à cette page.
      </Typography>

      <Button variant="contained" color="primary" component={RouterLink} to="/">
        Retour à l’accueil
      </Button>
    </Box>
  );
};

export default ForbiddenPage;
