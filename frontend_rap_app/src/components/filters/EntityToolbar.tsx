import { Stack, type StackProps } from "@mui/material";

export type EntityToolbarProps = {
  children: React.ReactNode;
} & Omit<StackProps, "direction">;

/**
 * Barre d’actions pour les pages de liste (boutons, sélecteurs, outils) — responsive par défaut.
 */
export default function EntityToolbar({ children, spacing = 1, flexWrap = "wrap", useFlexGap, ...rest }: EntityToolbarProps) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={spacing} flexWrap={flexWrap} useFlexGap={useFlexGap ?? true} {...rest}>
      {children}
    </Stack>
  );
}
