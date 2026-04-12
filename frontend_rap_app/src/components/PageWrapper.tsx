// src/components/PageWrapper.tsx
import { Container, type SxProps, type Theme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { ReactNode } from "react";
import type { AppTheme } from "../theme";

type PageWrapperProps = {
  children: ReactNode;
  /** largeur max, par défaut "lg". Mettre false pour 100% */
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
  /** padding vertical, par défaut { xs: 2, sm: 3 } */
  disableGutters?: boolean;
  /** si true -> prend toute la largeur */
  fullWidth?: boolean;
  sx?: SxProps<Theme>;
};

export default function PageWrapper({
  children,
  maxWidth = "lg",
  disableGutters = false,
  fullWidth = false,
  sx,
}: PageWrapperProps) {
  return (
    <Container
      maxWidth={fullWidth ? false : maxWidth}
      disableGutters={disableGutters}
      sx={{
        position: "relative",
        py: { xs: 2.5, sm: 3.5, lg: 4 },
        px: fullWidth ? { xs: 0, sm: 0 } : undefined,
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          borderRadius: { xs: 0, sm: 4 },
          background: (theme: AppTheme) =>
            fullWidth
              ? "transparent"
              : `linear-gradient(180deg, ${
                  theme.palette.mode === "light"
                    ? alpha(theme.custom.surface.muted.background.light, 0.9)
                    : alpha(theme.custom.surface.muted.background.dark, 0.9)
                } 0%, transparent 30%)`,
        },
        ...sx,
      }}
    >
      {children}
    </Container>
  );
}
