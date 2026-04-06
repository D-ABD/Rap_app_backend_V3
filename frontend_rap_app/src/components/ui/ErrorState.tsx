import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import { Alert, Button, Paper, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

type ErrorStateProps = {
  title?: ReactNode;
  message?: ReactNode;
  details?: ReactNode;
  retryLabel?: string;
  onRetry?: () => void;
};

export default function ErrorState({
  title = "Une erreur est survenue",
  message = "Le contenu n'a pas pu etre charge.",
  details,
  retryLabel = "Reessayer",
  onRetry,
}: ErrorStateProps) {
  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <ErrorOutlineRoundedIcon color="error" />
          <Typography variant="h6">{title}</Typography>
        </Stack>

        <Alert severity="error" variant="outlined">
          {message}
        </Alert>

        {details ? (
          <Typography variant="body2" color="text.secondary">
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
