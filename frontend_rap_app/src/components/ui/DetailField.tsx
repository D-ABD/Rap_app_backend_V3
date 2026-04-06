import { Grid, Typography } from "@mui/material";
import type { ReactNode } from "react";

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
export default function DetailField({ label, value, fullWidth, xs = 12, md = 6 }: DetailFieldProps) {
  return (
    <Grid item xs={xs} md={fullWidth ? 12 : md}>
      <Typography variant="body2" component="div">
        <strong>{label} :</strong> {value}
      </Typography>
    </Grid>
  );
}

/** Chaîne affichable pour scalaires vides (tableaux de détail simples). */
export function formatDetailScalar(value?: string | number | null): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}
