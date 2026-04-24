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
  /** Blur global du shell */
  backdropBlur: string;
}

export interface CustomLayoutAppBarTokens {
  /** Blur normalisé de l’AppBar */
  backdropBlur: string;
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
  appBar: CustomLayoutAppBarTokens;
  main: CustomLayoutMainContentTokens;
}

/** --- Navigation : item de tiroir (liste latérale) --- */
export interface NavDrawerItemSizingTokens {
  minHeightSx: { root: number; branch: number };
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
  transitionDurationMs: number;
  easing: string;
  sizing: NavDrawerItemSizingTokens;
  spacing: NavDrawerItemSpacingTokens;
  icon: NavDrawerItemIconTokens;
  label: NavDrawerItemLabelTokens;
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
  borderRadiusPill: number;
}

export interface NavTopButtonBorderTokens {
  widthPx: number;
  style: string;
}

export interface NavTopButtonActiveTokens {
  borderWhiteAlpha: LightDark<number>;
  backgroundWhiteAlpha: LightDark<number>;
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
  gradient: LightDark<string>;
}

export interface CustomFooterElevationTokens {
  boxShadow: LightDark<string>;
}

export interface CustomFooterOverlayTokens {
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

/** --- Surfaces --- */
export interface CustomSurfaceGlassTokens {
  blur: string;
  background: LightDark<string>;
  border: LightDark<string>;
}

export interface CustomSurfacePageHeaderOuterTokens {
  paddingX: { xs: number; sm: number };
  paddingY: { xs: number; sm: number };
}

export interface CustomSurfacePageHeaderInnerBorderTokens {
  width: string;
  style: string;
  color: "divider";
}

export interface CustomSurfacePageHeaderInnerShapeTokens {
  borderRadiusSx: number;
}

export interface CustomSurfacePageHeaderInnerTokens {
  paddingX: { xs: number; sm: number; lg: number };
  paddingY: { xs: number; sm: number };
  border: CustomSurfacePageHeaderInnerBorderTokens;
  shape: CustomSurfacePageHeaderInnerShapeTokens;
  boxShadow: string;
}

export interface CustomSurfacePageHeaderTokens {
  outer: CustomSurfacePageHeaderOuterTokens;
  inner: CustomSurfacePageHeaderInnerTokens;
}

export interface CustomSurfaceElevatedTokens {
  boxShadowRest: string;
  boxShadowHover: string;
}

export interface CustomSurfaceMutedTokens {
  background: LightDark<string>;
}

export interface CustomSurfaceTokens {
  glass: CustomSurfaceGlassTokens;
  pageHeader: CustomSurfacePageHeaderTokens;
  elevated: CustomSurfaceElevatedTokens;
  muted: CustomSurfaceMutedTokens;
}

/** --- KPI / tuiles stats --- */
export interface CustomKpiCardBackgroundTokens {
  rest: LightDark<string>;
}

export interface CustomKpiCardElevationTokens {
  rest: LightDark<string>;
  hover: LightDark<string>;
}

export interface CustomKpiHighlightTokens {
  outlineWidthPx: number;
  outlineStyle: string;
}

export interface CustomKpiTokens {
  cardBackground: CustomKpiCardBackgroundTokens;
  elevation: CustomKpiCardElevationTokens;
  highlight: CustomKpiHighlightTokens;
}

/** --- Page wrapper / section / template --- */
export interface CustomPageWrapperPaddingYTokens {
  default: { xs: number; sm: number; lg: number };
  compact: { xs: number; sm: number; lg: number };
}

export interface CustomPageWrapperPaddingXTokens {
  default: { xs: number; sm: number };
  fullWidth: { xs: number; sm: number };
}

export interface CustomPageWrapperOverlayTokens {
  background: LightDark<string>;
  borderRadius: { xs: number; sm: number };
}

export interface CustomPageWrapperTokens {
  paddingY: CustomPageWrapperPaddingYTokens;
  paddingX: CustomPageWrapperPaddingXTokens;
  overlay: CustomPageWrapperOverlayTokens;
}

export interface CustomPageSectionVariantTokens {
  padding: {
    xs: number;
    sm: number;
    lg: number;
  };
  marginBottom: number;
  borderRadius: { xs: number; sm: number };
  overflow: "visible" | "hidden";
  overlayAlpha: { light: number; dark: number };
  overlayStop: string;
  boxShadowRest: string;
  boxShadowHover: string;
}

export interface CustomPageSectionTokens {
  default: CustomPageSectionVariantTokens;
  compact: CustomPageSectionVariantTokens;
}

export interface CustomPageTemplateHeaderControlsTokens {
  minHeight: { default: number; compact: number };
  minSize: { default: number; compact: number };
  radiusMultiplier: number;
  hoverAlpha: { light: number; dark: number };
}

export interface CustomPageTemplateHeaderHeroTokens {
  outerPaddingX: {
    default: { xs: number; sm: number; lg: number };
    compact: { xs: number; sm: number; lg: number };
  };
  outerPaddingY: {
    default: { xs: number; sm: number; lg: number };
    compact: { xs: number; sm: number; lg: number };
  };
  innerPaddingX: {
    default: { xs: number; sm: number; lg: number };
    compact: { xs: number; sm: number; lg: number };
  };
  innerPaddingY: {
    default: { xs: number; sm: number; lg: number };
    compact: { xs: number; sm: number; lg: number };
  };
  background: LightDark<string>;
}

export interface CustomPageTemplateHeaderTitleTokens {
  lineHeight: { default: number; compact: number };
  fontSize: {
    default: { xs: string | number; sm: string | number; md: string | number };
    compact: { xs: string | number; sm: string | number; md: string | number };
  };
  maxWidth: { xs: string; md: string };
}

export interface CustomPageTemplateHeaderSubtitleTokens {
  variant: { default: "body1"; compact: "body2" };
  lineHeight: { default: number; compact: number };
  marginTop: { default: number; compact: number };
  maxWidth: { xs: string; md: string };
}

export interface CustomPageTemplateHeaderActionsTokens {
  minWidth: { default: number; compact: number };
  gap: { default: number; compact: number };
}

export interface CustomPageTemplateCenteredTokens {
  minHeight: string;
  gap: number;
}

export interface CustomPageTemplateTokens {
  header: {
    controls: CustomPageTemplateHeaderControlsTokens;
    hero: CustomPageTemplateHeaderHeroTokens;
    title: CustomPageTemplateHeaderTitleTokens;
    subtitle: CustomPageTemplateHeaderSubtitleTokens;
    actions: CustomPageTemplateHeaderActionsTokens;
  };
  centered: CustomPageTemplateCenteredTokens;
}

export interface CustomPageTokens {
  wrapper: CustomPageWrapperTokens;
  section: CustomPageSectionTokens;
  template: CustomPageTemplateTokens;
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

export interface CustomTableDensityTypographyTokens {
  primaryVariant?: "body1" | "body2";
  secondaryVariant?: "body2" | "caption";
  metaVariant?: "caption";
}

export interface CustomTableDensitySpacingTokens {
  cellPaddingX?: number;
  cellPaddingY?: number;
  headerPaddingX?: number;
  headerPaddingY?: number;
  inlineGap?: number;
  stackGap?: number;
  metaGap?: number;
}

export interface CustomTableDensitySizingTokens {
  rowMinHeight?: number;
  actionSize?: number;
  checkboxSize?: number;
  chipHeight?: number;
  progressHeight?: number;
}

export interface CustomTableDensityRadiusTokens {
  controlSx?: number;
  chipSx?: number;
}

export interface CustomTableDensityTokens {
  spacing?: CustomTableDensitySpacingTokens;
  sizing?: CustomTableDensitySizingTokens;
  radius?: CustomTableDensityRadiusTokens;
  typography?: CustomTableDensityTypographyTokens;
}

export interface CustomTableDensitiesTokens {
  default?: CustomTableDensityTokens;
  compact?: CustomTableDensityTokens;
}

export interface CustomTableContainerTokens {
  maxHeight: string;
  borderRadius: number;
  background: LightDark<string>;
  border: LightDark<string>;
}

export interface CustomTableActionsColumnTokens {
  minWidth: number;
  maxWidth: number;
}

export interface CustomTableStickyTokens {
  shadow: LightDark<string>;
}

export interface CustomTableMobileCardTokens {
  borderRadius: number;
  padding: number;
  titleVariant: "body2" | "caption";
  labelVariant: "caption";
}

export interface CustomTableTokens {
  header: CustomTableHeaderTokens;
  row: CustomTableRowTokens;
  cell: CustomTableCellTokens;
  densities?: CustomTableDensitiesTokens;
  container: CustomTableContainerTokens;
  actionsColumn: CustomTableActionsColumnTokens;
  sticky: CustomTableStickyTokens;
  mobileCard: CustomTableMobileCardTokens;
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

export interface CustomFormSectionCardTokens {
  borderRadius: number;
  padding: { xs: number; sm: number };
  titleGap: number;
  contentGap: number;
  background: LightDark<string>;
  border: LightDark<string>;
}

export interface CustomFormInlineBlockTokens {
  gap: number;
  minHeight: number;
}

export interface CustomFormHelperAreaTokens {
  minHeight: number;
  paddingTop: number;
}

export interface CustomFormTokens {
  section: CustomFormSectionTokens;
  divider: CustomFormDividerTokens;
  sectionCard: CustomFormSectionCardTokens;
  inlineBlock: CustomFormInlineBlockTokens;
  helperArea: CustomFormHelperAreaTokens;
}

/** --- Input search --- */
export interface CustomInputSearchTokens {
  width: string;
  mobileWidth: string;
  focusRing: LightDark<string>;
  placeholderOpacity: number;
}

export interface CustomInputTokens {
  search: CustomInputSearchTokens;
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

/** --- Dialogs --- */
export interface CustomDialogSurfaceTokens {
  borderRadius: number;
  border: LightDark<string>;
  background: LightDark<string>;
  boxShadow: LightDark<string>;
}

export interface CustomDialogTitleTokens {
  paddingX: number;
  paddingY: number;
  minHeight: number;
  borderBottom: LightDark<string>;
}

export interface CustomDialogContentTokens {
  paddingX: number;
  paddingY: number;
}

export interface CustomDialogActionsTokens {
  paddingX: number;
  paddingY: number;
  gap: number;
  borderTop: LightDark<string>;
}

export interface CustomDialogSectionTokens {
  borderRadius: number;
  padding: number;
  background: LightDark<string>;
  border: LightDark<string>;
}

export interface CustomDialogTokens {
  surface: CustomDialogSurfaceTokens;
  title: CustomDialogTitleTokens;
  content: CustomDialogContentTokens;
  actions: CustomDialogActionsTokens;
  section: CustomDialogSectionTokens;
}

/** --- Feedback / états d'interface --- */
export interface CustomFeedbackErrorStateTokens {
  borderRadius: number;
  padding: number;
  gap: number;
  iconSize?: number;
}

export interface CustomFeedbackTokens {
  errorState: CustomFeedbackErrorStateTokens;
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

/** --- Badges --- */
export interface CustomBadgeEtatTokens {
  borderRadius: number;
  fontWeight: number;
  minHeight: number;
  paddingX: number;
  border: LightDark<string>;
}

export interface CustomBadgeTokens {
  etat: CustomBadgeEtatTokens;
}

/** --- Dashboard --- */
export interface CustomDashboardStatCardTokens {
  borderRadius: number;
  minHeight: number;
  padding: { xs: number; sm: number };
  gap: number;
  boxShadowRest: string;
  boxShadowHover: string;
}

export interface CustomDashboardChartCardTokens {
  borderRadius: number;
  minHeight: number;
  padding: { xs: number; sm: number };
  gap: number;
  boxShadowRest: string;
  boxShadowHover: string;
}

export interface CustomDashboardTokens {
  statCard: CustomDashboardStatCardTokens;
  chartCard: CustomDashboardChartCardTokens;
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
  page: CustomPageTokens;
  kpi: CustomKpiTokens;
  table: CustomTableTokens;
  form: CustomFormTokens;
  input: CustomInputTokens;
  overlay: CustomOverlayTokens;
  dialog: CustomDialogTokens;
  feedback: CustomFeedbackTokens;
  typographyComplements: CustomTypographyComplementsTokens;
  status: CustomStatusTokens;
  badge: CustomBadgeTokens;
  dashboard: CustomDashboardTokens;
  chart: CustomChartTokens;
  editor: CustomEditorTokens;
  dataviz: CustomDatavizTokens;
}

/**
 * Thème résolu de l’application : `custom` est toujours défini pour le retour de `getTheme`.
 * Dans les composants : `const theme = useTheme<AppTheme>();` puis `theme.custom` sans `?.`.
 */
export type AppTheme = Omit<MuiTheme, "custom"> & { custom: AppCustomTokens };

declare module "@mui/material/styles" {
  interface Theme {
    custom?: AppCustomTokens;
  }
  interface ThemeOptions {
    custom?: AppCustomTokens | Partial<AppCustomTokens>;
  }
}

export {};