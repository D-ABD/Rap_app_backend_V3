import { Paper, Skeleton, Stack, useTheme } from "@mui/material";
import type { AppTheme } from "../../theme";

type TableSkeletonProps = {
  rows?: number;
  columns?: number;
  showToolbar?: boolean;
  density?: "default" | "compact";
};

export default function TableSkeleton({
  rows = 6,
  columns = 5,
  showToolbar = true,
  density = "default",
}: TableSkeletonProps) {
  const theme = useTheme<AppTheme>();
  const densityTokens = theme.custom.table.densities?.[density];
  const spacingTokens = densityTokens?.spacing;
  const sizingTokens = densityTokens?.sizing;

  const cardPadding = theme.custom.page.section[density].padding;
  const radius = theme.custom.table.mobileCard.borderRadius;
  const rowHeight = sizingTokens?.rowMinHeight ?? 44;
  const actionHeight = sizingTokens?.actionSize ?? 32;
  const stackGap = spacingTokens?.stackGap ?? 0.5;
  const inlineGap = spacingTokens?.inlineGap ?? 0.5;

  const mutedBackground =
    theme.palette.mode === "light"
      ? theme.custom.surface.muted.background.light
      : theme.custom.surface.muted.background.dark;

  const headerHeight = density === "compact" ? 24 : 28;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: cardPadding,
        borderRadius: radius,
        backgroundColor: mutedBackground,
        boxShadow: "none",
      }}
    >
      <Stack spacing={stackGap}>
        {showToolbar ? (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={inlineGap}>
            <Skeleton variant="rounded" height={actionHeight + 8} sx={{ flex: 1 }} />
            <Skeleton variant="rounded" height={actionHeight + 8} width={140} />
            <Skeleton variant="rounded" height={actionHeight + 8} width={180} />
          </Stack>
        ) : null}

        <Stack spacing={inlineGap}>
          <Stack direction="row" spacing={inlineGap}>
            {Array.from({ length: columns }).map((_, index) => (
              <Skeleton
                key={`header-${index}`}
                variant="rounded"
                height={headerHeight}
                sx={{ flex: 1 }}
              />
            ))}
          </Stack>

          {Array.from({ length: rows }).map((_, rowIndex) => (
            <Stack key={`row-${rowIndex}`} direction="row" spacing={inlineGap}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton
                  key={`cell-${rowIndex}-${colIndex}`}
                  variant="rounded"
                  height={rowHeight}
                  sx={{ flex: 1 }}
                />
              ))}
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}