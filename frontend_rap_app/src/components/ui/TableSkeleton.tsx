import { Paper, Skeleton, Stack } from "@mui/material";

type TableSkeletonProps = {
  rows?: number;
  columns?: number;
  showToolbar?: boolean;
};

export default function TableSkeleton({
  rows = 6,
  columns = 5,
  showToolbar = true,
}: TableSkeletonProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
      <Stack spacing={2}>
        {showToolbar ? (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Skeleton variant="rounded" height={40} sx={{ flex: 1 }} />
            <Skeleton variant="rounded" height={40} width={140} />
            <Skeleton variant="rounded" height={40} width={180} />
          </Stack>
        ) : null}

        <Stack spacing={1}>
          <Stack direction="row" spacing={1}>
            {Array.from({ length: columns }).map((_, index) => (
              <Skeleton
                key={`header-${index}`}
                variant="rounded"
                height={28}
                sx={{ flex: 1 }}
              />
            ))}
          </Stack>

          {Array.from({ length: rows }).map((_, rowIndex) => (
            <Stack key={`row-${rowIndex}`} direction="row" spacing={1}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton
                  key={`cell-${rowIndex}-${colIndex}`}
                  variant="rounded"
                  height={44}
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
