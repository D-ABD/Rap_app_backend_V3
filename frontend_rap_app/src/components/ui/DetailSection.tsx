import { Box, Divider, Grid, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";

export type DetailSectionProps = {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  /** Enveloppe les enfants dans un `Grid container` (défaut : true). Mettre false pour un bloc libre (ex. JSON, tableau). */
  withGrid?: boolean;
  spacing?: number;
  sx?: SxProps<Theme>;
};

/**
 * Bloc de fiche détail avec titre et séparateur. Les enfants sont souvent des `DetailField`.
 */
export default function DetailSection({
  title,
  subtitle,
  children,
  withGrid = true,
  spacing = 1,
  sx,
}: DetailSectionProps) {
  return (
    <Box sx={{ mb: 3, ...sx }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "primary.main", mb: subtitle ? 0.25 : 0.5 }}>
        {title}
      </Typography>
      {subtitle ? (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
          {subtitle}
        </Typography>
      ) : null}
      <Divider sx={{ mb: 1 }} />
      {withGrid ? (
        <Grid container spacing={spacing}>
          {children}
        </Grid>
      ) : (
        children
      )}
    </Box>
  );
}
