// src/components/Footer.tsx
import { Box, Typography, useTheme } from "@mui/material";
import type { AppTheme } from "../theme";

export default function Footer() {
  const theme = useTheme<AppTheme>();
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
        borderTop: `${theme.custom.footer.border.widthPx}px ${theme.custom.footer.border.style} ${
          isLight
            ? theme.custom.footer.border.color.light
            : theme.custom.footer.border.color.dark
        }`,
        background: isLight
          ? theme.custom.footer.background.gradient.light
          : theme.custom.footer.background.gradient.dark,
        backdropFilter: theme.custom.footer.backdrop.filter,
        boxShadow: isLight
          ? theme.custom.footer.elevation.boxShadow.light
          : theme.custom.footer.elevation.boxShadow.dark,

        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: isLight
            ? theme.custom.footer.accentOverlay.gradient.light
            : theme.custom.footer.accentOverlay.gradient.dark,
          opacity: theme.custom.footer.accentOverlay.opacity,
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
