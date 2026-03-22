// src/theme.ts
import { createTheme, responsiveFontSizes } from "@mui/material/styles";

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
  let theme = createTheme({
    palette: {
      mode,
      primary: {
        main: "#6366F1",
        light: "#A5B4FC",
        dark: "#4F46E5",
        contrastText: "#FFFFFF",
      },
      secondary: {
        main: "#06B6D4",
        light: "#67E8F9",
        dark: "#0E7490",
        contrastText: "#FFFFFF",
      },
      tertiary: {
        main: "#64748B",
        light: "#CBD5E1",
        dark: "#334155",
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
        secondary: "linear-gradient(135deg, #06B6D4 0%, #0E7490 100%)",
        tertiary: "linear-gradient(135deg, #64748B 0%, #334155 100%)",
      },
      ...(mode === "light"
        ? {
            background: {
              default: "#F8FAFC",
              paper: "#FFFFFF",
            },
            text: {
              primary: "#111827",
              secondary: "#475569",
            },
          }
        : {
            background: {
              default: "#0F172A",
              paper: "#1E293B",
            },
            text: {
              primary: "#F1F5F9",
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
        light: "#FDE68A",
        dark: "#B45309",
      },
      error: {
        main: "#EF4444",
        light: "#FCA5A5",
        dark: "#991B1B",
      },
      info: {
        main: "#3B82F6",
        light: "#93C5FD",
        dark: "#1D4ED8",
      },
    },

    typography: {
      fontFamily: "'Inter', 'Roboto', sans-serif",
      h1: { fontWeight: 800, fontSize: "3rem", letterSpacing: "-0.03em" },
      h2: { fontWeight: 700, fontSize: "2.4rem", letterSpacing: "-0.02em" },
      h3: { fontWeight: 700, fontSize: "2rem" },
      h4: { fontWeight: 600, fontSize: "1.6rem" },
      h5: { fontWeight: 600, fontSize: "1.3rem" },
      h6: { fontWeight: 600, fontSize: "1.1rem" },
      subtitle1: { fontSize: "1rem", fontWeight: 500, color: "#64748B" },
      subtitle2: { fontSize: "0.9rem", fontWeight: 500, color: "#94A3B8" },
      body1: { fontSize: "1rem", lineHeight: 1.7 },
      body2: { fontSize: "0.92rem", color: "#6B7280", lineHeight: 1.6 },
      button: {
        textTransform: "none",
        fontWeight: 600,
        letterSpacing: "0.02em",
      },
    },

    shape: {
      borderRadius: 16,
    },

    shadows:
      mode === "light"
        ? [
            "none", // 0
            "0px 2px 4px rgba(0,0,0,0.05)", // 1
            "0px 3px 6px rgba(0,0,0,0.06)", // 2
            "0px 4px 8px rgba(0,0,0,0.07)", // 3
            "0px 6px 12px rgba(0,0,0,0.08)", // 4
            "0px 8px 16px rgba(0,0,0,0.09)", // 5
            "0px 10px 20px rgba(0,0,0,0.10)", // 6
            "0px 12px 24px rgba(0,0,0,0.11)", // 7
            "0px 14px 28px rgba(0,0,0,0.12)", // 8
            "0px 16px 32px rgba(0,0,0,0.13)", // 9
            "0px 18px 36px rgba(0,0,0,0.14)", // 10
            "0px 20px 40px rgba(0,0,0,0.15)", // 11
            "0px 22px 44px rgba(0,0,0,0.16)", // 12
            "0px 24px 48px rgba(0,0,0,0.17)", // 13
            "0px 26px 52px rgba(0,0,0,0.18)", // 14
            "0px 28px 56px rgba(0,0,0,0.19)", // 15
            "0px 30px 60px rgba(0,0,0,0.20)", // 16
            "0px 32px 64px rgba(0,0,0,0.21)", // 17
            "0px 34px 68px rgba(0,0,0,0.22)", // 18
            "0px 36px 72px rgba(0,0,0,0.23)", // 19
            "0px 38px 76px rgba(0,0,0,0.24)", // 20
            "0px 40px 80px rgba(0,0,0,0.25)", // 21
            "0px 42px 84px rgba(0,0,0,0.26)", // 22
            "0px 44px 88px rgba(0,0,0,0.27)", // 23
            "0px 46px 92px rgba(0,0,0,0.28)", // 24
          ]
        : [
            "none", // 0
            "0px 2px 4px rgba(0,0,0,0.25)", // 1
            "0px 3px 6px rgba(0,0,0,0.28)", // 2
            "0px 4px 8px rgba(0,0,0,0.30)", // 3
            "0px 6px 12px rgba(0,0,0,0.32)", // 4
            "0px 8px 16px rgba(0,0,0,0.34)", // 5
            "0px 10px 20px rgba(0,0,0,0.36)", // 6
            "0px 12px 24px rgba(0,0,0,0.38)", // 7
            "0px 14px 28px rgba(0,0,0,0.40)", // 8
            "0px 16px 32px rgba(0,0,0,0.42)", // 9
            "0px 18px 36px rgba(0,0,0,0.44)", // 10
            "0px 20px 40px rgba(0,0,0,0.46)", // 11
            "0px 22px 44px rgba(0,0,0,0.48)", // 12
            "0px 24px 48px rgba(0,0,0,0.50)", // 13
            "0px 26px 52px rgba(0,0,0,0.52)", // 14
            "0px 28px 56px rgba(0,0,0,0.54)", // 15
            "0px 30px 60px rgba(0,0,0,0.56)", // 16
            "0px 32px 64px rgba(0,0,0,0.58)", // 17
            "0px 34px 68px rgba(0,0,0,0.60)", // 18
            "0px 36px 72px rgba(0,0,0,0.62)", // 19
            "0px 38px 76px rgba(0,0,0,0.64)", // 20
            "0px 40px 80px rgba(0,0,0,0.66)", // 21
            "0px 42px 84px rgba(0,0,0,0.68)", // 22
            "0px 44px 88px rgba(0,0,0,0.70)", // 23
            "0px 46px 92px rgba(0,0,0,0.72)", // 24
          ],

    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            padding: "10px 22px",
            fontWeight: 600,
            transition: "all 0.3s ease",
            backgroundImage: "var(--gradient, none)",
            "&:hover": {
              transform: "translateY(-2px) scale(1.02)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 20,
            backdropFilter: "blur(6px)",
            boxShadow:
              mode === "light" ? "0 6px 20px rgba(0,0,0,0.05)" : "0 6px 24px rgba(0,0,0,0.6)",
            transition: "all 0.3s ease",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow:
                mode === "light" ? "0 12px 32px rgba(0,0,0,0.08)" : "0 12px 32px rgba(0,0,0,0.8)",
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            background:
              mode === "light"
                ? "linear-gradient(90deg, #6366F1, #06B6D4)"
                : "linear-gradient(90deg, #1E293B, #0F766E)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderTopRightRadius: 20,
            borderBottomRightRadius: 20,
            borderRight: "none",
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            margin: "2px 8px",
            "&.Mui-selected": {
              background:
                mode === "light"
                  ? "linear-gradient(90deg, #EEF2FF, #E0F2FE)"
                  : "linear-gradient(90deg, #334155, #0F172A)",
              color: mode === "light" ? "#111827" : "#F1F5F9",
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            fontWeight: 500,
            padding: "0 8px",
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: "background-color 0.2s ease",
            "&:nth-of-type(even)": {
              backgroundColor: mode === "light" ? "#F9FAFB" : "#1E293B",
            },
            "&:hover": {
              backgroundColor: mode === "light" ? "#EEF2FF" : "#334155",
            },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 8,
            fontSize: "0.85rem",
            padding: "6px 12px",
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            opacity: 0.6,
          },
        },
      },
    },
  });

  theme = responsiveFontSizes(theme);
  return theme;
};

export default getTheme("light");
