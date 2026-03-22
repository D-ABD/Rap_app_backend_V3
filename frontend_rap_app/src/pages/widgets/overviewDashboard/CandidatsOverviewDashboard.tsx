// src/pages/widgets/overviewDashboard/CandidatsOverviewDashboard.tsx
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
import {
  getCandidatBusinessStatusColorByValue,
  getCandidatBusinessStatusLabelFromValue,
} from "../../../shared/utils/candidatStatus";

import ListAltIcon from "@mui/icons-material/ListAlt";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
} from "recharts";

const STATUS_COLOR_HEX: Record<string, string> = {
  default: "#90a4ae",
  info: "#1e88e5",
  secondary: "#6d4c41",
  warning: "#fb8c00",
  success: "#43a047",
  error: "#e53935",
};

const CONTRAT_COLORS = [
  "#1e88e5", // Apprentissage
  "#43a047", // Professionnalisation
  "#fbc02d", // CRIF
  "#8e24aa", // POEI/POEC
  "#ef5350", // Sans contrat
  "#6d4c41", // Autre
];

export default function CandidatsOverviewDashboard({
  initialFilters,
}: {
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

  /* ✅ Options filtres */
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

  const statusData =
    data?.repartition.par_statut_metier
      ?.map((item) => {
        const value = Number(item.count) || 0;
        if (value <= 0) return null;

        const key = item.statut_metier ?? "candidat";
        return {
          name: getCandidatBusinessStatusLabelFromValue(key),
          value,
          color: STATUS_COLOR_HEX[getCandidatBusinessStatusColorByValue(key)],
        };
      })
      .filter(
        (
          item
        ): item is {
          name: string;
          value: number;
          color: string;
        } => item !== null
      ) ?? [];

  const totalStatus = statusData.reduce((acc, d) => acc + d.value, 0);
  const pct = (val: number) =>
    totalStatus > 0 ? ((val / totalStatus) * 100).toFixed(1).replace(/\.0$/, "") : "0";

  /* ✅ Données bar chart (contrats) */
  const contratData = [
    {
      name: "Apprentissage",
      value: k?.contrat_apprentissage ?? 0,
      color: CONTRAT_COLORS[0],
    },
    {
      name: "Professionnalisation",
      value: k?.contrat_professionnalisation ?? 0,
      color: CONTRAT_COLORS[1],
    },
    { name: "CRIF", value: k?.contrat_crif ?? 0, color: CONTRAT_COLORS[2] },
    {
      name: "POEI / POEC",
      value: k?.contrat_poei_poec ?? 0,
      color: CONTRAT_COLORS[3],
    },
    {
      name: "Sans contrat",
      value: k?.contrat_sans ?? 0,
      color: CONTRAT_COLORS[4],
    },
    { name: "Autre", value: k?.contrat_autre ?? 0, color: CONTRAT_COLORS[5] },
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
        minHeight: 380, // ✅ assure un espace constant pour les graphiques
      }}
    >
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1}>
        <ListAltIcon color="primary" fontSize="small" />
        <Typography variant="subtitle2" fontWeight="bold">
          Candidats — Vue d’ensemble
        </Typography>
      </Box>

      <Divider />

      {/* Filtres */}
      <Box display="flex" flexWrap="wrap" gap={1}>
        <Select
          size="small"
          value={filters.centre ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, centre: e.target.value || undefined }))}
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

      {/* Graphiques */}
      <Box display="flex" gap={2} flexWrap="wrap" justifyContent="space-between" sx={{ flex: 1 }}>
        {/* Camembert Statuts */}
        <Box sx={{ flex: 1, minWidth: 280, minHeight: 240 }}>
          {isLoading ? (
            <Box display="flex" justifyContent="center" p={2}>
              <CircularProgress size={22} />
            </Box>
          ) : error ? (
            <Alert severity="error">{getErrorMessage(error)}</Alert>
          ) : statusData.length === 0 ? (
            <Alert severity="info">Aucune repartition de statut métier disponible.</Alert>
          ) : (
            <ResponsiveContainer width="100%" aspect={1}>
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

        {/* Bar chart Contrats */}
        <Box sx={{ flex: 1, minWidth: 280, minHeight: 240 }}>
          {isLoading ? (
            <Box display="flex" justifyContent="center" p={2}>
              <CircularProgress size={22} />
            </Box>
          ) : error ? (
            <Alert severity="error">{getErrorMessage(error)}</Alert>
          ) : (
            <ResponsiveContainer width="100%" aspect={2}>
              <BarChart data={contratData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `${v} candidats`} />
                <Legend
                  verticalAlign="bottom"
                  height={28}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11 }}
                />
                <Bar dataKey="value">
                  {contratData.map((entry, index) => (
                    <Cell key={`contrat-${index}`} fill={entry.color} />
                  ))}
                  <LabelList dataKey="value" position="top" style={{ fontSize: 11 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Box>
      </Box>
    </Card>
  );
}
