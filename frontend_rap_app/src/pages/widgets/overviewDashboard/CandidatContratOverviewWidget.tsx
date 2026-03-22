// src/pages/widgets/overviewDashboard/CandidatContratOverviewWidget.tsx
import * as React from "react";
import {
  Box,
  Typography,
  Card,
  CircularProgress,
  Alert,
  Divider,
  Select,
  MenuItem,
} from "@mui/material";

import {
  CandidatFilters,
  CandidatGroupRow,
  getErrorMessage,
  resolveCandidatGroupLabel,
  useCandidatOverview,
  useCandidatGrouped,
} from "../../../types/candidatStats";

import WorkIcon from "@mui/icons-material/Work";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
  Cell,
} from "recharts";

/* Utils */
function fmt(n?: number | null) {
  return n == null ? "0" : Math.round(n).toString();
}

// 🎨 Palette cohérente
const COLORS = [
  "#1e88e5", // Apprentissage
  "#43a047", // Professionnalisation
  "#fbc02d", // CRIF
  "#8e24aa", // POEI/POEC
  "#ef5350", // Sans contrat
  "#6d4c41", // Autre
];

export default function CandidatContratOverviewWidget({
  title = "Répartition des contrats",
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

  // ✅ Options centres
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
      .filter((o): o is { id: string; label: string } => Boolean(o)) ?? [];

  // ✅ Options départements
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
      .filter((o): o is { code: string; label: string } => Boolean(o)) ?? [];

  const k = data?.kpis;

  // ✅ Données du graphique contrats
  const chartData = [
    {
      name: "Apprentissage",
      value: k?.contrat_apprentissage ?? 0,
      color: COLORS[0],
    },
    {
      name: "Professionnalisation",
      value: k?.contrat_professionnalisation ?? 0,
      color: COLORS[1],
    },
    { name: "CRIF", value: k?.contrat_crif ?? 0, color: COLORS[2] },
    { name: "POEI / POEC", value: k?.contrat_poei_poec ?? 0, color: COLORS[3] },
    { name: "Sans contrat", value: k?.contrat_sans ?? 0, color: COLORS[4] },
    { name: "Autre", value: k?.contrat_autre ?? 0, color: COLORS[5] },
  ];

  return (
    <Card
      sx={{
        p: 2,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        borderRadius: 2,
        height: "100%",
        minHeight: 360, // ✅ garantit de l’espace pour le graphique
      }}
    >
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1}>
        <WorkIcon color="primary" />
        <Typography variant="subtitle2" fontWeight="bold">
          {title}
        </Typography>
      </Box>

      <Divider />

      {/* Total candidats */}
      {!isLoading && !error && (
        <Box textAlign="center">
          <Typography variant="h6" fontWeight="bold" color="primary">
            {fmt(k?.total)}
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
          onChange={(e) => setFilters((f) => ({ ...f, centre: e.target.value || undefined }))}
          disabled={loadingCentres}
          sx={{ minWidth: 120 }}
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
          sx={{ minWidth: 120 }}
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

      {/* Graphique */}
      <Box
        sx={{
          width: "100%",
          flex: 1,
          minWidth: 0, // ✅ empêche Recharts de calculer des dimensions négatives
          minHeight: 240, // ✅ hauteur stable
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isLoading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress size={22} />
          </Box>
        ) : error ? (
          <Alert severity="error">{getErrorMessage(error)}</Alert>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `${v} candidats`} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Bar dataKey="value">
                {chartData.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={entry.color} />
                ))}
                <LabelList dataKey="value" position="top" style={{ fontSize: 11 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Card>
  );
}
