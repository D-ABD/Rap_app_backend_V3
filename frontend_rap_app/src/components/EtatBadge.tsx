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
  const { color, customSx } = mapVariantToStyle(variant);

  return (
    <Chip
      label={label}
      color={color}
      size="small"
      sx={{
        fontWeight: 600,
        fontSize: "0.75rem",
        ...customSx,
      }}
    />
  );
}

// 🎨 mapping custom
function mapVariantToStyle(variant: BadgeVariant): {
  color: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning";
  customSx?: object;
} {
  switch (variant) {
    case "success":
      return { color: "success" };
    case "warning":
      return { color: "warning" };
    case "danger":
      return { color: "error" };
    case "info":
      return { color: "info" };
    case "dark":
      return {
        color: "default",
        customSx: { bgcolor: "#343a40", color: "white" },
      };
    case "orange":
      return {
        color: "default",
        customSx: { bgcolor: "orange", color: "white" },
      };
    default:
      return { color: "default" };
  }
}
