// src/components/Footer.tsx
import { Box, Typography, useTheme } from "@mui/material";

export default function Footer() {
  const theme = useTheme();

  return (
    <Box
      component="footer"
      sx={{
        mt: "auto",
        py: 2,
        px: 3,
        textAlign: "center",
        backgroundColor:
          theme.palette.mode === "light" ? theme.palette.grey[100] : theme.palette.grey[900],
        color: theme.palette.text.secondary,
        borderTop: `1px solid ${
          theme.palette.mode === "light" ? theme.palette.grey[300] : theme.palette.grey[800]
        }`,
      }}
    >
      <Typography variant="body2">
        © {new Date().getFullYear()} RAP App — Tous droits réservés
      </Typography>
    </Box>
  );
}
