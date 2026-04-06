import {
  FormControl,
  FormHelperText,
  InputLabel,
  Select,
  type FormControlProps,
  type SelectProps,
} from "@mui/material";
import type { ReactNode } from "react";

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
  return (
    <FormControl fullWidth={fullWidth} size={size} error={error} disabled={disabled} required={required}>
      <InputLabel id={labelId}>{label}</InputLabel>
      <Select labelId={labelId} label={label} {...selectProps}>
        {children}
      </Select>
      {helperText != null && helperText !== "" ? <FormHelperText>{helperText}</FormHelperText> : null}
    </FormControl>
  );
}
