import type { TextFieldProps } from "@mui/material";
import AppTextField from "./AppTextField";

const defaultInputLabelProps = { shrink: true as const };

/**
 * Champ date (`type="date"`), libellé rétracté par défaut.
 * Repose sur AppTextField pour conserver le rendu theme-driven uniforme.
 */
export default function AppDateField(props: TextFieldProps) {
  const { InputLabelProps, type = "date", ...rest } = props;

  return (
    <AppTextField
      type={type}
      InputLabelProps={{ ...defaultInputLabelProps, ...InputLabelProps }}
      {...rest}
    />
  );
}