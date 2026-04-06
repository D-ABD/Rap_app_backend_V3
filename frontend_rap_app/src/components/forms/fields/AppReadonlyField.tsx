import type { TextFieldProps } from "@mui/material";
import AppTextField from "./AppTextField";

/**
 * Champ en lecture seule (copie / focus possible, pas d’édition).
 */
export default function AppReadonlyField(props: TextFieldProps) {
  const { InputProps, ...rest } = props;
  return (
    <AppTextField
      InputProps={{ readOnly: true, ...InputProps }}
      {...rest}
    />
  );
}
