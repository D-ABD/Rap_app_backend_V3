// src/components/PageSection.tsx
import { Paper, useTheme } from "@mui/material";
import type { SxProps } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";
import { ReactNode } from "react";
import type { AppTheme } from "../theme";

export default function PageSection({
  children,
  sx,
}: {
  children: ReactNode;
  sx?: SxProps<AppTheme>;
}) {
  const theme = useTheme<AppTheme>();
  return (
    <Paper
      sx={{
        position: "relative",
        overflow: "hidden",
        p: { xs: 2, sm: 2.5, lg: 3 },
        mb: 2.25,
        borderRadius: { xs: 3, sm: 4 },
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
        boxShadow: theme.custom.surface.elevated.boxShadowRest,
        transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, theme.palette.mode === "light" ? 0.03 : 0.06)} 0%, transparent 26%)`,
        },
        "&:hover": {
          boxShadow: theme.custom.surface.elevated.boxShadowHover,
        },
        ...sx,
      }}
    >
      {children}
    </Paper>
  );
}
