import { Grid, Stack, Typography, useTheme } from "@mui/material";
import type { ReactNode } from "react";
import type { AppTheme } from "../../theme";

export type DetailFieldProps = {
  label: string;
  /** Contenu affiché à droite du libellé (texte, nombre, lien, chip, etc.) */
  value: ReactNode;
  /** Si vrai, occupe toute la largeur sur md+ */
  fullWidth?: boolean;
  xs?: number;
  md?: number;
};

/**
 * Affiche une paire libellé / valeur dans une grille (usage typique : modales et fiches détail).
 * Purement présentatif : aucune logique métier.
 */
export default function DetailField({
  label,
  value,
  fullWidth,
  xs = 12,
  md = 6,
}: DetailFieldProps) {
  const theme = useTheme<AppTheme>();
  const gap = theme.custom.form.helperArea.paddingTop;

  return (
    <Grid item xs={xs} md={fullWidth ? 12 : md}>
      <Stack spacing={gap} sx={{ minWidth: 0 }}>
        <Typography
          variant="caption"
          component="div"
          color="text.secondary"
          sx={{
            fontWeight: 700,
            lineHeight: 1.3,
            textTransform: "uppercase",
            letterSpacing: theme.custom.typographyComplements.eyebrowLetterSpacing,
          }}
        >
          {label}
        </Typography>

        <Typography
          variant="body2"
          component="div"
          sx={{
            color: "text.primary",
            fontWeight: 500,
            lineHeight: 1.5,
            wordBreak: "break-word",
            overflowWrap: "anywhere",
            minWidth: 0,
          }}
        >
          {value}
        </Typography>
      </Stack>
    </Grid>
  );
}

/** Chaîne affichable pour scalaires vides (tableaux de détail simples). */
export function formatDetailScalar(value?: string | number | null): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}