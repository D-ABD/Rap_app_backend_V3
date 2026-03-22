// src/pages/widgets/overviewDashboard/CandidatOverviewWidget.tsx
import * as React from "react";
import {
  Box,
  Select,
  MenuItem,
  Typography,
  Card,
  CircularProgress,
  Alert,
  Divider,
} from "@mui/material";

import {
  CandidatFilters,
  CandidatGroupRow,
  getErrorMessage,
  resolveCandidatGroupLabel,
  useCandidatOverview,
  useCandidatGrouped,
} from "../../../types/candidatStats";

import ListAltIcon from "@mui/icons-material/ListAlt";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

// 🎨 Couleurs cohérentes
const STATUS_COLORS = [
  "#fb8c00", // En appairage
  "#6d4c41", // En accompagnement
  "#1e88e5", // En attente entretien
  "#ef5350", // Sans suivi
];

export default function CandidatOverviewWidget({
  title = "Overview Candidats",
  initialFilters,
}: {
  title?: string;
  initialFilters?: CandidatFilters;
}) {
  const [filters, setFilters] = React.useState<CandidatFilters>(initialFilters ?? {});

  const { data, isLoading, error } = useCandidatOverview(filters);
  const { data: centresGrouped, isLoading: loadingCentres } = useCandidatGrouped("centre", {
    ...filters,
    centre: undefined,
  });
  const { data: depsGrouped } = useCandidatGrouped("departement", {
    ...filters,
    departement: undefined,
  });

  // ✅ Options filtres
  const centreOptions =
    centresGrouped?.results
      ?.map((r: CandidatGroupRow) => {
        const id =
          r.formation__centre_id ??
          (typeof r.group_key === "string" || typeof r.group_key === "number"
            ? r.group_key
            : undefined);
        return id != null
          ? { id: String(id), label: resolveCandidatGroupLabel(r, "centre") }
          : null;
      })
      .filter((o): o is { id: string; label: string } => o !== null) ?? [];

  const departementOptions =
    depsGrouped?.results
      ?.map((r: CandidatGroupRow) => {
        const code =
          (typeof r.departement === "string" && r.departement) ||
          (typeof r.group_key === "string" ? r.group_key : "");
        return code
          ? {
              code: String(code),
              label: resolveCandidatGroupLabel(r, "departement"),
            }
          : null;
      })
      .filter((o): o is { code: string; label: string } => o !== null) ?? [];

  const k = data?.kpis;

  // ✅ Données camembert
  const statusData = [
    {
      name: "En appairage",
      value: k?.en_appairage ?? 0,
      color: STATUS_COLORS[0],
    },
    {
      name: "En accompagnement",
      value: k?.en_accompagnement ?? 0,
      color: STATUS_COLORS[1],
    },
  ];

  const totalStatus = statusData.reduce((acc, d) => acc + d.value, 0);
  const pct = (val: number) =>
    totalStatus > 0 ? ((val / totalStatus) * 100).toFixed(1).replace(/\.0$/, "") : "0";

  return (
    <Card
      sx={{
        p: 2,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        borderRadius: 2,
        height: "100%",
        minHeight: 360, // ✅ évite les hauteurs nulles pendant le rendu
      }}
    >
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1}>
        <ListAltIcon color="primary" />
        <Typography variant="subtitle2" fontWeight="bold">
          {title}
        </Typography>
      </Box>

      <Divider />

      {/* Total candidats */}
      {!isLoading && !error && (
        <Box textAlign="center">
          <Typography variant="h6" fontWeight="bold" color="primary">
            {k?.total ?? 0}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            candidats au total
          </Typography>
        </Box>
      )}

      {/* Filtres */}
      <Box display="flex" flexWrap="wrap" gap={1}>
        <Select
          size="small"
          value={filters.centre ?? ""}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              centre: e.target.value || undefined,
            }))
          }
          disabled={loadingCentres}
          sx={{ minWidth: 140 }}
          displayEmpty
        >
          <MenuItem value="">Tous centres</MenuItem>
          {centreOptions.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.label}
            </MenuItem>
          ))}
        </Select>

        <Select
          size="small"
          value={filters.departement ?? ""}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              departement: e.target.value || undefined,
            }))
          }
          sx={{ minWidth: 140 }}
          displayEmpty
        >
          <MenuItem value="">Tous départements</MenuItem>
          {departementOptions.map((d) => (
            <MenuItem key={d.code} value={d.code}>
              {d.label}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {/* Camembert statuts */}
      <Box
        sx={{
          width: "100%",
          flex: 1,
          minWidth: 0, // ✅ empêche les tailles négatives
          minHeight: 240, // ✅ hauteur stable
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isLoading ? (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress size={22} />
          </Box>
        ) : error ? (
          <Alert severity="error">{getErrorMessage(error)}</Alert>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                outerRadius="80%"
                dataKey="value"
                labelLine={false}
                label={({ name, value }) => `${name} (${pct(value as number)}%)`}
              >
                {statusData.map((entry, index) => (
                  <Cell key={`status-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v, n) => [`${v} candidats (${pct(v as number)}%)`, n as string]}
              />
              <Legend verticalAlign="bottom" height={30} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Card>
  );
}
