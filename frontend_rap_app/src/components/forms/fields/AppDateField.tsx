import type { TextFieldProps } from "@mui/material";
import AppTextField from "./AppTextField";

const defaultInputLabelProps = { shrink: true as const };

/**
 * Champ date (`type="date"`), libellé rétracté par défaut.
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
