/**
 * Jetons personnalisés du design system — structure imbriquée stricte.
 * Consommation : `theme.custom.layout.shell.*`, `theme.custom.nav.drawerItem.*`, etc.
 *
 * Les valeurs « calculées » (ombres avec alpha du thème) sont produites par
 * `createAppCustomTokens(theme)` et non stockées ici comme types seuls.
 */

import type { Theme as MuiTheme } from "@mui/material/styles";

/** Mode pour les paires light/dark explicites */
export interface LightDark<T> {
  light: T;
  dark: T;
}

/** --- Layout shell (MainLayout*, zone principale) --- */
export interface CustomLayoutShellTokens {
  /** Dégradés de fond derrière le contenu (valeurs CSS complètes) */
  backgroundGradient: LightDark<string>;
}

export interface CustomLayoutMainContentTokens {
  /** Espacements horizontaux du contenu (clés MUI `sx` responsive) */
  paddingX: { xs: number; sm: number; md: number };
  /** Blur normalisés pour surfaces vitrées */
  backdropBlur: {
    /** ex. footer */
    sm: string;
    /** ex. barre principale */
    md: string;
    /** ex. panneaux flottants */
    lg: string;
  };
}

export interface CustomLayoutTokens {
  shell: CustomLayoutShellTokens;
  main: CustomLayoutMainContentTokens;
}

/** --- Navigation : item de tiroir (liste latérale) --- */
export interface NavDrawerItemSizingTokens {
  /** Hauteur min. item racine vs item imbriqué (px implicites via sx spacing si besoin) */
  minHeightSx: { root: number; branch: number };
  /** Rayon de bordure (échelle MUI sx, ex. 2 = 16px si 8px base) */
  borderRadiusSx: { root: number; branch: number };
}

export interface NavDrawerItemSpacingTokens {
  marginXSx: number;
  marginYSx: number;
  paddingXSx: { root: number; branch: number };
  paddingLeftSx: { root: number; branch: number };
}

export interface NavDrawerItemIconTokens {
  minWidthPx: number;
  /** Translation à l’état sélectionné (px) */
  translateXSelectedPx: number;
}

export interface NavDrawerItemLabelTokens {
  root: { fontSizeRem: string; fontWeight: number };
  branch: { fontSizeRem: string; fontWeight: number };
}

export interface NavDrawerItemSelectedAlphaTokens {
  background: LightDark<number>;
  insetRing: LightDark<number>;
}

export interface NavDrawerItemHoverAlphaTokens {
  backdropFromText: LightDark<number>;
}

export interface NavDrawerItemInteractionTokens {
  selected: NavDrawerItemSelectedAlphaTokens;
  hover: NavDrawerItemHoverAlphaTokens;
}

export interface NavDrawerItemTokens {
  /** Durée des transitions UI (ms) */
  transitionDurationMs: number;
  /** Courbe CSS */
  easing: string;
  sizing: NavDrawerItemSizingTokens;
  spacing: NavDrawerItemSpacingTokens;
  icon: NavDrawerItemIconTokens;
  label: NavDrawerItemLabelTokens;
  /** Alphas appliqués via `alpha(theme.palette.*.main|text, …)` */
  interaction: NavDrawerItemInteractionTokens;
}

/** --- Navigation : boutons de la barre supérieure (contexte AppBar sombre) --- */
export interface NavTopButtonTypographyTokens {
  fontSizeRem: string;
  letterSpacing: string;
  fontWeight: { active: number; idle: number };
}

export interface NavTopButtonShapeTokens {
  minHeightPx: number;
  paddingXSx: number;
 /** 999 = pilule */
  borderRadiusPill: number;
}

export interface NavTopButtonBorderTokens {
  widthPx: number;
  style: string;
}

export interface NavTopButtonActiveTokens {
  borderWhiteAlpha: LightDark<number>;
  backgroundWhiteAlpha: LightDark<number>;
  /** Ombre interne basse (chaîne CSS complète) */
  insetBottomShadow: string;
}

export interface NavTopButtonIdleTokens {
  borderColor: "transparent";
  backgroundColor: "transparent";
  boxShadow: "none";
}

export interface NavTopButtonHoverTokens {
  borderWhiteAlpha: LightDark<number>;
  backgroundWhiteAlpha: LightDark<number>;
}

