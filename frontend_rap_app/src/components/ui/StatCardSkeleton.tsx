import { Grid, Paper, Skeleton, Stack, useTheme } from "@mui/material";
import type { AppTheme } from "../../theme";

type StatCardSkeletonProps = {
  count?: number;
};

export default function StatCardSkeleton({
  count = 3,
}: StatCardSkeletonProps) {
  const theme = useTheme<AppTheme>();
  const cardTokens = theme.custom.dashboard.statCard;

  const backgroundColor =
    theme.palette.mode === "light"
      ? theme.custom.surface.muted.background.light
      : theme.custom.surface.muted.background.dark;

  return (
    <Grid container spacing={2}>
      {Array.from({ length: count }).map((_, index) => (
        <Grid item xs={12} sm={6} md={4} key={index}>
          <Paper
            variant="outlined"
            sx={{
              p: cardTokens.padding,
              borderRadius: cardTokens.borderRadius,
              minHeight: cardTokens.minHeight,
              backgroundColor,
              boxShadow: cardTokens.boxShadowRest,
              display: "flex",
              alignItems: "center",
            }}
          >
            <Stack spacing={cardTokens.gap} sx={{ width: "100%" }}>
              <Skeleton variant="text" width="48%" height={22} />
              <Skeleton variant="text" width="32%" height={40} />
              <Skeleton variant="rounded" height={12} width="100%" />
            </Stack>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}