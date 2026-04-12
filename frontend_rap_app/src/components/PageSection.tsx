// src/components/PageSection.tsx
import { Paper } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { ReactNode } from "react";

export default function PageSection({ children }: { children: ReactNode }) {
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
        boxShadow: (theme) =>
          theme.palette.mode === "light"
            ? `0 18px 36px ${alpha(theme.palette.common.black, 0.05)}`
            : `0 20px 40px ${alpha(theme.palette.common.black, 0.2)}`,
        transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: (theme) =>
            `linear-gradient(180deg, ${alpha(theme.palette.primary.main, theme.palette.mode === "light" ? 0.03 : 0.06)} 0%, transparent 26%)`,
        },
      }}
    >
      {children}
    </Paper>
  );
}
