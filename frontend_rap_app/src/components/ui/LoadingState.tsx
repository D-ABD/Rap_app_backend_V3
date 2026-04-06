import { Box, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

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
  const content = (
    <Stack spacing={2} alignItems="center" justifyContent="center">
      <CircularProgress />
      {label ? (
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      ) : null}
    </Stack>
  );

  if (inline) {
    return (
      <Box sx={{ py: 3, display: "flex", justifyContent: "center", alignItems: "center" }}>
        {content}
      </Box>
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        minHeight,
        borderRadius: 3,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
      }}
    >
      {content}
    </Paper>
  );
}
