import type { Theme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";
import { STATUT_COLORS } from "../../constants/colors";
import type { AppCustomTokens } from "./appCustomTokens.types";

/**
 * Construit l’objet `custom` complet à fusionner dans le thème MUI.
 * Doit être appelé **après** le premier `createTheme` (palette, gradients, etc. disponibles).
 */
export function createAppCustomTokens(theme: Theme): AppCustomTokens {
  const { palette } = theme;
  const isLight = palette.mode === "light";

  const shellBackgroundLight = `radial-gradient(circle at top, ${alpha(palette.primary.main, 0.08)} 0%, transparent 34%), ${palette.background.default}`;
  const shellBackgroundDark = `radial-gradient(circle at top, ${alpha(palette.primary.main, 0.22)} 0%, transparent 28%), linear-gradient(180deg, ${alpha(palette.common.black, 0.18)} 0%, transparent 24%), ${palette.background.default}`;

  const pageHeaderInnerShadow =
    palette.mode === "light"
      ? `0 10px 24px ${alpha(palette.common.black, 0.035)}`
      : `0 14px 28px ${alpha(palette.common.black, 0.14)}`;

  const kpiRestLight = palette.background.paper;
  const kpiRestDark = "rgba(255,255,255,0.04)";
  const kpiShadowRestLight = "0 2px 6px rgba(0,0,0,0.05)";
  const kpiShadowRestDark = "0 2px 6px rgba(0,0,0,0.5)";
  const kpiShadowHoverLight = "0 4px 12px rgba(0,0,0,0.08)";
  const kpiShadowHoverDark = "0 4px 14px rgba(0,0,0,0.7)";

  const chartSeriesOrdered = [
    palette.primary.main,
    palette.secondary.main,
    palette.tertiary.main,
    palette.success.main,
    palette.warning.main,
    palette.info.main,
    palette.error.main,
    palette.neutral.main,
  ] as const;

  const custom: AppCustomTokens = {
    layout: {
      shell: {
        backgroundGradient: {
          light: shellBackgroundLight,
          dark: shellBackgroundDark,
        },
      },
      main: {
        paddingX: { xs: 2, sm: 3, md: 4 },
        backdropBlur: {
          sm: "blur(10px)",
          md: "blur(16px)",
          lg: "blur(18px)",
        },
      },
    },

    nav: {
      drawerItem: {
        transitionDurationMs: 180,
        easing: "ease",
        sizing: {
          minHeightSx: { root: 46, branch: 42 },
          borderRadiusSx: { root: 2.75, branch: 2 },
        },
        spacing: {
          marginXSx: 1,
          marginYSx: 0.35,
          paddingXSx: { root: 1.5, branch: 1.25 },
          paddingLeftSx: { root: 1.5, branch: 4 },
        },
        icon: {
          minWidthPx: 38,
          translateXSelectedPx: 1,
        },
        label: {
          root: { fontSizeRem: "0.96rem", fontWeight: 600 },
          branch: { fontSizeRem: "0.92rem", fontWeight: 500 },
        },
        interaction: {
          selected: {
            background: { light: 0.12, dark: 0.2 },
            insetRing: { light: 0.12, dark: 0.24 },
          },
          hover: {
            backdropFromText: { light: 0.05, dark: 0.08 },
          },
        },
      },
      topButton: {
        typography: {
          fontSizeRem: "0.94rem",
          letterSpacing: "-0.01em",
          fontWeight: { active: 700, idle: 600 },
        },
        shape: {
          minHeightPx: 38,
          paddingXSx: 1.4,
          borderRadiusPill: 999,
        },
        border: {
          widthPx: 1,
          style: "solid",
        },
        transitionDurationMs: 180,
        easing: "ease",
        state: {
          active: {
            borderWhiteAlpha: { light: 0.22, dark: 0.18 },
            backgroundWhiteAlpha: { light: 0.16, dark: 0.1 },
            insetBottomShadow: "inset 0 -1px 0 rgba(255,255,255,0.08)",
          },
          idle: {
            borderColor: "transparent",
            backgroundColor: "transparent",
            boxShadow: "none",
          },
          hover: {
            borderWhiteAlpha: { light: 0.18, dark: 0.14 },
            backgroundWhiteAlpha: { light: 0.12, dark: 0.08 },
          },
        },
      },
    },

    footer: {
      border: {
        widthPx: 1,
        style: "solid",
        color: {
          light: "rgba(15,23,42,0.08)",
          dark: "rgba(148,163,184,0.14)",
        },
      },
      background: {
        gradient: {
          light:
            "linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(248,250,252,0.96) 100%)",
          dark:
            "linear-gradient(180deg, rgba(15,23,42,0.92) 0%, rgba(7,17,31,0.96) 100%)",
        },
      },
      elevation: {
        boxShadow: {
          light: "0 -8px 24px rgba(15,23,42,0.04)",
          dark: "0 -10px 28px rgba(0,0,0,0.22)",
        },
      },
      accentOverlay: {
        gradient: {
          light:
            "linear-gradient(90deg, rgba(79,70,229,0.04) 0%, rgba(6,182,212,0.03) 50%, rgba(124,58,237,0.04) 100%)",
          dark:
            "linear-gradient(90deg, rgba(79,70,229,0.08) 0%, rgba(6,182,212,0.05) 50%, rgba(124,58,237,0.08) 100%)",
        },
        opacity: 0.9,
      },
      backdrop: {
        filter: "blur(10px)",
      },
    },

    surface: {
      pageHeader: {
        outer: {
          paddingX: { xs: 0.25, sm: 0.5 },
          paddingY: { xs: 0.25, sm: 0.4 },
        },
        inner: {
          paddingX: { xs: 1, sm: 1.2, lg: 1.4 },
          paddingY: { xs: 0.9, sm: 1.05 },
          border: {
            width: "1px",
            style: "solid",
            color: "divider",
          },
          shape: {
            borderRadiusSx: 3,
          },
          boxShadow: pageHeaderInnerShadow,
        },
      },
      elevated: {
        boxShadowRest: isLight
          ? "0 2px 8px rgba(15,23,42,0.06)"
          : "0 2px 10px rgba(0,0,0,0.35)",
        boxShadowHover: isLight
          ? "0 8px 24px rgba(15,23,42,0.1)"
          : "0 8px 28px rgba(0,0,0,0.45)",
      },
      muted: {
        background: {
          light: "#fafafa",
          dark: alpha(palette.background.paper, 0.65),
        },
      },
    },

    kpi: {
      cardBackground: {
        rest: {
          light: kpiRestLight,
          dark: kpiRestDark,
        },
      },
      elevation: {
        rest: {
          light: kpiShadowRestLight,
          dark: kpiShadowRestDark,
        },
        hover: {
          light: kpiShadowHoverLight,
          dark: kpiShadowHoverDark,
        },
      },
      highlight: {
        outlineWidthPx: 2,
        outlineStyle: "solid",
      },
    },

    table: {
      header: {
        background: {
          light: "#f4f6f8",
          dark: alpha(palette.background.paper, 0.55),
        },
        borderBottom: {
          light: "2px solid #e0e0e0",
          dark: `1px solid ${alpha(palette.divider, 0.9)}`,
        },
      },
      row: {
        stripedEven: {
          light: "rgba(248,250,252,0.72)",
          dark: "rgba(255,255,255,0.02)",
        },
        hover: {
          light: alpha(palette.primary.main, 0.04),
          dark: alpha(palette.primary.main, 0.08),
        },
        archived: {
          background: {
            light: "#f6f6f6",
            dark: alpha(palette.action.disabledBackground, 0.3),
          },
          opacity: 0.85,
        },
      },
      cell: {
        borderBottom: {
          light: "rgba(15,23,42,0.06)",
          dark: alpha(palette.divider, 0.5),
        },
      },
    },

    form: {
      section: {
        paperBackground: {
          light: "#fafafa",
          dark: alpha(palette.background.paper, 0.85),
        },
        accentHeaderBackground: {
          light: "rgba(25,118,210,0.08)",
          dark: alpha(palette.primary.main, 0.12),
        },
      },
      divider: {
        dashedColor: {
          light: "#dddddd",
          dark: alpha(palette.divider, 0.9),
        },
        dashedWidth: "1px",
      },
    },

    overlay: {
      scrim: {
        background: {
          light: alpha(palette.common.black, 0.35),
          dark: alpha(palette.common.black, 0.6),
        },
      },
      modalSectionTitle: {
        background: {
          light: alpha(palette.primary.main, 0.06),
          dark: alpha(palette.primary.main, 0.14),
        },
        borderBottom: {
          light: `1px solid ${alpha(palette.divider, 0.95)}`,
          dark: `1px solid ${alpha(palette.divider, 0.8)}`,
        },
      },
    },

    typographyComplements: {
      eyebrowLetterSpacing: "0.08em",
      pageTitleLetterSpacing: "-0.02em",
    },

    status: {
      prospection: {
        archived: {
          rowBackground: "#f6f6f6",
          chipBackground: "#e0e0e0",
          chipColor: "#555555",
          chipBorder: "1px solid #cccccc",
        },
        active: {
          chipBackground: "rgba(76,175,80,0.1)",
          chipColor: "green",
          chipBorder: "1px solid #9ccc65",
        },
      },
      chip: {
        placeholderText: "#aaaaaa",
      },
    },

    chart: {
      axis: {
        stroke: {
          light: alpha(palette.text.secondary, 0.35),
          dark: alpha(palette.text.secondary, 0.5),
        },
      },
      grid: {
        stroke: {
          light: alpha(palette.divider, 0.9),
          dark: alpha(palette.divider, 0.35),
        },
      },
      tooltip: {
        background: {
          light: alpha(palette.background.paper, 0.98),
          dark: alpha(palette.background.paper, 0.96),
        },
        border: {
          light: `1px solid ${alpha(palette.divider, 0.95)}`,
          dark: `1px solid ${alpha(palette.divider, 0.6)}`,
        },
      },
      series: {
        ordered: chartSeriesOrdered,
      },
    },

    editor: {
      quill: {
        black: "#000000",
        white: "#ffffff",
        red: "#e60000",
        green: "#008a00",
        blue: "#0066cc",
        yellow: "#ffcc00",
        orange: "#ff9900",
        purple: "#9933cc",
      },
    },

    dataviz: {
      statut: {
        pickableHex: STATUT_COLORS,
      },
    },
  };

  return custom;
}
