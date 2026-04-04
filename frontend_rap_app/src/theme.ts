// src/theme.ts
import { alpha, createTheme, responsiveFontSizes } from "@mui/material/styles";

// 🔹 Étendre MUI pour ajouter `tertiary`, `neutral` et `gradients`
declare module "@mui/material/styles" {
  interface Palette {
    tertiary: Palette["primary"];
    neutral: Palette["primary"];
    gradients: {
      primary: string;
      secondary: string;
      tertiary: string;
    };
  }

  interface PaletteOptions {
    tertiary?: PaletteOptions["primary"];
    neutral?: PaletteOptions["primary"];
    gradients?: {
      primary?: string;
      secondary?: string;
      tertiary?: string;
    };
  }
}

declare module "@mui/material/Button" {
  interface ButtonPropsColorOverrides {
    tertiary: true;
    neutral: true;
  }
}

declare module "@mui/material/Chip" {
  interface ChipPropsColorOverrides {
    tertiary: true;
    neutral: true;
  }
}

export const getTheme = (mode: "light" | "dark") => {
  const isLight = mode === "light";

  let theme = createTheme({
    palette: {
      mode,

      primary: {
        main: "#6366F1",
        light: "#8B8EF7",
        dark: "#4F46E5",
        contrastText: "#FFFFFF",
      },

      secondary: {
        main: "#06B6D4",
        light: "#67E8F9",
        dark: "#0891B2",
        contrastText: "#FFFFFF",
      },

      tertiary: {
        main: "#7C8AA0",
        light: "#D7DEE7",
        dark: "#475569",
        contrastText: "#FFFFFF",
      },

      neutral: {
        main: "#94A3B8",
        light: "#E2E8F0",
        dark: "#475569",
        contrastText: "#111827",
      },

      gradients: {
        primary: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
        secondary: "linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)",
        tertiary: "linear-gradient(135deg, #7C8AA0 0%, #475569 100%)",
      },

      ...(isLight
        ? {
            background: {
              default: "#F5F7FB",
              paper: "#FFFFFF",
            },
            text: {
              primary: "#0F172A",
              secondary: "#475569",
            },
          }
        : {
            background: {
              default: "#0B1220",
              paper: "#111827",
            },
            text: {
              primary: "#F8FAFC",
              secondary: "#94A3B8",
            },
          }),

      success: {
        main: "#22C55E",
        light: "#86EFAC",
        dark: "#15803D",
      },

      warning: {
        main: "#F59E0B",
        light: "#FCD34D",
        dark: "#B45309",
      },

      error: {
        main: "#EF4444",
        light: "#FCA5A5",
        dark: "#B91C1C",
      },

      info: {
        main: "#3B82F6",
        light: "#93C5FD",
        dark: "#1D4ED8",
      },

      divider: isLight
        ? "rgba(15, 23, 42, 0.08)"
        : "rgba(148, 163, 184, 0.14)",
    },

    typography: {
      fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",

      h1: {
        fontWeight: 800,
        fontSize: "3rem",
        lineHeight: 1.08,
        letterSpacing: "-0.04em",
      },
      h2: {
        fontWeight: 750,
        fontSize: "2.35rem",
        lineHeight: 1.12,
        letterSpacing: "-0.03em",
      },
      h3: {
        fontWeight: 700,
        fontSize: "1.95rem",
        lineHeight: 1.18,
        letterSpacing: "-0.02em",
      },
      h4: {
        fontWeight: 700,
        fontSize: "1.55rem",
        lineHeight: 1.24,
      },
      h5: {
        fontWeight: 650,
        fontSize: "1.25rem",
        lineHeight: 1.3,
      },
      h6: {
        fontWeight: 650,
        fontSize: "1.05rem",
        lineHeight: 1.35,
      },

      subtitle1: {
        fontSize: "1rem",
        fontWeight: 500,
        lineHeight: 1.5,
        color: isLight ? "#64748B" : "#94A3B8",
      },
      subtitle2: {
        fontSize: "0.9rem",
        fontWeight: 500,
        lineHeight: 1.45,
        color: isLight ? "#94A3B8" : "#CBD5E1",
      },

      body1: {
        fontSize: "1rem",
        lineHeight: 1.7,
        color: isLight ? "#1E293B" : "#E2E8F0",
      },
      body2: {
        fontSize: "0.92rem",
        lineHeight: 1.65,
        color: isLight ? "#64748B" : "#94A3B8",
      },

      button: {
        textTransform: "none",
        fontWeight: 650,
        letterSpacing: "0.01em",
      },

      caption: {
        fontSize: "0.78rem",
        lineHeight: 1.4,
        color: isLight ? "#64748B" : "#94A3B8",
      },
    },

    shape: {
      borderRadius: 18,
    },

    shadows: isLight
      ? [
          "none",
          "0px 1px 2px rgba(15,23,42,0.04), 0px 1px 3px rgba(15,23,42,0.06)",
          "0px 2px 4px rgba(15,23,42,0.05), 0px 2px 8px rgba(15,23,42,0.05)",
          "0px 4px 10px rgba(15,23,42,0.06)",
          "0px 6px 14px rgba(15,23,42,0.07)",
          "0px 8px 18px rgba(15,23,42,0.08)",
          "0px 10px 22px rgba(15,23,42,0.09)",
          "0px 12px 26px rgba(15,23,42,0.10)",
          "0px 14px 30px rgba(15,23,42,0.11)",
          "0px 16px 34px rgba(15,23,42,0.12)",
          "0px 18px 38px rgba(15,23,42,0.13)",
          "0px 20px 42px rgba(15,23,42,0.14)",
          "0px 22px 46px rgba(15,23,42,0.15)",
          "0px 24px 50px rgba(15,23,42,0.16)",
          "0px 26px 54px rgba(15,23,42,0.17)",
          "0px 28px 58px rgba(15,23,42,0.18)",
          "0px 30px 62px rgba(15,23,42,0.19)",
          "0px 32px 66px rgba(15,23,42,0.20)",
          "0px 34px 70px rgba(15,23,42,0.21)",
          "0px 36px 74px rgba(15,23,42,0.22)",
          "0px 38px 78px rgba(15,23,42,0.23)",
          "0px 40px 82px rgba(15,23,42,0.24)",
          "0px 42px 86px rgba(15,23,42,0.25)",
          "0px 44px 90px rgba(15,23,42,0.26)",
          "0px 46px 94px rgba(15,23,42,0.27)",
        ]
      : [
          "none",
          "0px 1px 2px rgba(0,0,0,0.28), 0px 1px 3px rgba(0,0,0,0.32)",
          "0px 2px 6px rgba(0,0,0,0.30)",
          "0px 4px 10px rgba(0,0,0,0.34)",
          "0px 6px 14px rgba(0,0,0,0.36)",
          "0px 8px 18px rgba(0,0,0,0.38)",
          "0px 10px 22px rgba(0,0,0,0.40)",
          "0px 12px 26px rgba(0,0,0,0.42)",
          "0px 14px 30px rgba(0,0,0,0.44)",
          "0px 16px 34px rgba(0,0,0,0.46)",
          "0px 18px 38px rgba(0,0,0,0.48)",
          "0px 20px 42px rgba(0,0,0,0.50)",
          "0px 22px 46px rgba(0,0,0,0.52)",
          "0px 24px 50px rgba(0,0,0,0.54)",
          "0px 26px 54px rgba(0,0,0,0.56)",
          "0px 28px 58px rgba(0,0,0,0.58)",
          "0px 30px 62px rgba(0,0,0,0.60)",
          "0px 32px 66px rgba(0,0,0,0.62)",
          "0px 34px 70px rgba(0,0,0,0.64)",
          "0px 36px 74px rgba(0,0,0,0.66)",
          "0px 38px 78px rgba(0,0,0,0.68)",
          "0px 40px 82px rgba(0,0,0,0.70)",
          "0px 42px 86px rgba(0,0,0,0.72)",
          "0px 44px 90px rgba(0,0,0,0.74)",
          "0px 46px 94px rgba(0,0,0,0.76)",
        ],

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundImage: isLight
              ? "radial-gradient(circle at top left, rgba(99,102,241,0.06), transparent 30%), radial-gradient(circle at top right, rgba(6,182,212,0.05), transparent 28%)"
              : "radial-gradient(circle at top left, rgba(99,102,241,0.12), transparent 28%), radial-gradient(circle at top right, rgba(6,182,212,0.10), transparent 24%)",
            backgroundAttachment: "fixed",
          },
          "*": {
            boxSizing: "border-box",
          },
          "::selection": {
            backgroundColor: isLight
              ? "rgba(99,102,241,0.18)"
              : "rgba(99,102,241,0.28)",
          },
        },
      },

      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            minHeight: 42,
            borderRadius: 14,
            padding: "10px 18px",
            fontWeight: 650,
            transition:
              "transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease, border-color 0.18s ease",
          },
          contained: {
            boxShadow: isLight
              ? "0 8px 20px rgba(99,102,241,0.18)"
              : "0 10px 24px rgba(0,0,0,0.35)",
            "&:hover": {
              transform: "translateY(-1px)",
              boxShadow: isLight
                ? "0 12px 28px rgba(99,102,241,0.24)"
                : "0 14px 30px rgba(0,0,0,0.42)",
            },
          },
          outlined: {
            borderColor: isLight
              ? "rgba(99,102,241,0.24)"
              : "rgba(148,163,184,0.25)",
            backgroundColor: isLight
              ? "rgba(255,255,255,0.55)"
              : "rgba(17,24,39,0.45)",
            "&:hover": {
              borderColor: isLight
                ? "rgba(99,102,241,0.42)"
                : "rgba(148,163,184,0.40)",
              backgroundColor: isLight
                ? "rgba(99,102,241,0.04)"
                : "rgba(148,163,184,0.08)",
            },
          },
          text: {
            "&:hover": {
              backgroundColor: isLight
                ? "rgba(99,102,241,0.06)"
                : "rgba(99,102,241,0.12)",
            },
          },
        },
      },

      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
          rounded: {
            borderRadius: 18,
          },
        },
      },

      MuiCard: {
        styleOverrides: {
          root: {
            position: "relative",
            overflow: "hidden",
            borderRadius: 22,
            border: `1px solid ${
              isLight
                ? "rgba(255,255,255,0.75)"
                : "rgba(148,163,184,0.10)"
            }`,
            background: isLight
              ? "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.90) 100%)"
              : "linear-gradient(180deg, rgba(17,24,39,0.92) 0%, rgba(15,23,42,0.92) 100%)",
            backdropFilter: "blur(10px)",
            boxShadow: isLight
              ? "0 10px 30px rgba(15,23,42,0.06)"
              : "0 12px 32px rgba(0,0,0,0.38)",
            transition:
              "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: isLight
                ? "0 18px 40px rgba(15,23,42,0.10)"
                : "0 18px 40px rgba(0,0,0,0.48)",
            },
          },
        },
      },

      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: 20,
            "&:last-child": {
              paddingBottom: 20,
            },
          },
        },
      },

      MuiAppBar: {
        styleOverrides: {
          root: {
            background: isLight
              ? "linear-gradient(90deg, rgba(99,102,241,0.96) 0%, rgba(6,182,212,0.96) 100%)"
              : "linear-gradient(90deg, rgba(15,23,42,0.96) 0%, rgba(30,41,59,0.96) 55%, rgba(8,145,178,0.82) 100%)",
            color: "#FFFFFF",
            boxShadow: isLight
              ? "0 6px 24px rgba(15,23,42,0.10)"
              : "0 8px 28px rgba(0,0,0,0.36)",
            backdropFilter: "blur(12px)",
          },
        },
      },

      MuiToolbar: {
        styleOverrides: {
          root: {
            minHeight: 68,
          },
        },
      },

      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: "none",
            borderTopRightRadius: 24,
            borderBottomRightRadius: 24,
            background: isLight
              ? "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.98) 100%)"
              : "linear-gradient(180deg, rgba(17,24,39,0.98) 0%, rgba(15,23,42,0.98) 100%)",
            backdropFilter: "blur(12px)",
            boxShadow: isLight
              ? "0 12px 30px rgba(15,23,42,0.08)"
              : "0 14px 32px rgba(0,0,0,0.42)",
          },
        },
      },

      MuiListItemButton: {
        styleOverrides: {
          root: {
            minHeight: 44,
            borderRadius: 12,
            margin: "4px 10px",
            paddingInline: 12,
            transition:
              "background-color 0.18s ease, color 0.18s ease, transform 0.18s ease",
            "&:hover": {
              backgroundColor: isLight
                ? "rgba(99,102,241,0.06)"
                : "rgba(148,163,184,0.08)",
            },
            "&.Mui-selected": {
              background: isLight
                ? "linear-gradient(90deg, rgba(99,102,241,0.12), rgba(6,182,212,0.10))"
                : "linear-gradient(90deg, rgba(99,102,241,0.18), rgba(6,182,212,0.10))",
              color: isLight ? "#111827" : "#F8FAFC",
              "&:hover": {
                background: isLight
                  ? "linear-gradient(90deg, rgba(99,102,241,0.16), rgba(6,182,212,0.12))"
                  : "linear-gradient(90deg, rgba(99,102,241,0.22), rgba(6,182,212,0.14))",
              },
            },
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            fontWeight: 600,
            height: 30,
            paddingInline: 6,
          },
          filled: {
            boxShadow: isLight
              ? "inset 0 0 0 1px rgba(255,255,255,0.30)"
              : "inset 0 0 0 1px rgba(255,255,255,0.06)",
          },
        },
      },

      MuiTableContainer: {
        styleOverrides: {
          root: {
            borderRadius: 18,
            border: `1px solid ${
              isLight
                ? "rgba(15,23,42,0.06)"
                : "rgba(148,163,184,0.12)"
            }`,
          },
        },
      },

      MuiTableHead: {
        styleOverrides: {
          root: {
            "& .MuiTableCell-root": {
              backgroundColor: isLight
                ? "rgba(99,102,241,0.04)"
                : "rgba(148,163,184,0.06)",
              color: isLight ? "#334155" : "#CBD5E1",
              fontWeight: 700,
              borderBottom: `1px solid ${
                isLight
                  ? "rgba(15,23,42,0.08)"
                  : "rgba(148,163,184,0.14)"
              }`,
            },
          },
        },
      },

      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: "background-color 0.18s ease",
            "&:nth-of-type(even)": {
              backgroundColor: isLight
                ? "rgba(248,250,252,0.70)"
                : "rgba(255,255,255,0.02)",
            },
            "&:hover": {
              backgroundColor: isLight
                ? "rgba(99,102,241,0.05)"
                : "rgba(99,102,241,0.08)",
            },
          },
        },
      },

      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${
              isLight
                ? "rgba(15,23,42,0.06)"
                : "rgba(148,163,184,0.10)"
            }`,
          },
        },
      },

      MuiTextField: {
        defaultProps: {
          variant: "outlined",
        },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            backgroundColor: isLight
              ? "rgba(255,255,255,0.82)"
              : "rgba(15,23,42,0.78)",
            transition:
              "box-shadow 0.18s ease, border-color 0.18s ease, background-color 0.18s ease",
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: isLight
                ? "rgba(99,102,241,0.34)"
                : "rgba(148,163,184,0.30)",
            },
            "&.Mui-focused": {
              boxShadow: isLight
                ? "0 0 0 4px rgba(99,102,241,0.10)"
                : "0 0 0 4px rgba(99,102,241,0.16)",
            },
          },
          notchedOutline: {
            borderColor: isLight
              ? "rgba(15,23,42,0.10)"
              : "rgba(148,163,184,0.18)",
          },
          input: {
            paddingTop: 12,
            paddingBottom: 12,
          },
        },
      },

      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: isLight ? "#64748B" : "#94A3B8",
          },
        },
      },

      MuiSelect: {
        styleOverrides: {
          select: {
            borderRadius: 14,
          },
        },
      },

      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 22,
            background: isLight
              ? "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)"
              : "linear-gradient(180deg, #111827 0%, #0F172A 100%)",
            boxShadow: isLight
              ? "0 20px 50px rgba(15,23,42,0.15)"
              : "0 24px 60px rgba(0,0,0,0.50)",
          },
        },
      },

      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
            marginTop: 6,
            border: `1px solid ${
              isLight
                ? "rgba(15,23,42,0.06)"
                : "rgba(148,163,184,0.12)"
            }`,
            boxShadow: isLight
              ? "0 16px 40px rgba(15,23,42,0.12)"
              : "0 20px 50px rgba(0,0,0,0.45)",
          },
        },
      },

      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 10,
            fontSize: "0.78rem",
            padding: "8px 10px",
            backgroundColor: isLight ? "#0F172A" : "#E2E8F0",
            color: isLight ? "#FFFFFF" : "#0F172A",
            boxShadow: isLight
              ? "0 8px 20px rgba(15,23,42,0.14)"
              : "0 8px 20px rgba(0,0,0,0.32)",
          },
        },
      },

      MuiDivider: {
        styleOverrides: {
          root: {
            opacity: 1,
            borderColor: isLight
              ? "rgba(15,23,42,0.08)"
              : "rgba(148,163,184,0.14)",
          },
        },
      },

      MuiAvatar: {
        styleOverrides: {
          root: {
            boxShadow: isLight
              ? "0 6px 18px rgba(15,23,42,0.10)"
              : "0 8px 20px rgba(0,0,0,0.34)",
          },
        },
      },

      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            "&:hover": {
              backgroundColor: isLight
                ? "rgba(99,102,241,0.08)"
                : "rgba(99,102,241,0.14)",
            },
          },
        },
      },

      MuiTabs: {
        styleOverrides: {
          indicator: {
            height: 3,
            borderRadius: 999,
          },
        },
      },

      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 600,
            minHeight: 44,
          },
        },
      },

      MuiFab: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: isLight
              ? "0 12px 28px rgba(99,102,241,0.20)"
              : "0 14px 30px rgba(0,0,0,0.42)",
          },
        },
      },

      MuiLink: {
        styleOverrides: {
          root: {
            textDecorationColor: alpha("#6366F1", 0.35),
            textUnderlineOffset: "3px",
          },
        },
      },
    },
  });

  theme = responsiveFontSizes(theme);
  return theme;
};

export default getTheme("light");