import { Box, CircularProgress, Paper, Stack, Typography, useTheme } from "@mui/material";
import type { ReactNode } from "react";
import type { AppTheme } from "../../theme";

type LoadingStateProps = {
  label?: ReactNode;
  minHeight?: number | string;
  inline?: boolean;
};

export default function LoadingState({
  label = "Chargement en cours...",
  minHeight = 220,
  inline = false,
}: LoadingStateProps) {
  const theme = useTheme<AppTheme>();
  const elevatedTokens = theme.custom.surface.elevated;
  const mutedBackground =
    theme.palette.mode === "light"
      ? theme.custom.surface.muted.background.light
      : theme.custom.surface.muted.background.dark;

  const content = (
    <Stack spacing={2} alignItems="center" justifyContent="center">
      <CircularProgress />
      {label ? (
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {label}
        </Typography>
      ) : null}
    </Stack>
  );

  if (inline) {
    return (
      <Box
        sx={{
          py: { xs: 2.5, sm: 3 },
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
        }}
      >
        {content}
      </Box>
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        minHeight,
        borderRadius: theme.custom.page.section.default.borderRadius,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: theme.custom.page.section.default.padding,
        backgroundColor: mutedBackground,
        boxShadow: elevatedTokens.boxShadowRest,
      }}
    >
      {content}
    </Paper>
  );
}