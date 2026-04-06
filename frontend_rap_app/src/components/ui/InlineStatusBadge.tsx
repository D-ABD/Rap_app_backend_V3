import { Chip, type ChipProps } from "@mui/material";

export type InlineStatusBadgeProps = Omit<ChipProps, "label"> & {
  label: string;
};

/**
 * Pastille de statut inline (tableaux, listes) — base `Chip` MUI, taille cohérente.
 */
export default function InlineStatusBadge({
  label,
  size = "small",
  variant = "outlined",
  ...rest
}: InlineStatusBadgeProps) {
  return <Chip label={label} size={size} variant={variant} {...rest} />;
}
