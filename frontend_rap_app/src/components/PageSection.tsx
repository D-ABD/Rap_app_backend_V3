// src/components/PageSection.tsx
import { Paper, useTheme } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";
import { ReactNode } from "react";
import type { AppTheme } from "../theme";

type PageSectionProps = {
  children: ReactNode;
  sx?: SxProps<Theme>;
  density?: "default" | "compact";
};

export default function PageSection({
  children,
  sx,
  density = "default",
}: PageSectionProps) {
  const theme = useTheme<AppTheme>();
  const sectionTokens = theme.custom.page.section[density];
  const overlayAlpha =
    theme.palette.mode === "light"
      ? sectionTokens.overlayAlpha.light
      : sectionTokens.overlayAlpha.dark;

  return (
    <Paper
      elevation={0}
      sx={{
        position: "relative",
        overflow: sectionTokens.overflow,
        p: sectionTokens.padding,
        mb: sectionTokens.marginBottom,
        borderRadius: sectionTokens.borderRadius,
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
        boxShadow: sectionTokens.boxShadowRest,
        transition: theme.transitions.create(["box-shadow", "border-color"], {
          duration: theme.transitions.duration.shorter,
        }),

        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          borderRadius: "inherit",
          background: `linear-gradient(
            180deg,
            ${alpha(theme.palette.primary.main, overlayAlpha)} 0%,
            transparent ${sectionTokens.overlayStop}
          )`,
        },

        "&:hover, &:focus-within": {
          boxShadow: sectionTokens.boxShadowHover,
        },

        ...sx,
      }}
    >
      {children}
    </Paper>
  );
}