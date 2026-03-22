// ui_rap_app_mui/src/components/PageTemplate.tsx
import React from "react";
import { Box, Stack, Typography, Button, IconButton, Collapse, Tooltip } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import PageWrapper from "./PageWrapper";
import PageSection from "./PageSection";

export type PageTemplateProps = {
  title: string;
  subtitle?: string;
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
  actions,
  actionsRight,
  backButton = false,
  onBack,
  refreshButton = false,
  onRefresh,
  filters,
  showFilters = true,
  children,
  footer,
  centered = false,
  headerExtra,
}: PageTemplateProps) {
  const handleBack = () => {
    if (typeof onBack === "function") {
      onBack();
    } else if (window.history.length > 1) {
      window.history.back();
    }
  };

  return (
    <PageWrapper>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        mb={2}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
      >
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          sx={{ flexGrow: 1, minWidth: 0 }}
        >
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

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            {title && (
              <Tooltip title={title} disableInteractive>
                <Typography variant="h5" component="h1" noWrap sx={{ fontWeight: 600 }}>
                  {title}
                </Typography>
              </Tooltip>
            )}

            {subtitle && (
              <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: "100%" }}>
                {subtitle}
              </Typography>
            )}

            {headerExtra && <Box mt={0.5}>{headerExtra}</Box>}
          </Box>

          {refreshButton && (
            <IconButton onClick={onRefresh} aria-label="Rafraîchir" size="small">
              <RefreshIcon aria-hidden />
            </IconButton>
          )}
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          {actions}
          {actionsRight}
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
        <Box component="footer" mt={2}>
          {footer}
        </Box>
      )}
    </PageWrapper>
  );
}

// ✅ Empêche les re-renders inutiles du layout
export default React.memo(PageTemplate);
