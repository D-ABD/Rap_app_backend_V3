import InboxRoundedIcon from "@mui/icons-material/InboxRounded";
import { Box, Paper, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

type EmptyStateProps = {
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
};

export default function EmptyState({
  title = "Aucun resultat",
  description = "Aucune donnee n'est disponible pour le moment.",
  icon,
  action,
  compact = false,
}: EmptyStateProps) {
  const resolvedIcon = icon ?? <InboxRoundedIcon sx={{ fontSize: compact ? 40 : 56 }} color="disabled" />;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: compact ? 3 : 4,
        borderRadius: 3,
        textAlign: "center",
        backgroundColor: "background.paper",
      }}
    >
      <Stack spacing={1.5} alignItems="center" justifyContent="center">
        <Box
          sx={{
            width: compact ? 64 : 80,
            height: compact ? 64 : 80,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            backgroundColor: "action.hover",
          }}
        >
          {resolvedIcon}
        </Box>

        <Typography variant={compact ? "h6" : "h5"}>{title}</Typography>

        {description ? (
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520 }}>
            {description}
          </Typography>
        ) : null}

        {action}
      </Stack>
    </Paper>
  );
}
