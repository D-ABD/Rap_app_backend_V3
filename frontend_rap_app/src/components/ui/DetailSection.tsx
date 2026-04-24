import { Box, Grid, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";
import type { AppTheme } from "../../theme";

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
  const theme = useTheme<AppTheme>();
  const isLight = theme.palette.mode === "light";

  const sectionTokens = theme.custom.dialog.section;
  const sectionBackground = isLight
    ? sectionTokens.background.light
    : sectionTokens.background.dark;
  const sectionBorder = isLight
    ? sectionTokens.border.light
    : sectionTokens.border.dark;

  const titleBackground = isLight
    ? theme.custom.overlay.modalSectionTitle.background.light
    : theme.custom.overlay.modalSectionTitle.background.dark;

  const titleBorder = isLight
    ? theme.custom.overlay.modalSectionTitle.borderBottom.light
    : theme.custom.overlay.modalSectionTitle.borderBottom.dark;

  return (
    <Box
      sx={[
        {
          mb: 2,
          borderRadius: sectionTokens.borderRadius,
          border: sectionBorder,
          background: sectionBackground,
          overflow: "hidden",
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      <Box
        sx={{
          px: sectionTokens.padding,
          py: 1,
          background: titleBackground,
          borderBottom: titleBorder,
        }}
      >
        <Typography
          variant="subtitle2"
          component="div"
          sx={{
            fontWeight: 700,
            lineHeight: 1.3,
          }}
        >
          {title}
        </Typography>

        {subtitle ? (
          <Typography
            variant="caption"
            color="text.secondary"
            component="div"
            sx={{ mt: 0.375 }}
          >
            {subtitle}
          </Typography>
        ) : null}
      </Box>

      <Box sx={{ p: sectionTokens.padding }}>
        {withGrid ? (
          <Grid container spacing={spacing}>
            {children}
          </Grid>
        ) : (
          children
        )}
      </Box>
    </Box>
  );
}