// src/components/dashboard/ChartCard.tsx
import {
  Box,
  Card,
  Divider,
  LinearProgress,
  Typography,
  useTheme,
  Stack,
} from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";
import type { AppTheme } from "../../theme";

export type ChartCardProps = {
  title: string;
  subtitle?: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
  loading?: boolean;
  error?: string | null;
  isFetching?: boolean;
  titleColor?: string;
  minHeight?: number | string;
  sx?: SxProps<Theme>;
};

export default function ChartCard({
  title,
  subtitle,
  headerActions,
  children,
  loading,
  error,
  isFetching,
  titleColor = "text.secondary",
  minHeight,
  sx,
}: ChartCardProps) {
  const theme = useTheme<AppTheme>();
  const tokens = theme.custom.dashboard.chartCard;

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: tokens.borderRadius,
        p: tokens.padding,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing(tokens.gap),
        height: "100%",
        minHeight: tokens.minHeight,
        boxShadow: tokens.boxShadowRest,
        transition: theme.transitions.create(["box-shadow"], {
          duration: theme.transitions.duration.shorter,
        }),
        "&:hover": {
          boxShadow: tokens.boxShadowHover,
        },
        ...sx,
      }}
    >
      {isFetching ? <LinearProgress /> : null}

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
      >
        <Box>
          <Typography variant="subtitle1" color={titleColor}>
            {title}
          </Typography>

          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>

        {headerActions && (
          <Box display="flex" gap={1} flexWrap="wrap">
            {headerActions}
          </Box>
        )}
      </Stack>

      <Divider />

      {loading ? (
        <Typography variant="body2" color="text.secondary">
          Chargement…
        </Typography>
      ) : error ? (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      ) : (
        <Box sx={{ minHeight }}>{children}</Box>
      )}
    </Card>
  );
}