// src/components/EtatBadge.tsx
import { Chip } from "@mui/material";

export type BadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "orange"
  | "dark"
  | "default";

interface Props {
  label: string;
  variant?: BadgeVariant;
}

export default function EtatBadge({ label, variant = "default" }: Props) {
  const color = mapVariantToColor(variant);

  return (
    <Chip
      label={label}
      color={color}
      size="small"
    />
  );
}

// 🔁 mapping FONCTIONNEL uniquement (pas visuel)
function mapVariantToColor(
  variant: BadgeVariant
): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" {
  switch (variant) {
    case "success":
      return "success";
    case "warning":
      return "warning";
    case "danger":
      return "error";
    case "info":
      return "info";

    // fallback vers couleurs existantes MUI
    case "orange":
      return "warning";

    case "dark":
      return "default";

    default:
      return "default";
  }
}