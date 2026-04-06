import { Grid, Paper, Skeleton, Stack } from "@mui/material";

type StatCardSkeletonProps = {
  count?: number;
};

export default function StatCardSkeleton({ count = 3 }: StatCardSkeletonProps) {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: count }).map((_, index) => (
        <Grid item xs={12} sm={6} md={4} key={index}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Stack spacing={1.5}>
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
