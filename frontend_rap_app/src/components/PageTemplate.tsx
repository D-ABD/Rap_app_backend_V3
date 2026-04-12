// ui_rap_app_mui/src/components/PageTemplate.tsx
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
  type Theme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import PageWrapper from "./PageWrapper";
import PageSection from "./PageSection";

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
  showFilters?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  centered?: boolean;
  headerExtra?: React.ReactNode;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
  fullWidth?: boolean;
  hero?: boolean;
  contentSx?: SxProps<Theme>;
};

const centeredBoxStyles = {
  minHeight: "50vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  gap: 2,
} as const;

const headerSurfaceSx = {
  px: { xs: 0.25, sm: 0.5 },
  py: { xs: 0.25, sm: 0.4 },
} as const;

const headerInnerSurfaceSx = {
  px: { xs: 1, sm: 1.2, lg: 1.4 },
  py: { xs: 0.9, sm: 1.05 },
  borderRadius: 3,
  border: "1px solid",
  borderColor: "divider",
  backgroundColor: "background.paper",
  boxShadow: (theme: Theme) =>
    theme.palette.mode === "light"
      ? `0 10px 24px ${alpha(theme.palette.common.black, 0.035)}`
      : `0 14px 28px ${alpha(theme.palette.common.black, 0.14)}`,
} as const;

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
  showFilters = true,
  children,
  footer,
  centered = false,
  headerExtra,
  maxWidth = "lg",
  fullWidth = false,
  hero = false,
  contentSx,
}: PageTemplateProps) {
  const handleBack = () => {
    if (typeof onBack === "function") {
      onBack();
    } else if (window.history.length > 1) {
      window.history.back();
    }
  };

  return (
    <PageWrapper maxWidth={maxWidth} fullWidth={fullWidth}>
      <Stack
        direction="column"
        spacing={1.25}
        mb={1.35}
        sx={{
          ...headerSurfaceSx,
          ...(hero
            ? {
                px: { xs: 1.25, sm: 1.5, lg: 1.75 },
                py: { xs: 1.1, sm: 1.25, lg: 1.5 },
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                background: (theme: Theme) =>
                  theme.palette.mode === "light"
                    ? `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.background.paper, 0.98)} 100%)`
                    : `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.14)} 0%, ${alpha(theme.palette.background.paper, 0.98)} 100%)`,
              }
            : {}),
        }}
      >
        <Box
          sx={{
            ...headerInnerSurfaceSx,
            ...(hero
              ? {
                  px: { xs: 1.1, sm: 1.35, lg: 1.6 },
                  py: { xs: 1, sm: 1.15, lg: 1.3 },
                  backgroundColor: "transparent",
                  boxShadow: "none",
                }
              : {}),
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={{ xs: 1.25, md: 1.5 }}
            alignItems={{ xs: "stretch", md: "flex-start" }}
            justifyContent="space-between"
            sx={{
              flexWrap: "wrap",
              rowGap: 1,
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
                spacing={1}
                alignItems="center"
                flexWrap="wrap"
                useFlexGap
                mb={0.35}
              >
                {backButton && (
                  <Button
                    startIcon={<ArrowBackIcon aria-hidden />}
                    onClick={handleBack}
                    variant="outlined"
                    size="small"
                    aria-label="Revenir à la page précédente"
                    sx={{
                      minHeight: 30,
                      fontSize: "0.8rem",
                      borderRadius: 999,
                      px: 1,
                      borderColor: "divider",
                      "&:hover": {
                        borderColor: "primary.main",
                        backgroundColor: (theme) =>
                          alpha(theme.palette.primary.main, theme.palette.mode === "light" ? 0.06 : 0.14),
                      },
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
                      width: 30,
                      height: 30,
                      border: "1px solid",
                      borderColor: "divider",
                      "&:hover": {
                        borderColor: "primary.main",
                        backgroundColor: (theme) =>
                          alpha(theme.palette.primary.main, theme.palette.mode === "light" ? 0.06 : 0.14),
                      },
                    }}
                  >
                    <RefreshIcon aria-hidden />
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
                    px: 1,
                    py: 0.4,
                    borderRadius: 999,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    mb: 0.45,
                    backgroundColor: (theme) =>
                      alpha(theme.palette.primary.main, theme.palette.mode === "light" ? 0.1 : 0.18),
                    border: "1px solid",
                    borderColor: (theme) =>
                      alpha(theme.palette.primary.main, theme.palette.mode === "light" ? 0.14 : 0.22),
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
                      lineHeight: 1.1,
                      letterSpacing: "-0.03em",
                      fontSize: { xs: "1.3rem", sm: "1.55rem", md: "1.8rem" },
                      maxWidth: { xs: "100%", md: 900 },
                    }}
                  >
                    {title}
                  </Typography>
                </Tooltip>
              )}

              {subtitle && (
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{
                    maxWidth: { xs: "100%", md: 820 },
                    mt: 0.45,
                    fontSize: { xs: "0.9rem", sm: "0.94rem" },
                    lineHeight: 1.5,
                  }}
                >
                  {subtitle}
                </Typography>
              )}

              {headerExtra && <Box mt={{ xs: 0.8, sm: 0.95 }}>{headerExtra}</Box>}
            </Box>

            {(actions || actionsRight) && (
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                alignItems={{ xs: "stretch", sm: "center" }}
                justifyContent="flex-end"
                useFlexGap
                sx={{
                  width: { xs: "100%", md: "auto" },
                  maxWidth: "100%",
                  minWidth: { xs: 0, md: 240 },
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

      {filters && (
        <Collapse in={showFilters} unmountOnExit>
          <PageSection>{filters}</PageSection>
        </Collapse>
      )}

      <PageSection>
        {centered ? <Box sx={centeredBoxStyles}>{children}</Box> : children}
      </PageSection>

      {footer && (
        <Box component="footer" mt={1.5} sx={contentSx}>
          {footer}
        </Box>
      )}
    </PageWrapper>
  );
}

// ✅ Empêche les re-renders inutiles du layout
export default React.memo(PageTemplate);
