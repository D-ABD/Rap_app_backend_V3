import { Checkbox, FormControlLabel, type CheckboxProps } from "@mui/material";
import type { ReactNode } from "react";

export type AppCheckboxFieldProps = {
  label: ReactNode;
  checked: boolean;
  onChange: CheckboxProps["onChange"];
  name?: string;
  id?: string;
  disabled?: boolean;
};

/**
 * Case à cocher avec libellé, alignée sur les usages `FormControlLabel` + `Checkbox` MUI.
 */
export default function AppCheckboxField({ checked, onChange, label, name, id, disabled }: AppCheckboxFieldProps) {
  return (
    <FormControlLabel
      control={<Checkbox id={id} name={name} checked={checked} disabled={disabled} onChange={onChange} />}
      label={label}
    />
  );
}
