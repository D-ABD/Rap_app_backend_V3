// src/components/PageWrapper.tsx
import { Container } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { ReactNode } from "react";
import type { AppTheme } from "../theme";

type PageWrapperProps = {
  children: ReactNode;
  /** largeur max, par défaut "lg". Mettre false pour 100% */
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
  /** conserve le comportement natif MUI des gutters */
  disableGutters?: boolean;
  /** si true -> prend toute la largeur */
  fullWidth?: boolean;
  /** densité visuelle de la page */
  density?: "default" | "compact";
  sx?: SxProps<Theme>;
};

export default function PageWrapper({
  children,
  maxWidth = "lg",
  disableGutters = false,
  fullWidth = false,
  density = "default",
  sx,
}: PageWrapperProps) {
  const baseSx: SxProps<Theme> = (theme) => {
    const appTheme = theme as AppTheme;
    const wrapperTokens = appTheme.custom.page.wrapper;
    const isCompact = density === "compact";

    const overlayBackground =
      appTheme.palette.mode === "light"
        ? wrapperTokens.overlay.background.light
        : wrapperTokens.overlay.background.dark;

    return {
      position: "relative",
      py: isCompact ? wrapperTokens.paddingY.compact : wrapperTokens.paddingY.default,
      px: fullWidth ? wrapperTokens.paddingX.fullWidth : wrapperTokens.paddingX.default,

      "&::before": {
        content: '""',
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        borderRadius: wrapperTokens.overlay.borderRadius,
        background: fullWidth ? "transparent" : overlayBackground,
      },
    };
  };

  return (
    <Container
      maxWidth={fullWidth ? false : maxWidth}
      disableGutters={disableGutters}
      sx={
        sx === undefined
          ? baseSx
          : Array.isArray(sx)
            ? [baseSx, ...sx]
            : [baseSx, sx]
      }
    >
      {children}
    </Container>
  );
}