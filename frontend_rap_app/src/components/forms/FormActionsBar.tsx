import { Stack, useTheme, type StackProps } from "@mui/material";
import type { ReactNode } from "react";
import type { AppTheme } from "../../theme";

export type FormActionsBarProps = {
  children: ReactNode;
} & StackProps;

/**
 * Rangée d’actions de formulaire (Annuler / Enregistrer) — responsive par défaut.
 */
export default function FormActionsBar({
  children,
  spacing,
  justifyContent = "flex-end",
  ...rest
}: FormActionsBarProps) {
  const theme = useTheme<AppTheme>();
  const tokens = theme.custom.page.template.header.actions;

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={spacing ?? tokens.gap.default}
      justifyContent={justifyContent}
      sx={{
        mt: 1,
        "& > *": {
          minWidth: { xs: "100%", sm: tokens.minWidth.default },
        },
      }}
      {...rest}
    >
      {children}
    </Stack>
  );
}