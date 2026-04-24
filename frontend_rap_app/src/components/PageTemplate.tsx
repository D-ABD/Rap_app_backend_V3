// src/components/PageTemplate.tsx
import React from "react";
import {
  Box,
  Stack,
  Typography,
  Button,
  IconButton,
  Collapse,
  Tooltip,
  type SxProps,
  useTheme,
} from "@mui/material";
import type { Theme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import PageWrapper from "./PageWrapper";
import PageSection from "./PageSection";
import type { AppTheme } from "../theme";

export type PageTemplateProps = {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  actionsRight?: React.ReactNode;
  backButton?: boolean;
  onBack?: () => void;
  refreshButton?: boolean;
  onRefresh?: () => void;
  filters?: React.ReactNode;
  filtersActions?: React.ReactNode;
  showFilters?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  centered?: boolean;
  headerExtra?: React.ReactNode;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
  fullWidth?: boolean;
  hero?: boolean;
  contentSx?: SxProps<Theme>;
  density?: "default" | "compact";
};

function PageTemplate({
  title,
  subtitle,
  eyebrow,
  actions,
  actionsRight,
  backButton = true,
  onBack,
  refreshButton = false,
  onRefresh,
  filters,
  filtersActions,
  showFilters = true,
  children,
  footer,
  centered = false,
  headerExtra,
  maxWidth = "lg",
  fullWidth = false,
  hero = false,
  contentSx,
  density = "default",
}: PageTemplateProps) {
  const theme = useTheme<AppTheme>();
  const isCompact = density === "compact";

  const headerOuter = theme.custom.surface.pageHeader.outer;
  const headerInner = theme.custom.surface.pageHeader.inner;
  const typographyComplements = theme.custom.typographyComplements;
  const templateTokens = theme.custom.page.template;
  const controlsTokens = templateTokens.header.controls;
  const heroTokens = templateTokens.header.hero;
  const titleTokens = templateTokens.header.title;
  const subtitleTokens = templateTokens.header.subtitle;
  const actionsTokens = templateTokens.header.actions;
  const centeredTokens = templateTokens.centered;

  const handleBack = () => {
    if (typeof onBack === "function") {
      onBack();
    } else if (window.history.length > 1) {
      window.history.back();
    }
  };

  const interactiveHoverBg = alpha(
    theme.palette.primary.main,
    theme.palette.mode === "light"
      ? controlsTokens.hoverAlpha.light
      : controlsTokens.hoverAlpha.dark
  );

  const eyebrowBg = alpha(
    theme.palette.primary.main,
    theme.palette.mode === "light" ? 0.1 : 0.18
  );

  const eyebrowBorder = alpha(
    theme.palette.primary.main,
    theme.palette.mode === "light" ? 0.14 : 0.22
  );

  const heroBackground =
    theme.palette.mode === "light"
      ? heroTokens.background.light
      : heroTokens.background.dark;

  const controlMinHeight = theme.spacing(
    isCompact ? controlsTokens.minHeight.compact : controlsTokens.minHeight.default
  );

  const controlMinSize = theme.spacing(
    isCompact ? controlsTokens.minSize.compact : controlsTokens.minSize.default
  );

  const controlRadius = theme.shape.borderRadius * controlsTokens.radiusMultiplier;

  const centeredBoxSx: SxProps<Theme> = {
    minHeight: centeredTokens.minHeight,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    gap: theme.spacing(centeredTokens.gap),
  };

  const actionControlSx: SxProps<Theme> = {
    minHeight: controlMinHeight,
    borderRadius: controlRadius,
    borderColor: "divider",
    "&:hover": {
      borderColor: "primary.main",
      backgroundColor: interactiveHoverBg,
    },
  };

  const heroOuterPaddingX = isCompact
    ? heroTokens.outerPaddingX.compact
    : heroTokens.outerPaddingX.default;
  const heroOuterPaddingY = isCompact
    ? heroTokens.outerPaddingY.compact
    : heroTokens.outerPaddingY.default;
  const heroInnerPaddingX = isCompact
    ? heroTokens.innerPaddingX.compact
    : heroTokens.innerPaddingX.default;
  const heroInnerPaddingY = isCompact
    ? heroTokens.innerPaddingY.compact
    : heroTokens.innerPaddingY.default;

  return (
    <PageWrapper maxWidth={maxWidth} fullWidth={fullWidth} density={density}>
      <Stack
        direction="column"
        spacing={isCompact ? 1 : 1.5}
        mb={isCompact ? 1 : 1.5}
        sx={{
          px: hero ? heroOuterPaddingX : headerOuter.paddingX,
          py: hero ? heroOuterPaddingY : headerOuter.paddingY,
          ...(hero
            ? {
                borderRadius: theme.shape.borderRadius,
                border: `${headerInner.border.width} ${headerInner.border.style}`,
                borderColor: "divider",
                background: heroBackground,
              }
            : {}),
        }}
      >
        <Box
          sx={{
            px: hero ? heroInnerPaddingX : headerInner.paddingX,
            py: hero ? heroInnerPaddingY : headerInner.paddingY,
            borderRadius: headerInner.shape.borderRadiusSx,
            border: `${headerInner.border.width} ${headerInner.border.style}`,
            borderColor: headerInner.border.color,
            backgroundColor: hero ? "transparent" : "background.paper",
            boxShadow: hero ? "none" : headerInner.boxShadow,

            ...(isCompact && !hero
              ? {
                  px: { xs: 1, sm: 1.125, lg: 1.25 },
                  py: { xs: 0.875, sm: 1 },
                }
              : {}),
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={{ xs: isCompact ? 1 : 1.25, md: isCompact ? 1.25 : 1.5 }}
            alignItems={{ xs: "stretch", md: "flex-start" }}
            justifyContent="space-between"
            sx={{
              flexWrap: "wrap",
              rowGap: isCompact ? 1 : 1.25,
            }}
          >
            <Box
              sx={{
                flexGrow: 1,
                minWidth: 0,
                flexBasis: { xs: "100%", md: "min(720px, 100%)" },
              }}
            >
              <Stack
                direction="row"
                spacing={isCompact ? 0.75 : 1}
                alignItems="center"
                flexWrap="wrap"
                useFlexGap
                mb={isCompact ? 0.5 : 0.75}
              >
                {backButton && (
                  <Button
                    startIcon={<ArrowBackIcon aria-hidden />}
                    onClick={handleBack}
                    variant="outlined"
                    size="small"
                    aria-label="Revenir à la page précédente"
                    sx={{
                      ...actionControlSx,
                      px: isCompact ? 1 : 1.25,
                      ...theme.typography.caption,
                      fontWeight: theme.typography.button.fontWeight,
                    }}
                  >
                    Retour
                  </Button>
                )}

                {refreshButton && (
                  <IconButton
                    onClick={onRefresh}
                    aria-label="Rafraîchir"
                    size="small"
                    sx={{
                      ...actionControlSx,
                      width: controlMinSize,
                      height: controlMinSize,
                      border: `${headerInner.border.width} ${headerInner.border.style}`,
                    }}
                  >
                    <RefreshIcon fontSize="small" aria-hidden />
                  </IconButton>
                )}
              </Stack>

              {eyebrow ? (
                <Typography
                  variant="overline"
                  component="div"
                  color="primary.main"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    px: isCompact ? 1 : 1.25,
                    py: isCompact ? 0.375 : 0.5,
                    borderRadius: controlRadius,
                    fontWeight: 800,
                    letterSpacing: typographyComplements.eyebrowLetterSpacing,
                    mb: isCompact ? 0.5 : 0.75,
                    lineHeight: 1.2,
                    backgroundColor: eyebrowBg,
                    border: `${headerInner.border.width} ${headerInner.border.style}`,
                    borderColor: eyebrowBorder,
                  }}
                >
                  {eyebrow}
                </Typography>
              ) : null}

              {title && (
                <Tooltip title={typeof title === "string" ? title : ""} disableInteractive>
                  <Typography
                    variant="h4"
                    component="h1"
                    sx={{
                      fontWeight: 800,
                      lineHeight: isCompact
                        ? titleTokens.lineHeight.compact
                        : titleTokens.lineHeight.default,
                      letterSpacing: typographyComplements.pageTitleLetterSpacing,
                      fontSize: isCompact
                        ? titleTokens.fontSize.compact
                        : titleTokens.fontSize.default,
                      maxWidth: titleTokens.maxWidth,
                    }}
                  >
                    {title}
                  </Typography>
                </Tooltip>
              )}

              {subtitle && (
                <Typography
                  variant={isCompact ? subtitleTokens.variant.compact : subtitleTokens.variant.default}
                  color="text.secondary"
                  sx={{
                    maxWidth: subtitleTokens.maxWidth,
                    mt: isCompact
                      ? subtitleTokens.marginTop.compact
                      : subtitleTokens.marginTop.default,
                    lineHeight: isCompact
                      ? subtitleTokens.lineHeight.compact
                      : subtitleTokens.lineHeight.default,
                  }}
                >
                  {subtitle}
                </Typography>
              )}

              {headerExtra && (
                <Box mt={{ xs: isCompact ? 0.75 : 1, sm: isCompact ? 1 : 1.25 }}>
                  {headerExtra}
                </Box>
              )}
            </Box>

            {(actions || actionsRight) && (
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={isCompact ? actionsTokens.gap.compact : actionsTokens.gap.default}
                alignItems={{ xs: "stretch", sm: "center" }}
                justifyContent="flex-end"
                useFlexGap
                sx={{
                  width: { xs: "100%", md: "auto" },
                  maxWidth: "100%",
                  minWidth: {
                    xs: 0,
                    md: theme.spacing(
                      isCompact ? actionsTokens.minWidth.compact : actionsTokens.minWidth.default
                    ),
                  },
                  flexShrink: 1,
                  alignSelf: { xs: "stretch", md: "center" },
                  flexWrap: "wrap",
                  p: 0,
                  "& > *": {
                    minWidth: 0,
                    maxWidth: "100%",
                  },
                }}
              >
                {actions}
                {actionsRight}
              </Stack>
            )}
          </Stack>
        </Box>
      </Stack>

      {(filters || filtersActions) && (
        <Collapse in={showFilters} unmountOnExit>
          <PageSection density={density}>
            <Stack spacing={isCompact ? 0.75 : 1}>
              {filtersActions && (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: isCompact ? theme.spacing(0.75) : theme.spacing(1),
                  }}
                >
                  {filtersActions}
                </Box>
              )}

              {filters ? <Box>{filters}</Box> : null}
            </Stack>
          </PageSection>
        </Collapse>
      )}

      <PageSection density={density} sx={contentSx}>
        {centered ? <Box sx={centeredBoxSx}>{children}</Box> : children}
      </PageSection>

      {footer && (
        <Box component="footer" mt={isCompact ? 1 : 1.5}>
          {footer}
        </Box>
      )}
    </PageWrapper>
  );
}

export default React.memo(PageTemplate);