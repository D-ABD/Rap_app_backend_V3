import type { SxProps, Theme } from "@mui/material";
import { alpha } from "@mui/material/styles";

export const getDrawerItemSx = (nested = false): SxProps<Theme> => ({
  minHeight: nested ? 42 : 46,
  borderRadius: nested ? 2 : 2.75,
  mx: nested ? 0.75 : 1,
  my: 0.35,
  px: nested ? 1.25 : 1.5,
  pl: nested ? 4 : 1.5,
  transition: "all 180ms ease",
  "& .MuiListItemIcon-root": {
    minWidth: 38,
    color: (theme) => theme.palette.text.secondary,
    transition: "color 180ms ease, transform 180ms ease",
  },
  "& .MuiListItemText-primary": {
    fontSize: nested ? "0.92rem" : "0.96rem",
    fontWeight: nested ? 500 : 600,
    color: (theme) => theme.palette.text.secondary,
    transition: "color 180ms ease",
  },
  "&.Mui-selected": {
    backgroundColor: (theme) =>
      alpha(theme.palette.primary.main, theme.palette.mode === "light" ? 0.12 : 0.2),
    boxShadow: (theme) =>
      `inset 0 0 0 1px ${alpha(theme.palette.primary.main, theme.palette.mode === "light" ? 0.12 : 0.24)}`,
    "& .MuiListItemIcon-root, & .MuiListItemText-primary": {
      fontWeight: 700,
      color: (theme) => theme.palette.primary.main,
    },
    "& .MuiListItemIcon-root": {
      transform: "translateX(1px)",
    },
  },
  "&:hover": {
    backgroundColor: (theme) =>
      alpha(theme.palette.text.primary, theme.palette.mode === "light" ? 0.05 : 0.08),
    "& .MuiListItemIcon-root": {
      color: (theme) => theme.palette.text.primary,
    },
    "& .MuiListItemText-primary": {
      color: (theme) => theme.palette.text.primary,
    },
  },
});

export const getTopNavButtonSx = (isActive: boolean): SxProps<Theme> => ({
  textTransform: "none",
  minHeight: 38,
  px: 1.4,
  borderRadius: 999,
  fontSize: "0.94rem",
  letterSpacing: "-0.01em",
  fontWeight: isActive ? 700 : 600,
  color: "inherit",
  border: "1px solid",
  borderColor: (theme) =>
    isActive
      ? alpha(theme.palette.common.white, theme.palette.mode === "light" ? 0.22 : 0.18)
      : "transparent",
  backgroundColor: (theme) =>
    isActive
      ? alpha(theme.palette.common.white, theme.palette.mode === "light" ? 0.16 : 0.1)
      : "transparent",
  boxShadow: isActive ? "inset 0 -1px 0 rgba(255,255,255,0.08)" : "none",
  transition: "all 180ms ease",
  "&:hover": {
    borderColor: (theme) => alpha(theme.palette.common.white, theme.palette.mode === "light" ? 0.18 : 0.14),
    backgroundColor: (theme) => alpha(theme.palette.common.white, theme.palette.mode === "light" ? 0.12 : 0.08),
  },
});
