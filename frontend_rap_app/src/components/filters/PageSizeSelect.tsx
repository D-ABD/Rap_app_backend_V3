import { MenuItem, Select, type SelectProps } from "@mui/material";

export type PageSizeSelectProps = {
  value: number;
  onChange: (pageSize: number) => void;
  options?: number[];
  disabled?: boolean;
} & Omit<SelectProps<number>, "value" | "onChange" | "children">;

const DEFAULT_OPTIONS = [5, 10, 20];

/**
 * Sélecteur de taille de page pour les listes (pattern commun aux écrans pilotes Lot 6).
 */
export default function PageSizeSelect({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  disabled,
  size = "small",
  ...rest
}: PageSizeSelectProps) {
  return (
    <Select
      size={size}
      disabled={disabled}
      {...rest}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {options.map((s) => (
        <MenuItem key={s} value={s}>
          {s} / page
        </MenuItem>
      ))}
    </Select>
  );
}
