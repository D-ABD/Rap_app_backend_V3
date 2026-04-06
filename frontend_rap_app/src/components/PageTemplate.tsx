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
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import PageWrapper from "./PageWrapper";
import PageSection from "./PageSection";

export type PageTemplateProps = {
  title: React.ReactNode;
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
        spacing={2}
        mb={2}
        sx={
          hero
            ? {
                p: { xs: 2, sm: 2.5 },
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                background: (theme) =>
                  theme.palette.mode === "light"
                    ? "linear-gradient(180deg, rgba(99,102,241,0.08) 0%, rgba(255,255,255,0.9) 100%)"
                    : "linear-gradient(180deg, rgba(99,102,241,0.18) 0%, rgba(17,24,39,0.92) 100%)",
              }
            : undefined
        }
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", md: "flex-start" }}
          justifyContent="space-between"
        >
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" mb={0.75}>
              {backButton && (
                <Button
                  startIcon={<ArrowBackIcon aria-hidden />}
                  onClick={handleBack}
                  variant="outlined"
                  size="small"
                  aria-label="Revenir à la page précédente"
                >
                  Retour
                </Button>
              )}

              {refreshButton && (
                <IconButton onClick={onRefresh} aria-label="Rafraîchir" size="small">
                  <RefreshIcon aria-hidden />
                </IconButton>
              )}
            </Stack>

            {eyebrow ? (
              <Typography
                variant="overline"
                component="div"
                color="primary.main"
                sx={{ fontWeight: 700, letterSpacing: "0.08em", mb: 0.5 }}
              >
                {eyebrow}
              </Typography>
            ) : null}

            {title && (
              <Tooltip title={typeof title === "string" ? title : ""} disableInteractive>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 700, lineHeight: 1.15 }}>
                  {title}
                </Typography>
              </Tooltip>
            )}

            {subtitle && (
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ maxWidth: { xs: "100%", md: 820 }, mt: 0.75 }}
              >
                {subtitle}
              </Typography>
            )}

            {headerExtra && <Box mt={1.25}>{headerExtra}</Box>}
          </Box>

          {(actions || actionsRight) && (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ xs: "stretch", sm: "center" }}
              justifyContent="flex-end"
              useFlexGap
              sx={{ minWidth: { md: 220 } }}
            >
              {actions}
              {actionsRight}
            </Stack>
          )}
        </Stack>
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
        <Box component="footer" mt={2} sx={contentSx}>
          {footer}
        </Box>
      )}
    </PageWrapper>
  );
}

// ✅ Empêche les re-renders inutiles du layout
export default React.memo(PageTemplate);
