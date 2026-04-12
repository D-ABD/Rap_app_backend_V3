import { Box, Typography, useTheme } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";
import type { AppTheme } from "../../theme";

export type StatCardProps = {
  /** Libellé sous la valeur (ex. « Actives », « Archivées ») */
  label: string;
  /** Grande valeur affichée en premier (nombre, pourcentage, texte court) */
  value: ReactNode;
  helperText?: ReactNode;
  /** Couleur de la valeur (souvent `theme.palette.*.main`) */
  valueColor?: string;
  onClick?: () => void;
  /** Contour mis en évidence (ex. filtre archivées actif) */
  highlighted?: boolean;
  highlightColor?: string;
  sx?: SxProps<Theme>;
};

/**
 * Tuile KPI pour tableaux de bord : valeur dominante + libellé + aide optionnelle.
 * Aucune logique métier : tout est passé en props.
 */
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

  return (
    <Box
      onClick={onClick}
      sx={{
        p: 2.5,
        borderRadius: 2.5,
        textAlign: "center",
        bgcolor:
          theme.palette.mode === "light"
            ? theme.custom.kpi.cardBackground.rest.light
            : theme.custom.kpi.cardBackground.rest.dark,
        boxShadow:
          theme.palette.mode === "light"
            ? theme.custom.kpi.elevation.rest.light
            : theme.custom.kpi.elevation.rest.dark,
        transition: "all 0.2s ease",
        cursor: onClick ? "pointer" : "default",
        outline:
          highlighted && highlightColor
            ? `${theme.custom.kpi.highlight.outlineWidthPx}px ${theme.custom.kpi.highlight.outlineStyle} ${highlightColor}`
            : "none",
        "&:hover": {
          boxShadow:
            theme.palette.mode === "light"
              ? theme.custom.kpi.elevation.hover.light
              : theme.custom.kpi.elevation.hover.dark,
          transform: onClick ? "translateY(-2px)" : undefined,
        },
        ...sx,
      }}
    >
      <Typography
        variant="h5"
        sx={{
          color: valueColor ?? theme.palette.text.primary,
          fontWeight: 700,
          mb: 0.5,
          lineHeight: 1.2,
        }}
      >
        {value}
      </Typography>
      <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
        {label}
      </Typography>
      {helperText ? (
        <Typography
          variant="caption"
          sx={{ color: theme.palette.text.secondary, display: "block", mt: 0.75 }}
        >
          {helperText}
        </Typography>
      ) : null}
    </Box>
  );
}
