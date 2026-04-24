import type { TextFieldProps } from "@mui/material";
import AppTextField from "./AppTextField";

/**
 * Champ numérique — repose sur `AppTextField` avec `type="number"`.
 * Hérite automatiquement du rendu theme-driven (spacing, hauteur, helper, etc.).
 */
export default function AppNumberField(props: Omit<TextFieldProps, "type">) {
  return <AppTextField type="number" inputProps={{ inputMode: "numeric" }} {...props} />;
}