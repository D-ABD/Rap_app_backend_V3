import {
  FormControl,
  FormHelperText,
  InputLabel,
  Select,
  useTheme,
  type FormControlProps,
  type SelectProps,
} from "@mui/material";
import type { ReactNode } from "react";
import type { AppTheme } from "../../../theme";

export type AppSelectFieldProps = {
  label: string;
  labelId: string;
  helperText?: ReactNode;
  children: ReactNode;
} & Omit<SelectProps, "label" | "variant"> &
  Pick<FormControlProps, "disabled" | "error" | "fullWidth" | "required">;

/**
 * Liste déroulante avec libellé flottant et message d’aide optionnel.
 */
export default function AppSelectField({
  label,
  labelId,
  helperText,
  children,
  error,
  disabled,
  fullWidth = true,
  required,
  size = "small",
  ...selectProps
}: AppSelectFieldProps) {
  const theme = useTheme<AppTheme>();
  const tokens = theme.custom.form;

  return (
    <FormControl
      fullWidth={fullWidth}
      size={size}
      error={error}
      disabled={disabled}
      required={required}
    >
      <InputLabel id={labelId}>{label}</InputLabel>

      <Select
        labelId={labelId}
        label={label}
        sx={{
          "& .MuiSelect-select": {
            minHeight: tokens.inlineBlock.minHeight,
            display: "flex",
            alignItems: "center",
          },
        }}
        {...selectProps}
      >
        {children}
      </Select>

      {helperText != null && helperText !== "" ? (
        <FormHelperText
          sx={{
            minHeight: theme.spacing(tokens.helperArea.minHeight),
            mt: tokens.helperArea.paddingTop,
          }}
        >
          {helperText}
        </FormHelperText>
      ) : (
        <FormHelperText
          sx={{
            minHeight: theme.spacing(tokens.helperArea.minHeight),
            mt: tokens.helperArea.paddingTop,
            visibility: "hidden",
          }}
        >
          &nbsp;
        </FormHelperText>
      )}
    </FormControl>
  );
}