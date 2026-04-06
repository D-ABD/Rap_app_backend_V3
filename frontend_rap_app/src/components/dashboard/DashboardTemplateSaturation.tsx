// src/components/dashboard/DashboardTemplateSaturation.tsx
import * as React from "react";
import ChartCard from "./ChartCard";

type Props = {
  title: string;
  toneColor?: string;
  isFetching?: boolean;
  isLoading?: boolean;
  error?: string | null;
  filters?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Variante tableau de bord pour widgets « saturation / taux ».
 * Délègue la coque visuelle à {@link ChartCard} (Lot 5).
 */
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
    <ChartCard
      title={title}
      titleColor={toneColor}
      isFetching={isFetching}
      loading={isLoading}
      error={error}
      headerActions={filters}
    >
      {children}
    </ChartCard>
  );
}