export interface NavTopButtonStateTokens {
  active: NavTopButtonActiveTokens;
  idle: NavTopButtonIdleTokens;
  hover: NavTopButtonHoverTokens;
}

export interface NavTopButtonTokens {
  typography: NavTopButtonTypographyTokens;
  shape: NavTopButtonShapeTokens;
  border: NavTopButtonBorderTokens;
  transitionDurationMs: number;
  easing: string;
  state: NavTopButtonStateTokens;
}

export interface CustomNavTokens {
  drawerItem: NavDrawerItemTokens;
  topButton: NavTopButtonTokens;
}

/** --- Pied de page --- */
export interface CustomFooterBorderTokens {
  widthPx: number;
  style: string;
  color: LightDark<string>;
}

export interface CustomFooterBackgroundTokens {
  /** Dégradé complet par mode */
  gradient: LightDark<string>;
}

export interface CustomFooterElevationTokens {
  /** Ombre portée vers le haut (chaîne CSS) */
  boxShadow: LightDark<string>;
}

export interface CustomFooterOverlayTokens {
  /** Couche `::before` (dégradé d’accent) */
  gradient: LightDark<string>;
  opacity: number;
}

export interface CustomFooterBackdropTokens {
  filter: string;
}

export interface CustomFooterTokens {
  border: CustomFooterBorderTokens;
  background: CustomFooterBackgroundTokens;
  elevation: CustomFooterElevationTokens;
  accentOverlay: CustomFooterOverlayTokens;
  backdrop: CustomFooterBackdropTokens;
}

/** --- Surfaces de page --- */
export interface CustomSurfacePageHeaderOuterTokens {
  paddingX: { xs: number; sm: number };
  paddingY: { xs: number; sm: number };
}

export interface CustomSurfacePageHeaderInnerBorderTokens {
  width: string;
  style: string;
  /** Référence sémantique MUI */
  color: "divider";
}

export interface CustomSurfacePageHeaderInnerShapeTokens {
  /** Valeur `sx` (multiple du thème spacing) */
  borderRadiusSx: number;
}

export interface CustomSurfacePageHeaderInnerTokens {
  paddingX: { xs: number; sm: number; lg: number };
  paddingY: { xs: number; sm: number };
  border: CustomSurfacePageHeaderInnerBorderTokens;
  shape: CustomSurfacePageHeaderInnerShapeTokens;
  /** Prête pour `box-shadow` (calculée avec le thème) */
  boxShadow: string;
}

export interface CustomSurfacePageHeaderTokens {
  outer: CustomSurfacePageHeaderOuterTokens;
  inner: CustomSurfacePageHeaderInnerTokens;
}

export interface CustomSurfaceElevatedTokens {
  /** Ombre « carte » générique (repos) */
  boxShadowRest: string;
  /** Ombre au survol */
  boxShadowHover: string;
}

export interface CustomSurfaceMutedTokens {
  /** Fond discret sections secondaires (ex. accordéons) */
  background: LightDark<string>;
}

export interface CustomSurfaceTokens {
  pageHeader: CustomSurfacePageHeaderTokens;
  elevated: CustomSurfaceElevatedTokens;
  muted: CustomSurfaceMutedTokens;
}

/** --- KPI / tuiles stats --- */
export interface CustomKpiCardBackgroundTokens {
  /** Référence MUI ou rgba — chaîne résolue */
  rest: LightDark<string>;
}

export interface CustomKpiCardElevationTokens {
  rest: LightDark<string>;
  hover: LightDark<string>;
}

export interface CustomKpiHighlightTokens {
  /** Épaisseur contour mise en avant (px) */
  outlineWidthPx: number;
  /** Style de ligne */
  outlineStyle: string;
}

export interface CustomKpiTokens {
  cardBackground: CustomKpiCardBackgroundTokens;
  elevation: CustomKpiCardElevationTokens;
  highlight: CustomKpiHighlightTokens;
}

/** --- Tables --- */
export interface CustomTableHeaderTokens {
  background: LightDark<string>;
  borderBottom: LightDark<string>;
}

export interface CustomTableRowTokens {
  stripedEven: LightDark<string>;
  hover: LightDark<string>;
  archived: { background: LightDark<string>; opacity: number };
}

export interface CustomTableCellTokens {
  borderBottom: LightDark<string>;
}

export interface CustomTableTokens {
  header: CustomTableHeaderTokens;
  row: CustomTableRowTokens;
  cell: CustomTableCellTokens;
}

