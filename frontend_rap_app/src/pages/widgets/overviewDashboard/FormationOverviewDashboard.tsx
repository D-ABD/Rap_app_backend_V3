// src/pages/widgets/overviewDashboard/FormationOverviewDashboard.tsx
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
import SchoolIcon from "@mui/icons-material/School";
import InventoryIcon from "@mui/icons-material/Inventory";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
} from "recharts";
import {
  Filters,
  GroupRow,
  useFormationOverview,
  useFormationGrouped,
  useFormationDictionaries,
  resolveGroupLabel,
} from "../../../types/formationStats";

/* Utils communs */
function toFixed0(n?: number | null) {
  return n == null ? "—" : Math.round(n).toString();
}
function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const clone = { ...obj };
  for (const k of keys) delete clone[k];
  return clone;
}

/* 🎨 Couleurs */
const COLORS1 = ["#4caf50", "#ff9800", "#2196f3"];
const COLORS2 = ["#1e88e5", "#43a047", "#8e24aa"];
const COLORS3 = { places: "#42a5f5", inscrits: "#66bb6a", dispo: "#ffa726" };

export default function FormationOverviewDashboard({ filters }: { filters?: Filters }) {
  const [localFilters, setLocalFilters] = React.useState<Filters>(filters ?? {});
  React.useEffect(() => {
    if (filters) setLocalFilters(filters);
  }, [filters]);

  // Requêtes
  const centreQuery = useFormationGrouped("centre", omit(localFilters, ["centre"]));
  const deptQuery = useFormationGrouped("departement", omit(localFilters, ["departement"]));
  const { data, isLoading, error, refetch, isFetching } = useFormationOverview(localFilters);
  const k = data?.kpis;

  // Autres requêtes
  const typeOffreQuery = useFormationGrouped("type_offre", omit(localFilters, ["type_offre"]));
  const dicts = useFormationDictionaries().data;

  // Options filtres
  const centreOptions =
    centreQuery.data?.results?.flatMap((r: GroupRow) => {
      const label = r["centre__nom"] ?? r.group_label;
      const value = r.group_key ?? r.centre_id ?? label;
      return value && label ? [{ label, value }] : [];
    }) ?? [];
  const deptOptions =
    deptQuery.data?.results?.flatMap((r: GroupRow) => {
      const label = r.group_label ?? r.departement;
      const value = r.group_key ?? r.departement ?? label;
      return value && label ? [{ label, value }] : [];
    }) ?? [];

  // Données graphiques
  const pie1 = k && [
    { name: "Actives", value: k.nb_actives ?? 0 },
    { name: "À venir", value: k.nb_a_venir ?? 0 },
    { name: "Finies", value: k.nb_terminees ?? 0 },
  ];

  const raw =
    typeOffreQuery.data?.results?.map((row: GroupRow) => ({
      name: resolveGroupLabel(row, "type_offre", dicts),
      value: row.total_places_mp ?? 0,
    })) ?? [];
  const pie2 = Object.entries(
    raw
      .map((d) => {
        if (d.name.toLowerCase().includes("alternance")) return { ...d, label: "Alt" };
        if (d.name.toLowerCase().includes("poei") || d.name.toLowerCase().includes("poec"))
          return { ...d, label: "POEI" };
        return { ...d, label: "Autre" };
      })
      .reduce((acc: Record<string, number>, curr) => {
        acc[curr.label] = (acc[curr.label] ?? 0) + curr.value;
        return acc;
      }, {})
  ).map(([name, value]) => ({ name, value }));

  const totalPie2 = pie2.reduce((acc, d) => acc + d.value, 0);
  const pct = (val: number) =>
    totalPie2 > 0 ? ((val / totalPie2) * 100).toFixed(1).replace(/\.0$/, "") : "0";

  const barData = k && [
    {
      name: "CRIF",
      Places: k.total_places_crif ?? 0,
      Inscrits: k.total_inscrits_crif ?? 0,
      Dispo: k.total_dispo_crif ?? 0,
    },
    {
      name: "MP",
      Places: k.total_places_mp ?? 0,
      Inscrits: k.total_inscrits_mp ?? 0,
      Dispo: k.total_dispo_mp ?? 0,
    },
  ];

  return (
    <Card
      sx={{
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        borderRadius: 2,
        height: "100%",
        minHeight: 400, // ✅ stabilité globale
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
        <Typography variant="subtitle2" fontWeight="bold">
          Vue d’ensemble Formations
        </Typography>

        {/* Filtres */}
        <Box display="flex" gap={1} flexWrap="wrap">
          <Select
            size="small"
            value={localFilters.centre ?? ""}
            onChange={(e) =>
              setLocalFilters((f) => ({
                ...f,
                centre: e.target.value || undefined,
              }))
            }
            sx={{ minWidth: 120 }}
            displayEmpty
          >
            <MenuItem value="">Tous centres</MenuItem>
            {centreOptions.map((o) => (
              <MenuItem key={String(o.value)} value={String(o.value)}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
          <Select
            size="small"
            value={localFilters.departement ?? ""}
            onChange={(e) =>
              setLocalFilters((f) => ({
                ...f,
                departement: e.target.value || undefined,
              }))
            }
            sx={{ minWidth: 100 }}
            displayEmpty
          >
            <MenuItem value="">Tous dépts</MenuItem>
            {deptOptions.map((o) => (
              <MenuItem key={String(o.value)} value={String(o.value)}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
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

      {/* KPIs */}
      {k && (
        <Box display="flex" gap={2} flexWrap="wrap">
          <Box display="flex" alignItems="center" gap={1}>
            <SchoolIcon color="primary" fontSize="small" />
            <Typography variant="h6">{toFixed0(k.nb_formations)}</Typography>
            <Typography variant="body2" color="text.secondary">
              Formations
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <InventoryIcon color="action" fontSize="small" />
            <Typography variant="h6">
              {toFixed0((k.total_dispo_crif ?? 0) + (k.total_dispo_mp ?? 0))}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Places dispo
            </Typography>
          </Box>
        </Box>
      )}

      {/* Graphiques */}
      <Box display="flex" gap={2} flexWrap="wrap" justifyContent="space-between" sx={{ flex: 1 }}>
        {/* Camembert 1 */}
        <Box sx={{ flex: 1, minWidth: 260, minHeight: 240 }}>
          {isLoading ? (
            <Box display="flex" justifyContent="center" p={2}>
              <CircularProgress size={22} />
            </Box>
          ) : error ? (
            <Alert severity="error">{(error as Error).message}</Alert>
          ) : (
            pie1 && (
              <ResponsiveContainer width="100%" aspect={1}>
                <PieChart>
                  <Pie
                    data={pie1}
                    cx="50%"
                    cy="50%"
                    innerRadius="35%"
                    outerRadius="70%"
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={false}
                    label={({ name, value }) => `${name} (${value})`}
                  >
                    {pie1.map((_, i) => (
                      <Cell key={i} fill={COLORS1[i % COLORS1.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${v} formations`} />
                  <Legend
                    verticalAlign="bottom"
                    height={28}
                    iconType="circle"
                    wrapperStyle={{ fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )
          )}
        </Box>

        {/* Camembert 2 */}
        <Box sx={{ flex: 1, minWidth: 260, minHeight: 240 }}>
          {typeOffreQuery.isLoading ? (
            <Box display="flex" justifyContent="center" p={2}>
              <CircularProgress size={22} />
            </Box>
          ) : typeOffreQuery.error ? (
            <Alert severity="error">{(typeOffreQuery.error as Error).message}</Alert>
          ) : (
            pie2 && (
              <ResponsiveContainer width="100%" aspect={1}>
                <PieChart>
                  <Pie
                    data={pie2}
                    cx="50%"
                    cy="50%"
                    innerRadius="35%"
                    outerRadius="70%"
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={false}
                    label={({ name, value }) => `${name} (${pct(value as number)}%)`}
                  >
                    {pie2.map((_, i) => (
                      <Cell key={i} fill={COLORS2[i % COLORS2.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, n) => [`${v} places (${pct(v as number)}%)`, n as string]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={28}
                    iconType="circle"
                    wrapperStyle={{ fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )
          )}
        </Box>

        {/* Bar chart */}
        <Box sx={{ flex: 1, minWidth: 260, minHeight: 240 }}>
          {isLoading ? (
            <Box display="flex" justifyContent="center" p={2}>
              <CircularProgress size={22} />
            </Box>
          ) : error ? (
            <Alert severity="error">{(error as Error).message}</Alert>
          ) : (
            barData && (
              <ResponsiveContainer width="100%" aspect={1.8}>
                <BarChart
                  data={barData}
                  layout="vertical"
                  barSize={30}
                  margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={50} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Places" fill={COLORS3.places}>
                    <LabelList dataKey="Places" position="right" fontSize={11} />
                  </Bar>
                  <Bar dataKey="Inscrits" fill={COLORS3.inscrits}>
                    <LabelList dataKey="Inscrits" position="right" fontSize={11} />
                  </Bar>
                  <Bar dataKey="Dispo" fill={COLORS3.dispo}>
                    <LabelList dataKey="Dispo" position="right" fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          )}
        </Box>
      </Box>
    </Card>
  );
}
