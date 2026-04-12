import type { SxProps } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { AppTheme } from "../theme";

export const getDrawerItemSx = (theme: AppTheme, nested = false): SxProps<AppTheme> => {
  const drawerItem = theme.custom.nav.drawerItem;
  const variant = nested ? "branch" : "root";

  return {
    minHeight: drawerItem.sizing.minHeightSx[variant],
    borderRadius: drawerItem.sizing.borderRadiusSx[variant],
    mx: nested ? drawerItem.spacing.marginXSx - 0.25 : drawerItem.spacing.marginXSx,
    my: drawerItem.spacing.marginYSx,
    px: drawerItem.spacing.paddingXSx[variant],
    pl: drawerItem.spacing.paddingLeftSx[variant],
    transition: `all ${drawerItem.transitionDurationMs}ms ${drawerItem.easing}`,
    "& .MuiListItemIcon-root": {
      minWidth: drawerItem.icon.minWidthPx,
      color: theme.palette.text.secondary,
      transition: `color ${drawerItem.transitionDurationMs}ms ${drawerItem.easing}, transform ${drawerItem.transitionDurationMs}ms ${drawerItem.easing}`,
    },
    "& .MuiListItemText-primary": {
      fontSize: drawerItem.label[variant].fontSizeRem,
      fontWeight: drawerItem.label[variant].fontWeight,
      color: theme.palette.text.secondary,
      transition: `color ${drawerItem.transitionDurationMs}ms ${drawerItem.easing}`,
    },
    "&.Mui-selected": {
      backgroundColor: alpha(
        theme.palette.primary.main,
        theme.palette.mode === "light"
          ? drawerItem.interaction.selected.background.light
          : drawerItem.interaction.selected.background.dark
      ),
      boxShadow: `inset 0 0 0 1px ${alpha(
        theme.palette.primary.main,
        theme.palette.mode === "light"
          ? drawerItem.interaction.selected.insetRing.light
          : drawerItem.interaction.selected.insetRing.dark
      )}`,
      "& .MuiListItemIcon-root, & .MuiListItemText-primary": {
        fontWeight: 700,
        color: theme.palette.primary.main,
      },
      "& .MuiListItemIcon-root": {
        transform: `translateX(${drawerItem.icon.translateXSelectedPx}px)`,
      },
    },
    "&:hover": {
      backgroundColor: alpha(
        theme.palette.text.primary,
        theme.palette.mode === "light"
          ? drawerItem.interaction.hover.backdropFromText.light
          : drawerItem.interaction.hover.backdropFromText.dark
      ),
      "& .MuiListItemIcon-root": {
        color: theme.palette.text.primary,
      },
      "& .MuiListItemText-primary": {
        color: theme.palette.text.primary,
      },
    },
  };
};

export const getTopNavButtonSx = (theme: AppTheme, isActive: boolean): SxProps<AppTheme> => {
  const topButton = theme.custom.nav.topButton;

  return {
    textTransform: "none",
    minHeight: topButton.shape.minHeightPx,
    px: topButton.shape.paddingXSx,
    borderRadius: topButton.shape.borderRadiusPill,
    fontSize: topButton.typography.fontSizeRem,
    letterSpacing: topButton.typography.letterSpacing,
    fontWeight: isActive
      ? topButton.typography.fontWeight.active
      : topButton.typography.fontWeight.idle,
    color: "inherit",
    border: `${topButton.border.widthPx}px ${topButton.border.style}`,
    borderColor: isActive
      ? alpha(
          theme.palette.common.white,
          theme.palette.mode === "light"
            ? topButton.state.active.borderWhiteAlpha.light
            : topButton.state.active.borderWhiteAlpha.dark
        )
      : topButton.state.idle.borderColor,
    backgroundColor: isActive
      ? alpha(
          theme.palette.common.white,
          theme.palette.mode === "light"
            ? topButton.state.active.backgroundWhiteAlpha.light
            : topButton.state.active.backgroundWhiteAlpha.dark
        )
      : topButton.state.idle.backgroundColor,
    boxShadow: isActive
      ? topButton.state.active.insetBottomShadow
      : topButton.state.idle.boxShadow,
    transition: `all ${topButton.transitionDurationMs}ms ${topButton.easing}`,
    "&:hover": {
      borderColor: alpha(
        theme.palette.common.white,
        theme.palette.mode === "light"
          ? topButton.state.hover.borderWhiteAlpha.light
          : topButton.state.hover.borderWhiteAlpha.dark
      ),
      backgroundColor: alpha(
        theme.palette.common.white,
        theme.palette.mode === "light"
          ? topButton.state.hover.backgroundWhiteAlpha.light
          : topButton.state.hover.backgroundWhiteAlpha.dark
      ),
    },
  };
};
