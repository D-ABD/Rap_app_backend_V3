import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import { Alert, Button, Paper, Stack, Typography, useTheme } from "@mui/material";
import type { ReactNode } from "react";
import type { AppTheme } from "../../theme";

type ErrorStateProps = {
  title?: ReactNode;
  message?: ReactNode;
  details?: ReactNode;
  retryLabel?: string;
  onRetry?: () => void;
};

export default function ErrorState({
  title = "Une erreur est survenue",
  message = "Le contenu n'a pas pu être chargé.",
  details,
  retryLabel = "Réessayer",
  onRetry,
}: ErrorStateProps) {
  const theme = useTheme<AppTheme>();
  const tokens = theme.custom.feedback.errorState;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: tokens.padding,
        borderRadius: tokens.borderRadius,
      }}
    >
      <Stack spacing={tokens.gap}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <ErrorOutlineRoundedIcon
            color="error"
            sx={tokens.iconSize ? { fontSize: tokens.iconSize } : undefined}
          />
          <Typography variant="h6" component="div">
            {title}
          </Typography>
        </Stack>

        <Alert severity="error" variant="outlined">
          {message}
        </Alert>

        {details ? (
          <Typography variant="body2" color="text.secondary" component="div">
            {details}
          </Typography>
        ) : null}

        {onRetry ? (
          <Stack direction="row" justifyContent="flex-start">
            <Button variant="contained" onClick={onRetry}>
              {retryLabel}
            </Button>
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
}