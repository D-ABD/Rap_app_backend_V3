import { Grid, type GridProps } from "@mui/material";

const defaultSpacing = 2;

/**
 * Grille de mise en page pour pages dashboard : `Grid container` avec espacement cohérent.
 */
export default function DashboardGrid({ spacing = defaultSpacing, ...props }: GridProps) {
  return <Grid container spacing={spacing} {...props} />;
}
