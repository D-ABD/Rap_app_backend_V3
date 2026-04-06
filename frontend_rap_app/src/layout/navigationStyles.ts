import type { SxProps, Theme } from "@mui/material";

export const getDrawerItemSx = (nested = false): SxProps<Theme> => ({
  borderRadius: 1.5,
  mx: nested ? 0.75 : 1,
  my: 0.25,
  pl: nested ? 4 : undefined,
  "&.Mui-selected": {
    backgroundColor: (theme) =>
      theme.palette.mode === "light" ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.24)",
    "& .MuiListItemIcon-root, & .MuiListItemText-primary": {
      fontWeight: 700,
      color: (theme) => theme.palette.primary.main,
    },
  },
  "&:hover": {
    backgroundColor: (theme) =>
      theme.palette.mode === "light" ? "rgba(15,23,42,0.05)" : "rgba(148,163,184,0.10)",
  },
});

export const getTopNavButtonSx = (isActive: boolean): SxProps<Theme> => ({
  textTransform: "none",
  fontWeight: isActive ? 700 : 500,
  borderBottom: isActive ? "2px solid currentColor" : "2px solid transparent",
  borderRadius: 0,
  "&:hover": {
    borderBottom: "2px solid currentColor",
    backgroundColor: "transparent",
  },
});
