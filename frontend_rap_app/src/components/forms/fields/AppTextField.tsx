import { TextField, type TextFieldProps } from "@mui/material";

/**
 * Champ texte standard (MUI `outlined`, `small`, `fullWidth` par défaut).
 */
export default function AppTextField(props: TextFieldProps) {
  return <TextField variant="outlined" size="small" fullWidth {...props} />;
}
