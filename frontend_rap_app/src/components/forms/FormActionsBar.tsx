import { Stack, type StackProps } from "@mui/material";
import type { ReactNode } from "react";

export type FormActionsBarProps = {
  children: ReactNode;
} & StackProps;

/**
 * Rangée d’actions de formulaire (Annuler / Enregistrer) — responsive par défaut.
 */
export default function FormActionsBar({ children, spacing = 2, justifyContent = "flex-end", ...rest }: FormActionsBarProps) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={spacing} justifyContent={justifyContent} {...rest}>
      {children}
    </Stack>
  );
}
