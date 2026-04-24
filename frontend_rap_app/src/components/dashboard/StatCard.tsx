// src/components/dashboard/StatCard.tsx
import { Box, Typography, useTheme, Stack } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";
import type { AppTheme } from "../../theme";

export type StatCardProps = {
  label: string;
  value: ReactNode;
  helperText?: ReactNode;
  valueColor?: string;
  onClick?: () => void;
  highlighted?: boolean;
  highlightColor?: string;
  sx?: SxProps<Theme>;
};

export default function StatCard({
  label,
  value,
  helperText,
  valueColor,
  onClick,
  highlighted,
  highlightColor,
  sx,
}: StatCardProps) {
  const theme = useTheme<AppTheme>();
  const tokens = theme.custom.dashboard.statCard;

  return (
    <Box
      onClick={onClick}
      sx={{
        p: tokens.padding,
        borderRadius: tokens.borderRadius,
        minHeight: tokens.minHeight,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        boxShadow: tokens.boxShadowRest,
        transition: theme.transitions.create(["box-shadow"], {
          duration: theme.transitions.duration.shorter,
        }),
        cursor: onClick ? "pointer" : "default",

        outline:
          highlighted && highlightColor
            ? `${theme.custom.kpi.highlight.outlineWidthPx}px ${theme.custom.kpi.highlight.outlineStyle} ${highlightColor}`
            : "none",

        "&:hover": {
          boxShadow: tokens.boxShadowHover,
        },

        ...sx,
      }}
    >
      <Stack spacing={tokens.gap}>
        <Typography
          variant="h5"
          color={valueColor ?? "text.primary"}
        >
          {value}
        </Typography>

        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>

        {helperText && (
          <Typography variant="caption" color="text.secondary">
            {helperText}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}