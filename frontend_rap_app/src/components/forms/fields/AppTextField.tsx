import { TextField, useTheme, type TextFieldProps } from "@mui/material";
import type { AppTheme } from "../../../theme";

/**
 * Champ texte standard (MUI `outlined`, `small`, `fullWidth` par défaut).
 * 100% piloté par le thème (densité, spacing, cohérence visuelle).
 */
export default function AppTextField(props: TextFieldProps) {
  const theme = useTheme<AppTheme>();
  const tokens = theme.custom.form;

  return (
    <TextField
      variant="outlined"
      size="small"
      fullWidth
      FormHelperTextProps={{
        sx: {
          minHeight: theme.spacing(tokens.helperArea.minHeight),
          mt: tokens.helperArea.paddingTop,
        },
      }}
      sx={{
        "& .MuiInputBase-root": {
          minHeight: tokens.inlineBlock.minHeight,
        },
      }}
      {...props}
    />
  );
}