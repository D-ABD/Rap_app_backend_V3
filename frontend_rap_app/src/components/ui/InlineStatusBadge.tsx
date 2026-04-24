import { Chip, useTheme, type ChipProps } from "@mui/material";
import type { AppTheme } from "../../theme";

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
  sx,
  ...rest
}: InlineStatusBadgeProps) {
  const theme = useTheme<AppTheme>();
  const badgeTokens = theme.custom.badge.etat;

  const borderColor =
    theme.palette.mode === "light"
      ? badgeTokens.border.light
      : badgeTokens.border.dark;

  return (
    <Chip
      label={label}
      size={size}
      variant={variant}
      sx={[
        {
          minHeight: badgeTokens.minHeight,
          borderRadius: badgeTokens.borderRadius,
          fontWeight: badgeTokens.fontWeight,
          px: badgeTokens.paddingX,
          borderColor,
          maxWidth: "100%",
          "& .MuiChip-label": {
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          },
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
      {...rest}
    />
  );
}