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
      accent: string;
      hero: string;
    };
  }

  interface PaletteOptions {
    tertiary?: PaletteOptions["primary"];
    neutral?: PaletteOptions["primary"];
    gradients?: {
      primary?: string;
      secondary?: string;
      tertiary?: string;
      accent?: string;
      hero?: string;
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

  const primaryMain = "#4F46E5";
  const primaryLight = "#7C73FF";
  const primaryDark = "#312ECA";

  const secondaryMain = "#06B6D4";
  const secondaryLight = "#67E8F9";
  const secondaryDark = "#0E7490";

  const tertiaryMain = "#7C3AED";
  const tertiaryLight = "#C4B5FD";
  const tertiaryDark = "#5B21B6";

  const neutralMain = "#64748B";
  const neutralLight = "#E2E8F0";
  const neutralDark = "#334155";

  const softCardShadow = isLight
    ? "0 18px 38px rgba(15,23,42,0.08), 0 6px 18px rgba(79,70,229,0.08)"
    : "0 18px 42px rgba(0,0,0,0.40), 0 8px 20px rgba(79,70,229,0.12)";

  const softCardHoverShadow = isLight
    ? "0 28px 58px rgba(15,23,42,0.14), 0 10px 24px rgba(79,70,229,0.12)"
    : "0 30px 64px rgba(0,0,0,0.52), 0 10px 24px rgba(79,70,229,0.16)";

  let theme = createTheme({
    breakpoints: {
      values: {
        xs: 0,
        sm: 640,
        md: 960,
        lg: 1280,
        xl: 1536,
      },
    },

    palette: {
      mode,

      primary: {
        main: primaryMain,
        light: primaryLight,
        dark: primaryDark,
        contrastText: "#FFFFFF",
      },

      secondary: {
        main: secondaryMain,
        light: secondaryLight,
        dark: secondaryDark,
        contrastText: "#FFFFFF",
      },

      tertiary: {
        main: tertiaryMain,
        light: tertiaryLight,
        dark: tertiaryDark,
        contrastText: "#FFFFFF",
      },

      neutral: {
        main: neutralMain,
        light: neutralLight,
        dark: neutralDark,
        contrastText: isLight ? "#0F172A" : "#F8FAFC",
      },

      gradients: {
        primary: "linear-gradient(135deg, #4F46E5 0%, #312ECA 100%)",
        secondary: "linear-gradient(135deg, #06B6D4 0%, #0E7490 100%)",
        tertiary: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)",
        accent: "linear-gradient(135deg, #4F46E5 0%, #06B6D4 55%, #7C3AED 100%)",
        hero: "linear-gradient(135deg, #0F172A 0%, #1E1B4B 45%, #0E7490 100%)",
      },

      ...(isLight
        ? {
            background: {
              default: "#F3F6FB",
              paper: "#FFFFFF",
            },
            text: {
              primary: "#0F172A",
              secondary: "#475569",
            },
          }
        : {
            background: {
              default: "#07111F",
              paper: "#0F172A",
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
        ? "rgba(15,23,42,0.08)"
        : "rgba(148,163,184,0.14)",
    },

    typography: {
      fontFamily:
        "'Plus Jakarta Sans', 'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",

      h1: {
        fontWeight: 800,
        fontSize: "3.2rem",
        lineHeight: 1.04,
        letterSpacing: "-0.045em",
      },
      h2: {
        fontWeight: 800,
        fontSize: "2.5rem",
        lineHeight: 1.08,
        letterSpacing: "-0.035em",
      },
      h3: {
        fontWeight: 750,
        fontSize: "2rem",
        lineHeight: 1.14,
        letterSpacing: "-0.025em",
      },
      h4: {
        fontWeight: 700,
        fontSize: "1.6rem",
        lineHeight: 1.2,
      },
      h5: {
        fontWeight: 700,
        fontSize: "1.28rem",
        lineHeight: 1.28,
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
        color: isLight ? "#64748B" : "#A5B4C7",
      },
      subtitle2: {
        fontSize: "0.9rem",
        fontWeight: 600,
        lineHeight: 1.45,
        color: isLight ? "#6B7280" : "#CBD5E1",
      },

      body1: {
        fontSize: "1rem",
        lineHeight: 1.72,
        color: isLight ? "#1E293B" : "#E2E8F0",
      },
      body2: {
        fontSize: "0.92rem",
        lineHeight: 1.68,
        color: isLight ? "#64748B" : "#94A3B8",
      },

      button: {
        textTransform: "none",
        fontWeight: 700,
        letterSpacing: "0.01em",
      },

      caption: {
        fontSize: "0.78rem",
        lineHeight: 1.4,
        color: isLight ? "#64748B" : "#94A3B8",
      },
    },

    shape: {
      borderRadius: 22,
    },

    shadows: isLight
      ? [
          "none",
          "0px 1px 2px rgba(15,23,42,0.04), 0px 1px 3px rgba(15,23,42,0.06)",
          "0px 2px 6px rgba(15,23,42,0.05)",
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
          "0px 1px 3px rgba(0,0,0,0.30), 0px 1px 4px rgba(0,0,0,0.34)",
          "0px 2px 6px rgba(0,0,0,0.32)",
          "0px 4px 10px rgba(0,0,0,0.36)",
          "0px 6px 14px rgba(0,0,0,0.38)",
          "0px 8px 18px rgba(0,0,0,0.40)",
          "0px 10px 22px rgba(0,0,0,0.42)",
          "0px 12px 26px rgba(0,0,0,0.44)",
          "0px 14px 30px rgba(0,0,0,0.46)",
          "0px 16px 34px rgba(0,0,0,0.48)",
          "0px 18px 38px rgba(0,0,0,0.50)",
          "0px 20px 42px rgba(0,0,0,0.52)",
          "0px 22px 46px rgba(0,0,0,0.54)",
          "0px 24px 50px rgba(0,0,0,0.56)",
          "0px 26px 54px rgba(0,0,0,0.58)",
          "0px 28px 58px rgba(0,0,0,0.60)",
          "0px 30px 62px rgba(0,0,0,0.62)",
          "0px 32px 66px rgba(0,0,0,0.64)",
          "0px 34px 70px rgba(0,0,0,0.66)",
          "0px 36px 74px rgba(0,0,0,0.68)",
          "0px 38px 78px rgba(0,0,0,0.70)",
          "0px 40px 82px rgba(0,0,0,0.72)",
          "0px 42px 86px rgba(0,0,0,0.74)",
          "0px 44px 90px rgba(0,0,0,0.76)",
          "0px 46px 94px rgba(0,0,0,0.78)",
        ],

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
          },
          body: {
            backgroundColor: isLight ? "#F3F6FB" : "#07111F",
            color: isLight ? "#0F172A" : "#F8FAFC",
            backgroundImage: isLight
              ? `
                radial-gradient(circle at top left, rgba(79,70,229,0.10), transparent 28%),
                radial-gradient(circle at top right, rgba(6,182,212,0.08), transparent 22%),
                linear-gradient(180deg, rgba(255,255,255,0.65) 0%, rgba(243,246,251,1) 100%)
              `
              : `
                radial-gradient(circle at top left, rgba(79,70,229,0.20), transparent 24%),
                radial-gradient(circle at top right, rgba(6,182,212,0.16), transparent 20%),
                radial-gradient(circle at bottom center, rgba(124,58,237,0.14), transparent 22%),
                linear-gradient(180deg, #07111F 0%, #0B1220 55%, #07111F 100%)
              `,
            backgroundAttachment: "fixed",
          },
          "*": {
            boxSizing: "border-box",
          },
          "#root": {
            minHeight: "100vh",
          },
          "::selection": {
            backgroundColor: isLight
              ? "rgba(79,70,229,0.18)"
              : "rgba(79,70,229,0.30)",
          },
        },
      },

      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            minHeight: 44,
            borderRadius: 14,
            padding: "10px 18px",
            fontWeight: 700,
            transition:
              "transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease, border-color 0.18s ease, opacity 0.18s ease",
          },
          contained: {
            boxShadow: isLight
              ? "0 14px 28px rgba(79,70,229,0.24)"
              : "0 14px 28px rgba(0,0,0,0.42)",
            "&:hover": {
              transform: "translateY(-1px)",
              boxShadow: isLight
                ? "0 18px 34px rgba(79,70,229,0.30)"
                : "0 18px 36px rgba(0,0,0,0.50)",
            },
          },
          containedPrimary: {
            background: "linear-gradient(135deg, #4F46E5 0%, #312ECA 100%)",
          },
          containedSecondary: {
            background: "linear-gradient(135deg, #06B6D4 0%, #0E7490 100%)",
          },
          outlined: {
            borderWidth: 1.5,
            borderColor: isLight
              ? "rgba(100,116,139,0.26)"
              : "rgba(148,163,184,0.22)",
            backgroundColor: isLight
              ? "rgba(255,255,255,0.72)"
              : "rgba(15,23,42,0.52)",
            "&:hover": {
              borderColor: isLight
                ? "rgba(79,70,229,0.40)"
                : "rgba(124,58,237,0.34)",
              backgroundColor: isLight
                ? "rgba(79,70,229,0.05)"
                : "rgba(79,70,229,0.10)",
            },
          },
          text: {
            "&:hover": {
              backgroundColor: isLight
                ? "rgba(79,70,229,0.06)"
                : "rgba(79,70,229,0.14)",
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
            borderRadius: 22,
          },
        },
      },

      MuiCard: {
        styleOverrides: {
          root: {
            position: "relative",
            overflow: "hidden",
            borderRadius: 26,
            border: `1px solid ${
              isLight
                ? "rgba(226,232,240,0.95)"
                : "rgba(148,163,184,0.12)"
            }`,
            background: isLight
              ? "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(248,250,252,0.96) 100%)"
              : "linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(11,18,32,0.96) 100%)",
            backdropFilter: "blur(14px)",
            boxShadow: softCardShadow,
            transition:
              "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
            "&::before": {
              content: '""',
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background: isLight
                ? "linear-gradient(135deg, rgba(79,70,229,0.03) 0%, rgba(6,182,212,0.02) 50%, rgba(124,58,237,0.03) 100%)"
                : "linear-gradient(135deg, rgba(79,70,229,0.08) 0%, rgba(6,182,212,0.05) 50%, rgba(124,58,237,0.07) 100%)",
            },
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: softCardHoverShadow,
              borderColor: isLight
                ? "rgba(79,70,229,0.16)"
                : "rgba(99,102,241,0.18)",
            },
          },
        },
      },

      MuiCardContent: {
        styleOverrides: {
          root: {
            position: "relative",
            padding: 22,
            "&:last-child": {
              paddingBottom: 22,
            },
          },
        },
      },

      MuiAppBar: {
        styleOverrides: {
          root: {
            background: isLight
              ? "linear-gradient(180deg, rgba(255,255,255,0.90) 0%, rgba(248,250,252,0.90) 100%)"
              : "linear-gradient(90deg, rgba(7,17,31,0.96) 0%, rgba(30,27,75,0.94) 55%, rgba(14,116,144,0.82) 100%)",
            color: isLight ? "#0F172A" : "#FFFFFF",
            boxShadow: isLight
              ? "0 10px 26px rgba(15,23,42,0.08)"
              : "0 10px 30px rgba(0,0,0,0.38)",
            backdropFilter: "blur(14px)",
            borderBottom: isLight
              ? "1px solid rgba(226,232,240,0.88)"
              : "1px solid rgba(148,163,184,0.08)",
          },
        },
      },

      MuiToolbar: {
        styleOverrides: {
          root: {
            minHeight: 70,
          },
        },
      },

      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: "none",
            borderTopRightRadius: 30,
            borderBottomRightRadius: 30,
            background: isLight
              ? "linear-gradient(180deg, rgba(15,23,42,0.985) 0%, rgba(30,27,75,0.98) 58%, rgba(14,116,144,0.96) 100%)"
              : "linear-gradient(180deg, rgba(7,17,31,0.99) 0%, rgba(30,27,75,0.98) 62%, rgba(14,116,144,0.92) 100%)",
            backdropFilter: "blur(14px)",
            boxShadow: isLight
              ? "0 18px 40px rgba(15,23,42,0.22)"
              : "0 18px 42px rgba(0,0,0,0.46)",
            color: "#E2E8F0",
          },
        },
      },

      MuiListItemButton: {
        styleOverrides: {
          root: {
            minHeight: 46,
            borderRadius: 14,
            margin: "4px 10px",
            paddingInline: 12,
            transition:
              "background-color 0.18s ease, color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease",
            "&:hover": {
              backgroundColor: "rgba(255,255,255,0.08)",
              transform: "translateX(2px)",
            },
            "&.Mui-selected": {
              background:
                "linear-gradient(90deg, rgba(79,70,229,0.34), rgba(6,182,212,0.18) 55%, rgba(124,58,237,0.20) 100%)",
              color: "#F8FAFC",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
              "&:hover": {
                background:
                  "linear-gradient(90deg, rgba(79,70,229,0.40), rgba(6,182,212,0.22) 55%, rgba(124,58,237,0.24) 100%)",
              },
            },
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            fontWeight: 700,
            height: 32,
            paddingInline: 6,
          },
          filled: {
            boxShadow: isLight
              ? "inset 0 0 0 1px rgba(255,255,255,0.34)"
              : "inset 0 0 0 1px rgba(255,255,255,0.08)",
          },
        },
      },

      MuiTableContainer: {
        styleOverrides: {
          root: {
            borderRadius: 22,
            border: `1px solid ${
              isLight
                ? "rgba(226,232,240,0.95)"
                : "rgba(148,163,184,0.12)"
            }`,
            background: isLight
              ? "rgba(255,255,255,0.88)"
              : "rgba(15,23,42,0.78)",
            backdropFilter: "blur(10px)",
          },
        },
      },

      MuiTableHead: {
        styleOverrides: {
          root: {
            "& .MuiTableCell-root": {
              background: isLight
                ? "linear-gradient(180deg, rgba(79,70,229,0.05) 0%, rgba(6,182,212,0.03) 100%)"
                : "linear-gradient(180deg, rgba(79,70,229,0.12) 0%, rgba(6,182,212,0.06) 100%)",
              color: isLight ? "#334155" : "#E2E8F0",
              fontWeight: 750,
              borderBottom: `1px solid ${
                isLight
                  ? "rgba(226,232,240,0.95)"
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
                ? "rgba(248,250,252,0.72)"
                : "rgba(255,255,255,0.02)",
            },
            "&:hover": {
              backgroundColor: isLight
                ? "rgba(79,70,229,0.04)"
                : "rgba(79,70,229,0.08)",
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
          fullWidth: true,
        },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 18,
            backgroundColor: isLight
              ? "rgba(255,255,255,0.84)"
              : "rgba(15,23,42,0.82)",
            transition:
              "box-shadow 0.18s ease, border-color 0.18s ease, background-color 0.18s ease",
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: isLight
                ? "rgba(79,70,229,0.34)"
                : "rgba(124,58,237,0.34)",
            },
            "&.Mui-focused": {
              boxShadow: isLight
                ? "0 0 0 4px rgba(79,70,229,0.10)"
                : "0 0 0 4px rgba(79,70,229,0.18)",
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

      MuiFormControl: {
        defaultProps: {
          fullWidth: true,
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
            borderRadius: 24,
            border: `1px solid ${
              isLight
                ? "rgba(226,232,240,0.95)"
                : "rgba(148,163,184,0.12)"
            }`,
            background: isLight
              ? "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)"
              : "linear-gradient(180deg, #0F172A 0%, #07111F 100%)",
            boxShadow: isLight
              ? "0 24px 60px rgba(15,23,42,0.16)"
              : "0 28px 70px rgba(0,0,0,0.54)",
          },
        },
      },

      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 18,
            marginTop: 6,
            border: `1px solid ${
              isLight
                ? "rgba(15,23,42,0.06)"
                : "rgba(148,163,184,0.12)"
            }`,
            background: isLight
              ? "rgba(255,255,255,0.92)"
              : "rgba(15,23,42,0.94)",
            backdropFilter: "blur(12px)",
            boxShadow: isLight
              ? "0 18px 44px rgba(15,23,42,0.14)"
              : "0 22px 56px rgba(0,0,0,0.48)",
          },
        },
      },

      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 12,
            fontSize: "0.78rem",
            padding: "8px 10px",
            backgroundColor: isLight ? "#0F172A" : "#E2E8F0",
            color: isLight ? "#FFFFFF" : "#0F172A",
            boxShadow: isLight
              ? "0 10px 24px rgba(15,23,42,0.16)"
              : "0 10px 24px rgba(0,0,0,0.36)",
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
              ? "0 8px 20px rgba(15,23,42,0.10)"
              : "0 10px 24px rgba(0,0,0,0.36)",
          },
        },
      },

      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            "&:hover": {
              backgroundColor: isLight
                ? "rgba(79,70,229,0.08)"
                : "rgba(79,70,229,0.14)",
            },
          },
        },
      },

      MuiTabs: {
        styleOverrides: {
          indicator: {
            height: 3,
            borderRadius: 999,
            background: "linear-gradient(90deg, #4F46E5 0%, #06B6D4 100%)",
          },
        },
      },

      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 700,
            minHeight: 44,
          },
        },
      },

      MuiFab: {
        styleOverrides: {
          root: {
            borderRadius: 18,
            boxShadow: isLight
              ? "0 14px 30px rgba(79,70,229,0.22)"
              : "0 16px 34px rgba(0,0,0,0.46)",
          },
        },
      },

      MuiLink: {
        styleOverrides: {
          root: {
            textDecorationColor: alpha(primaryMain, 0.35),
            textUnderlineOffset: "3px",
          },
        },
      },

      MuiBadge: {
        styleOverrides: {
          badge: {
            fontWeight: 700,
            boxShadow: isLight
              ? "0 4px 12px rgba(79,70,229,0.20)"
              : "0 6px 14px rgba(0,0,0,0.34)",
          },
        },
      },
    },
  });

  theme = responsiveFontSizes(theme);
  return theme;
};

export default getTheme("light");
