// src/pages/widgets/overviewDashboard/FormationOverviewWidget2.tsx
import * as React from "react";
import {
  Card,
  Typography,
  Box,
  Button,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import PieChartIcon from "@mui/icons-material/PieChart";
import ArchiveIcon from "@mui/icons-material/Archive";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

import {
  Filters,
  GroupRow,
  useFormationGrouped,
  useFormationOverview,
  useFormationDictionaries,
  resolveGroupLabel,
} from "../../../types/formationStats";

/* 🧮 Utils */
function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const clone: T = { ...obj };
  for (const k of keys) delete clone[k];
  return clone;
}

/* 🎨 Couleurs fixes */
const COLORS = ["#1e88e5", "#43a047", "#fbc02d", "#8e24aa"];

/* 🏷️ Label custom */
const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) / 2;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="middle"
      style={{ fontSize: "12px", fontWeight: "bold" }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function FormationOverviewWidget2({
  title = "Répartition des places par offre et financeur",
  filters,
}: {
  title?: string;
  filters?: Filters;
}) {
  const [localFilters, setLocalFilters] = React.useState<Filters>(filters ?? {});
  const [includeArchived, setIncludeArchived] = React.useState<boolean>(!!filters?.avec_archivees);

  React.useEffect(() => {
    if (filters) setLocalFilters(filters);
  }, [filters]);

  // ⚙️ Filtres effectifs
  const effectiveFilters = React.useMemo(
    () => ({ ...localFilters, avec_archivees: includeArchived }),
    [localFilters, includeArchived]
  );

  const centreQuery = useFormationGrouped("centre", omit(effectiveFilters, ["centre"]));
  const deptQuery = useFormationGrouped("departement", omit(effectiveFilters, ["departement"]));
  const typeOffreQuery = useFormationGrouped("type_offre", omit(effectiveFilters, ["type_offre"]));

  const { refetch, isFetching } = useFormationOverview(effectiveFilters);
  const dicts = useFormationDictionaries().data;

  /* ✅ Agrégation */
  const raw =
    typeOffreQuery.data?.results?.map((row: GroupRow) => ({
      name: resolveGroupLabel(row, "type_offre", dicts),
      mp: row.total_places_mp ?? 0,
      crif: row.total_places_crif ?? 0,
    })) ?? [];

  const aggregated = raw.reduce(
    (acc, curr) => {
      const n = curr.name.toLowerCase();
      if (n.includes("alternance")) acc.Alt += curr.mp;
      else if (n.includes("poei") || n.includes("poec")) acc.Poei += curr.mp;
      else acc.Autre += curr.mp;
      acc.Crif += curr.crif;
      return acc;
    },
    { Alt: 0, Poei: 0, Crif: 0, Autre: 0 }
  );

  const chartData = Object.entries(aggregated).map(([name, value]) => ({
    name,
    value,
  }));

  const total = chartData.reduce((acc, d) => acc + d.value, 0);
  const pct = (val: number) =>
    total > 0 ? ((val / total) * 100).toFixed(1).replace(/\.0$/, "") : "0";

  return (
    <Card
      sx={{
        p: 2,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        borderRadius: 2,
        height: "100%",
        minHeight: 360, // ✅ stabilité d’affichage
      }}
    >
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <PieChartIcon color="primary" fontSize="small" />
          <Typography variant="subtitle2" fontWeight="bold">
            {title}
          </Typography>
        </Box>

        {/* Actions */}
        <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
          <Button
            size="small"
            variant={includeArchived ? "contained" : "outlined"}
            color={includeArchived ? "secondary" : "inherit"}
            onClick={() => setIncludeArchived((v) => !v)}
            startIcon={<ArchiveIcon fontSize="small" />}
          >
            {includeArchived ? "Retirer archivées" : "Ajouter archivées"}
          </Button>

          <Button
            size="small"
            variant="outlined"
            onClick={() => refetch()}
            startIcon={
              <RefreshIcon
                fontSize="small"
                sx={{
                  animation: isFetching ? "spin 1s linear infinite" : "none",
                }}
              />
            }
          >
            Rafraîchir
          </Button>
        </Box>
      </Box>

      {/* Filtres */}
      <Box display="flex" gap={1} flexWrap="wrap" justifyContent="flex-end">
        <Select
          size="small"
          value={localFilters.centre ?? ""}
          onChange={(e) =>
            setLocalFilters((f) => ({
              ...f,
              centre: e.target.value ? String(e.target.value) : undefined,
            }))
          }
          sx={{ minWidth: 120 }}
          displayEmpty
        >
          <MenuItem value="">Tous centres</MenuItem>
          {centreQuery.data?.results?.map((r: GroupRow) => {
            const label =
              (typeof r["centre__nom"] === "string" && r["centre__nom"]) ||
              (typeof r.group_label === "string" && r.group_label) ||
              undefined;
            const value = r.group_key ?? r.centre_id ?? label;
            return value && label ? (
              <MenuItem key={String(value)} value={String(value)}>
                {label}
              </MenuItem>
            ) : null;
          })}
        </Select>

        <Select
          size="small"
          value={localFilters.departement ?? ""}
          onChange={(e) =>
            setLocalFilters((f) => ({
              ...f,
              departement: e.target.value ? String(e.target.value) : undefined,
            }))
          }
          sx={{ minWidth: 100 }}
          displayEmpty
        >
          <MenuItem value="">Tous dépts</MenuItem>
          {deptQuery.data?.results?.map((r: GroupRow) => {
            const label =
              (typeof r.group_label === "string" && r.group_label) ||
              (typeof r.departement === "string" && r.departement) ||
              undefined;
            const value = r.group_key ?? r.departement ?? label;
            return value && label ? (
              <MenuItem key={String(value)} value={String(value)}>
                {label}
              </MenuItem>
            ) : null;
          })}
        </Select>
      </Box>

      {/* Graphique */}
      <Box sx={{ flex: 1, minHeight: 240 }}>
        {typeOffreQuery.isLoading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress size={20} />
          </Box>
        ) : typeOffreQuery.error ? (
          <Alert severity="error">{(typeOffreQuery.error as Error).message}</Alert>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="35%"
                outerRadius="75%"
                paddingAngle={3}
                dataKey="value"
                labelLine={false}
                label={renderLabel}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [`${v} places (${pct(v as number)}%)`, n as string]} />
              <Legend
                verticalAlign="bottom"
                height={40}
                iconType="circle"
                wrapperStyle={{
                  fontSize: 11,
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  lineHeight: "14px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Card>
  );
}
