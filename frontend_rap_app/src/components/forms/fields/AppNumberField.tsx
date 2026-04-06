import type { TextFieldProps } from "@mui/material";
import AppTextField from "./AppTextField";

/**
 * Champ numérique — repose sur `AppTextField` avec `type="number"`.
 */
export default function AppNumberField(props: Omit<TextFieldProps, "type">) {
  return <AppTextField type="number" {...props} />;
}
