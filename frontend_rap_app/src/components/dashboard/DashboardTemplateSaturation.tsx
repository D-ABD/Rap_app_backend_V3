// src/components/dashboard/DashboardTemplateSaturation.tsx
import * as React from "react";
import { Card, Box, Typography, Divider, LinearProgress } from "@mui/material";

type Props = {
  title: string;
  toneColor?: string;
  isFetching?: boolean;
  isLoading?: boolean;
  error?: string | null;
  filters?: React.ReactNode;
  children: React.ReactNode;
};

export default function DashboardTemplateSaturation({
  title,
  toneColor = "text.secondary",
  isFetching,
  isLoading,
  error,
  filters,
  children,
}: Props) {
  return (
    <Card
      elevation={3}
      sx={{
        p: 2,
        borderRadius: 3,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        height: "100%", // homogénéité des tailles
      }}
    >
      {isFetching && <LinearProgress sx={{ borderRadius: 1 }} />}

      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
      >
        <Typography variant="subtitle1" fontWeight="bold" color={toneColor}>
          {title}
        </Typography>
        {filters && (
          <Box display="flex" gap={1} flexWrap="wrap">
            {filters}
          </Box>
        )}
      </Box>

      <Divider />

      {/* Contenu */}
      {isLoading ? (
        <Typography variant="body2" color="text.secondary">
          Chargement…
        </Typography>
      ) : error ? (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      ) : (
        children
      )}
    </Card>
  );
}
