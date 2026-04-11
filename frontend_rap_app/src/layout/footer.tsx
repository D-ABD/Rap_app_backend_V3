// src/components/Footer.tsx
import { Box, Typography, useTheme } from "@mui/material";

export default function Footer() {
  const theme = useTheme();
  const isLight = theme.palette.mode === "light";

  return (
    <Box
      component="footer"
      sx={{
        mt: "auto",
        position: "relative",
        overflow: "hidden",
        px: { xs: 2, sm: 3, md: 4 },
        py: 2.25,
        textAlign: "center",
        color: theme.palette.text.secondary,
        borderTop: `1px solid ${
          isLight
            ? "rgba(15,23,42,0.08)"
            : "rgba(148,163,184,0.14)"
        }`,
        background: isLight
          ? "linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(248,250,252,0.96) 100%)"
          : "linear-gradient(180deg, rgba(15,23,42,0.92) 0%, rgba(7,17,31,0.96) 100%)",
        backdropFilter: "blur(10px)",
        boxShadow: isLight
          ? "0 -8px 24px rgba(15,23,42,0.04)"
          : "0 -10px 28px rgba(0,0,0,0.22)",

        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: isLight
            ? "linear-gradient(90deg, rgba(79,70,229,0.04) 0%, rgba(6,182,212,0.03) 50%, rgba(124,58,237,0.04) 100%)"
            : "linear-gradient(90deg, rgba(79,70,229,0.08) 0%, rgba(6,182,212,0.05) 50%, rgba(124,58,237,0.08) 100%)",
          opacity: 0.9,
        },
      }}
    >
      <Typography
        variant="body2"
        sx={{
          position: "relative",
          zIndex: 1,
          fontWeight: 500,
          letterSpacing: "0.01em",
        }}
      >
        © {new Date().getFullYear()} RAP App — Tous droits réservés
      </Typography>
    </Box>
  );
}