/** --- Formulaires --- */
export interface CustomFormSectionTokens {
  paperBackground: LightDark<string>;
  accentHeaderBackground: LightDark<string>;
}

export interface CustomFormDividerTokens {
  dashedColor: LightDark<string>;
  dashedWidth: string;
}

export interface CustomFormTokens {
  section: CustomFormSectionTokens;
  divider: CustomFormDividerTokens;
}

/** --- Overlays --- */
export interface CustomOverlayScrimTokens {
  background: LightDark<string>;
}

export interface CustomModalSectionTitleTokens {
  background: LightDark<string>;
  borderBottom: LightDark<string>;
}

export interface CustomOverlayTokens {
  scrim: CustomOverlayScrimTokens;
  modalSectionTitle: CustomModalSectionTitleTokens;
}

/** --- Typographie (compléments au thème MUI) --- */
export interface CustomTypographyComplementsTokens {
  eyebrowLetterSpacing: string;
  pageTitleLetterSpacing: string;
}

/** --- États métier (prospection, badges) --- */
export interface CustomStatusProspectionTokens {
  archived: {
    rowBackground: string;
    chipBackground: string;
    chipColor: string;
    chipBorder: string;
  };
  active: {
    chipBackground: string;
    chipColor: string;
    chipBorder: string;
  };
}

export interface CustomStatusChipTokens {
  placeholderText: string;
}

export interface CustomStatusTokens {
  prospection: CustomStatusProspectionTokens;
  chip: CustomStatusChipTokens;
}

/** --- Graphiques (Recharts, etc.) --- */
export interface CustomChartAxisTokens {
  stroke: LightDark<string>;
}

export interface CustomChartGridTokens {
  stroke: LightDark<string>;
}

export interface CustomChartTooltipTokens {
  background: LightDark<string>;
  border: LightDark<string>;
}

export interface CustomChartSeriesTokens {
  /** Ordre stable pour séries empilées / multi-lignes */
  ordered: readonly string[];
}

export interface CustomChartTokens {
  axis: CustomChartAxisTokens;
  grid: CustomChartGridTokens;
  tooltip: CustomChartTooltipTokens;
  series: CustomChartSeriesTokens;
}

/** --- Éditeur (Quill) : références couleur prédéfinies --- */
export interface CustomEditorQuillPresetTokens {
  black: string;
  white: string;
  red: string;
  green: string;
  blue: string;
  yellow: string;
  orange: string;
  purple: string;
}

export interface CustomEditorTokens {
  quill: CustomEditorQuillPresetTokens;
}

/** --- Dataviz / palette statuts (sélecteurs) --- */
export interface CustomDatavizStatutPaletteTokens {
  /** Liste exhaustive des couleurs sélectionnables (réf. `constants/colors`) */
  pickableHex: readonly string[];
}

export interface CustomDatavizTokens {
  statut: CustomDatavizStatutPaletteTokens;
}

/** Racine exposée sur `Theme` */
export interface AppCustomTokens {
  layout: CustomLayoutTokens;
  nav: CustomNavTokens;
  footer: CustomFooterTokens;
  surface: CustomSurfaceTokens;
  kpi: CustomKpiTokens;
  table: CustomTableTokens;
  form: CustomFormTokens;
  overlay: CustomOverlayTokens;
  typographyComplements: CustomTypographyComplementsTokens;
  status: CustomStatusTokens;
  chart: CustomChartTokens;
  editor: CustomEditorTokens;
  dataviz: CustomDatavizTokens;
}

/**
 * Thème résolu de l’application : `custom` est toujours défini pour le retour de `getTheme`.
 * Dans les composants : `const theme = useTheme<AppTheme>();` puis `theme.custom` sans `?.`.
 *
 * On ne rend pas `Theme.custom` obligatoire dans l’augmentation globale : le premier
 * `createTheme({ ... })` interne ne fournit pas encore `custom`, ce qui ferait échouer le typage.
 */
export type AppTheme = Omit<MuiTheme, "custom"> & { custom: AppCustomTokens };

// Augmentation MUI — `custom` reste optionnel sur `Theme` pour compatibilité avec `createTheme`
declare module "@mui/material/styles" {
  interface Theme {
    custom?: AppCustomTokens;
  }
  interface ThemeOptions {
    custom?: AppCustomTokens | Partial<AppCustomTokens>;
  }
}

export {};
