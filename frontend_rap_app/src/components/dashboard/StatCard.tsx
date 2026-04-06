import { Box, Typography, useTheme } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";

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
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const statBoxBg = isDark ? "rgba(255,255,255,0.04)" : "background.paper";
  const statShadow = isDark ? "0 2px 6px rgba(0,0,0,0.5)" : "0 2px 6px rgba(0,0,0,0.05)";

  return (
    <Box
      onClick={onClick}
      sx={{
        p: 2.5,
        borderRadius: 2.5,
        textAlign: "center",
        bgcolor: statBoxBg,
        boxShadow: statShadow,
        transition: "all 0.2s ease",
        cursor: onClick ? "pointer" : "default",
        outline:
          highlighted && highlightColor ? `2px solid ${highlightColor}` : "none",
        "&:hover": {
          boxShadow: isDark ? "0 4px 14px rgba(0,0,0,0.7)" : "0 4px 12px rgba(0,0,0,0.08)",
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
