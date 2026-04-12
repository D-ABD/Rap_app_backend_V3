// src/pages/widgets/overviewDashboard/AppairageOverviewWidget.tsx
import * as React from "react";
import {
  AppairageFilters,
  AppairageGroupRow,
  getErrorMessage,
  resolveAppairageGroupLabel,
  useAppairageGrouped,
  useAppairageOverview,
} from "../../../types/appairageStats";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Card,
  FormControl,
  Button,
  useTheme,
} from "@mui/material";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ArchiveIcon from "@mui/icons-material/Archive";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
  Cell,
} from "recharts";
import type { AppTheme } from "src/theme";

/* Utils */
function fmt(n?: number | null) {
  return n == null ? "—" : Math.round(n).toString();
}

export default function AppairageOverviewWidget({
  defaultFilters,
  showFilters = true,
}: {
  defaultFilters?: AppairageFilters;
  showFilters?: boolean;
}) {
  const theme = useTheme<AppTheme>();
  const isLight = theme.palette.mode === "light";
  const chartGridStroke = isLight
    ? theme.custom.chart.grid.stroke.light
    : theme.custom.chart.grid.stroke.dark;
  const chartAxisStroke = isLight
    ? theme.custom.chart.axis.stroke.light
    : theme.custom.chart.axis.stroke.dark;
  const chartTooltipBackground = isLight
    ? theme.custom.chart.tooltip.background.light
    : theme.custom.chart.tooltip.background.dark;
  const chartTooltipBorder = isLight
    ? theme.custom.chart.tooltip.border.light
    : theme.custom.chart.tooltip.border.dark;
  const chartSeries = theme.custom.chart.series.ordered;
  const [filters, setFilters] = React.useState<AppairageFilters>(defaultFilters ?? {});
  const [includeArchived, setIncludeArchived] = React.useState(false);

  // 🔁 Actualise les filtres quand on change le toggle
  React.useEffect(() => {
    setFilters((f) => ({
      ...f,
      avec_archivees: includeArchived ? true : undefined,
    }));
  }, [includeArchived]);

  const { data, isLoading, error } = useAppairageOverview(filters);
  const { data: centresGrouped, isLoading: loadingCentres } = useAppairageGrouped("centre", {
    ...filters,
    centre: undefined,
  });
  const { data: depsGrouped } = useAppairageGrouped("departement", {
    ...filters,
    departement: undefined,
  });

  const centreOptions =
    centresGrouped?.results?.flatMap((r: AppairageGroupRow) => {
      const id =
        r.formation__centre_id ??
        (typeof r.group_key === "number" || typeof r.group_key === "string"
          ? r.group_key
          : undefined);
      return id != null ? [{ id: String(id), label: resolveAppairageGroupLabel(r, "centre") }] : [];
    }) ?? [];

  const departementOptions =
    depsGrouped?.results?.flatMap((r: AppairageGroupRow) => {
      const code =
        (typeof r.departement === "string" && r.departement) ||
        (typeof r.group_key === "string" ? r.group_key : "");
      return code ? [{ code, label: resolveAppairageGroupLabel(r, "departement") }] : [];
    }) ?? [];

  const total = data?.kpis.appairages_total ?? 0;
  const statuts = data?.kpis.statuts ?? {};
  const chartData = [
    { name: "À faire", value: statuts["a_faire"] ?? 0, color: chartSeries[0] },
    { name: "Transmis", value: statuts["transmis"] ?? 0, color: chartSeries[1] },
    { name: "En attente", value: statuts["en_attente"] ?? 0, color: chartSeries[2] },
    { name: "OK", value: statuts["appairage_ok"] ?? 0, color: chartSeries[3] },
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
        minHeight: 360, // ✅ assure un espace suffisant pour le graphique
      }}
    >
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box display="flex" alignItems="center" gap={1}>
          <AssignmentIcon color="primary" />
          <Typography variant="subtitle2" fontWeight="bold">
            Appairages
          </Typography>
        </Box>

        {/* Bouton Archivées */}
        <Button
          size="small"
          variant={includeArchived ? "contained" : "outlined"}
          color={includeArchived ? "secondary" : "inherit"}
          onClick={() => setIncludeArchived((v) => !v)}
          startIcon={<ArchiveIcon fontSize="small" />}
        >
          {includeArchived ? "Retirer archivées" : "Ajouter archivées"}
        </Button>
      </Box>

      {/* Filtres */}
      {showFilters && (
        <Box display="flex" gap={1} flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={filters.centre ? String(filters.centre) : ""}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  centre: e.target.value || undefined,
                }))
              }
              disabled={loadingCentres}
              displayEmpty
            >
              <MenuItem value="">Tous centres</MenuItem>
              {centreOptions.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={filters.departement ?? ""}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  departement: e.target.value || undefined,
                }))
              }
              displayEmpty
            >
              <MenuItem value="">Tous dépts</MenuItem>
              {departementOptions.map((d) => (
                <MenuItem key={d.code} value={d.code}>
                  {d.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {/* KPI global */}
      <Box display="flex" alignItems="center" gap={1}>
        <Typography variant="h6">{fmt(total)}</Typography>
        <Typography variant="body2" color="text.secondary">
          Total
        </Typography>
      </Box>

      {/* Chart */}
      <Box
        sx={{
          flex: 1,
          width: "100%",
          minWidth: 0, // ✅ évite les tailles négatives calculées par Recharts
          minHeight: 240, // ✅ garantit une surface calculable
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
            <BarChart data={chartData} barSize={32}>
              <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={{ stroke: chartAxisStroke }} tickLine={{ stroke: chartAxisStroke }} tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
              <YAxis allowDecimals={false} axisLine={{ stroke: chartAxisStroke }} tickLine={{ stroke: chartAxisStroke }} tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
              <Tooltip
                formatter={(v) => `${v} appairages`}
                contentStyle={{ background: chartTooltipBackground, border: chartTooltipBorder, borderRadius: 12 }}
                itemStyle={{ color: theme.palette.text.primary }}
                labelStyle={{ color: theme.palette.text.secondary }}
              />
              <Legend
                verticalAlign="bottom"
                height={30}
                iconType="circle"
                wrapperStyle={{ fontSize: 11, color: theme.palette.text.secondary }}
              />
              <Bar dataKey="value">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
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
