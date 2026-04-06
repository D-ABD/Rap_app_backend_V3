import { Box, Card, Divider, LinearProgress, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";

export type ChartCardProps = {
  title: string;
  subtitle?: ReactNode;
  /** Zone à droite du titre (filtres, icônes) */
  headerActions?: ReactNode;
  children: ReactNode;
  loading?: boolean;
  error?: string | null;
  isFetching?: boolean;
  /** Couleur du titre (token MUI ou CSS) */
  titleColor?: string;
  minHeight?: number | string;
  sx?: SxProps<Theme>;
};

/**
 * Carte « zone graphique / indicateur » pour dashboards : en-tête + séparateur + contenu.
 * Les états loading / error sont purement présentatifs (données fournies par le parent).
 */
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
  return (
    <Card
      elevation={3}
      sx={{
        p: 2,
        borderRadius: 3,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        height: "100%",
        ...sx,
      }}
    >
      {isFetching ? <LinearProgress sx={{ borderRadius: 1 }} /> : null}

      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
      >
        <Box>
          <Typography variant="subtitle1" fontWeight="bold" color={titleColor}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="caption" color="text.secondary" display="block">
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        {headerActions ? (
          <Box display="flex" gap={1} flexWrap="wrap">
            {headerActions}
          </Box>
        ) : null}
      </Box>

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
