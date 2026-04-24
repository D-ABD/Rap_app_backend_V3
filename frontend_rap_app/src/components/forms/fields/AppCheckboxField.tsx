import {
  Checkbox,
  FormControlLabel,
  Typography,
  useTheme,
  type CheckboxProps,
} from "@mui/material";
import type { ReactNode } from "react";
import type { AppTheme } from "../../../theme";

export type AppCheckboxFieldProps = {
  label: ReactNode;
  checked: boolean;
  onChange: CheckboxProps["onChange"];
  name?: string;
  id?: string;
  disabled?: boolean;
};

/**
 * Case à cocher avec libellé — cohérente avec le design system.
 */
export default function AppCheckboxField({
  checked,
  onChange,
  label,
  name,
  id,
  disabled,
}: AppCheckboxFieldProps) {
  const theme = useTheme<AppTheme>();
  const tokens = theme.custom.form.inlineBlock;

  return (
    <FormControlLabel
      control={
        <Checkbox
          id={id}
          name={name}
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          sx={{
            p: 0.5,
          }}
        />
      }
      label={
        typeof label === "string" ? (
          <Typography
            variant="body2"
            sx={{
              lineHeight: 1.4,
            }}
          >
            {label}
          </Typography>
        ) : (
          label
        )
      }
      sx={{
        minHeight: tokens.minHeight,
        alignItems: "center",
        m: 0,
      }}
    />
  );
}