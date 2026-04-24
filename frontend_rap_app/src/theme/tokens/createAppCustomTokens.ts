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

  const shellBackgroundLight = `radial-gradient(circle at top, ${alpha(
    palette.primary.main,
    0.08
  )} 0%, transparent 34%), ${palette.background.default}`;

  const shellBackgroundDark = `radial-gradient(circle at top, ${alpha(
    palette.primary.main,
    0.22
  )} 0%, transparent 28%), linear-gradient(180deg, ${alpha(
    palette.common.black,
    0.18
  )} 0%, transparent 24%), ${palette.background.default}`;

  const pageHeaderInnerShadow =
    isLight
      ? `0 10px 24px ${alpha(palette.common.black, 0.035)}`
      : `0 14px 28px ${alpha(palette.common.black, 0.14)}`;

  const elevatedRest = isLight
    ? "0 2px 8px rgba(15,23,42,0.06)"
    : "0 2px 10px rgba(0,0,0,0.35)";

  const elevatedHover = isLight
    ? "0 8px 24px rgba(15,23,42,0.10)"
    : "0 8px 28px rgba(0,0,0,0.45)";

  const kpiRestLight = palette.background.paper;
  const kpiRestDark = "rgba(255,255,255,0.04)";
  const kpiShadowRestLight = "0 2px 6px rgba(0,0,0,0.05)";
  const kpiShadowRestDark = "0 2px 6px rgba(0,0,0,0.5)";
  const kpiShadowHoverLight = "0 4px 12px rgba(0,0,0,0.08)";
  const kpiShadowHoverDark = "0 4px 14px rgba(0,0,0,0.7)";

  const glassBackgroundLight = "rgba(255,255,255,0.72)";
  const glassBackgroundDark = "rgba(15,23,42,0.68)";
  const glassBorderLight = "rgba(255,255,255,0.55)";
  const glassBorderDark = "rgba(148,163,184,0.12)";

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

  const pageTemplateHeroBackgroundLight = `linear-gradient(
    180deg,
    ${alpha(palette.primary.main, 0.08)} 0%,
    ${alpha(palette.background.paper, 0.98)} 100%
  )`;

  const pageTemplateHeroBackgroundDark = `linear-gradient(
    180deg,
    ${alpha(palette.primary.main, 0.14)} 0%,
    ${alpha(palette.background.paper, 0.98)} 100%
  )`;

  const pageWrapperOverlayLight = `linear-gradient(
    180deg,
    ${alpha("#fafafa", 0.9)} 0%,
    transparent 30%
  )`;

  const pageWrapperOverlayDark = `linear-gradient(
    180deg,
    ${alpha(palette.background.paper, 0.58)} 0%,
    transparent 30%
  )`;

  const stickyShadowLight = `inset -10px 0 12px -12px ${alpha(
    palette.common.black,
    0.16
  )}`;

  const stickyShadowDark = `inset -10px 0 12px -12px ${alpha(
    palette.common.black,
    0.36
  )}`;

  const custom: AppCustomTokens = {
    layout: {
      shell: {
        backgroundGradient: {
          light: shellBackgroundLight,
          dark: shellBackgroundDark,
        },
        backdropBlur: "blur(14px)",
      },
      appBar: {
        backdropBlur: "blur(14px)",
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
      glass: {
        blur: "blur(14px)",
        background: {
          light: glassBackgroundLight,
          dark: glassBackgroundDark,
        },
        border: {
          light: glassBorderLight,
          dark: glassBorderDark,
        },
      },
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
        boxShadowRest: elevatedRest,
        boxShadowHover: elevatedHover,
      },
      muted: {
        background: {
          light: "#fafafa",
          dark: alpha(palette.background.paper, 0.65),
        },
      },
    },

    page: {
      wrapper: {
        paddingY: {
          default: { xs: 2.5, sm: 3.5, lg: 4 },
          compact: { xs: 1.5, sm: 2, lg: 2.5 },
        },
        paddingX: {
          default: { xs: 0, sm: 0 },
          fullWidth: { xs: 0, sm: 0 },
        },
        overlay: {
          background: {
            light: pageWrapperOverlayLight,
            dark: pageWrapperOverlayDark,
          },
          borderRadius: { xs: 0, sm: 4 },
        },
      },
      section: {
        default: {
          padding: { xs: 1.5, sm: 2, lg: 2.25 },
          marginBottom: 1.5,
          borderRadius: { xs: 1.5, sm: 2 },
          overflow: "visible",
          overlayAlpha: { light: 0.02, dark: 0.04 },
          overlayStop: "22%",
          boxShadowRest: elevatedRest,
          boxShadowHover: elevatedHover,
        },
        compact: {
          padding: { xs: 1, sm: 1.25, lg: 1.5 },
          marginBottom: 1,
          borderRadius: { xs: 1.5, sm: 2 },
          overflow: "visible",
          overlayAlpha: { light: 0.02, dark: 0.04 },
          overlayStop: "22%",
          boxShadowRest: elevatedRest,
          boxShadowHover: elevatedHover,
        },
      },
      template: {
        header: {
          controls: {
            minHeight: { default: 3.75, compact: 3.5 },
            minSize: { default: 3.75, compact: 3.5 },
            radiusMultiplier: 999,
            hoverAlpha: { light: 0.06, dark: 0.14 },
          },
          hero: {
            outerPaddingX: {
              default: { xs: 1.25, sm: 1.5, lg: 1.75 },
              compact: { xs: 1, sm: 1.25, lg: 1.5 },
            },
            outerPaddingY: {
              default: { xs: 1.25, sm: 1.5, lg: 1.75 },
              compact: { xs: 1, sm: 1.125, lg: 1.25 },
            },
            innerPaddingX: {
              default: { xs: 1.125, sm: 1.375, lg: 1.625 },
              compact: { xs: 1, sm: 1.125, lg: 1.25 },
            },
            innerPaddingY: {
              default: { xs: 1, sm: 1.125, lg: 1.25 },
              compact: { xs: 0.875, sm: 1, lg: 1.125 },
            },
            background: {
              light: pageTemplateHeroBackgroundLight,
              dark: pageTemplateHeroBackgroundDark,
            },
          },
          title: {
            lineHeight: { default: 1.12, compact: 1.08 },
            fontSize: {
              default: {
                xs: theme.typography.h5.fontSize ?? "1.5rem",
                sm: theme.typography.h4.fontSize ?? "2rem",
                md: theme.typography.h3.fontSize ?? "2.4rem",
              },
              compact: {
                xs: theme.typography.h6.fontSize ?? "1.1rem",
                sm: theme.typography.h5.fontSize ?? "1.5rem",
                md: theme.typography.h4.fontSize ?? "2rem",
              },
            },
            maxWidth: {
              xs: "100%",
              md: theme.spacing(112.5),
            },
          },
          subtitle: {
            variant: { default: "body1", compact: "body2" },
            lineHeight: { default: 1.55, compact: 1.45 },
            marginTop: { default: 0.75, compact: 0.5 },
            maxWidth: {
              xs: "100%",
              md: theme.spacing(102.5),
            },
          },
          actions: {
            minWidth: { default: 30, compact: 27.5 },
            gap: { default: 1, compact: 0.75 },
          },
        },
        centered: {
          minHeight: "50vh",
          gap: 2,
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
      densities: {
        default: {
          spacing: {
            cellPaddingX: 1.5,
            cellPaddingY: 1.25,
            headerPaddingX: 1.5,
            headerPaddingY: 1.2,
            inlineGap: 0.75,
            stackGap: 0.5,
            metaGap: 0.35,
          },
          sizing: {
            rowMinHeight: 56,
            actionSize: 32,
            checkboxSize: 18,
            chipHeight: 28,
            progressHeight: 7,
          },
          radius: {
            controlSx: 1.5,
            chipSx: 999,
          },
          typography: {
            primaryVariant: "body2",
            secondaryVariant: "body2",
            metaVariant: "caption",
          },
        },
        compact: {
          spacing: {
            cellPaddingX: 1,
            cellPaddingY: 0.75,
            headerPaddingX: 1,
            headerPaddingY: 0.75,
            inlineGap: 0.5,
            stackGap: 0.35,
            metaGap: 0.2,
          },
          sizing: {
            rowMinHeight: 44,
            actionSize: 28,
            checkboxSize: 16,
            chipHeight: 24,
            progressHeight: 6,
          },
          radius: {
            controlSx: 1.25,
            chipSx: 999,
          },
          typography: {
            primaryVariant: "body2",
            secondaryVariant: "caption",
            metaVariant: "caption",
          },
        },
      },
      container: {
        maxHeight: "calc(100vh - 64px)",
        borderRadius: 0,
        background: {
          light: "transparent",
          dark: "transparent",
        },
        border: {
          light: "none",
          dark: "none",
        },
      },
      actionsColumn: {
        minWidth: 17.5,
        maxWidth: 30,
      },
      sticky: {
        shadow: {
          light: stickyShadowLight,
          dark: stickyShadowDark,
        },
      },
      mobileCard: {
        borderRadius: 2,
        padding: 1,
        titleVariant: "body2",
        labelVariant: "caption",
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
      sectionCard: {
        borderRadius: 3,
        padding: { xs: 1.5, sm: 2 },
        titleGap: 1,
        contentGap: 1.5,
        background: {
          light: alpha(palette.background.paper, 0.9),
          dark: alpha(palette.background.paper, 0.82),
        },
        border: {
          light: `1px solid ${alpha(palette.divider, 0.95)}`,
          dark: `1px solid ${alpha(palette.divider, 0.55)}`,
        },
      },
      inlineBlock: {
        gap: 1,
        minHeight: 40,
      },
      helperArea: {
        minHeight: 20,
        paddingTop: 0.5,
      },
    },

    input: {
      search: {
        width: "clamp(240px, 40vw, 420px)",
        mobileWidth: "100%",
        focusRing: {
          light: `0 0 0 3px ${alpha(palette.primary.main, 0.2)}`,
          dark: `0 0 0 3px ${alpha(palette.primary.main, 0.28)}`,
        },
        placeholderOpacity: 1,
      },
    },

    overlay: {
      scrim: {
        background: {
          light: "rgba(15, 23, 42, 0.82)",
          dark: "rgba(0, 0, 0, 0.88)",
        },
      },
      modalSectionTitle: {
        background: {
          light: "#F1F5F9",
          dark: alpha(palette.primary.main, 0.16),
        },
        borderBottom: {
          light: `1px solid ${alpha(palette.divider, 0.9)}`,
          dark: `1px solid ${alpha(palette.divider, 0.55)}`,
        },
      },
    },

    dialog: {
      surface: {
        borderRadius: 24,
        border: {
          light: "#CBD5E1",
          dark: alpha("#94A3B8", 0.22),
        },
        background: {
          light: "#FFFFFF",
          dark: "#0F172A",
        },
        boxShadow: {
          light: "0 32px 80px rgba(15,23,42,0.24)",
          dark: "0 34px 84px rgba(0,0,0,0.64)",
        },
      },
      title: {
        paddingX: 3,
        paddingY: 2,
        minHeight: 56,
        borderBottom: {
          light: `1px solid ${alpha(palette.divider, 0.9)}`,
          dark: `1px solid ${alpha(palette.divider, 0.55)}`,
        },
      },
      content: {
        paddingX: 3,
        paddingY: 2,
      },
      actions: {
        paddingX: 3,
        paddingY: 2,
        gap: 1,
        borderTop: {
          light: `1px solid ${alpha(palette.divider, 0.9)}`,
          dark: `1px solid ${alpha(palette.divider, 0.55)}`,
        },
      },
      section: {
        borderRadius: 2,
        padding: 1.5,
        background: {
          light: "rgba(248,250,252,0.92)",
          dark: alpha(palette.common.white, 0.05),
        },
        border: {
          light: `1px solid ${alpha(palette.divider, 0.92)}`,
          dark: `1px solid ${alpha(palette.divider, 0.42)}`,
        },
      },
    },

    feedback: {
      errorState: {
        borderRadius: 3,
        padding: 3,
        gap: 2,
        iconSize: 22,
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

    badge: {
      etat: {
        borderRadius: 999,
        fontWeight: 700,
        minHeight: 28,
        paddingX: 1.25,
        border: {
          light: `1px solid ${alpha(palette.divider, 0.95)}`,
          dark: `1px solid ${alpha(palette.divider, 0.55)}`,
        },
      },
    },

    dashboard: {
      statCard: {
        borderRadius: 3,
        minHeight: 120,
        padding: { xs: 1.5, sm: 2 },
        gap: 1,
        boxShadowRest: elevatedRest,
        boxShadowHover: elevatedHover,
      },
      chartCard: {
        borderRadius: 3,
        minHeight: 320,
        padding: { xs: 1.5, sm: 2 },
        gap: 1.25,
        boxShadowRest: elevatedRest,
        boxShadowHover: elevatedHover,
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