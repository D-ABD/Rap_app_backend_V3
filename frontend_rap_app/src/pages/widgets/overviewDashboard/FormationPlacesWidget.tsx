// src/pages/widgets/overviewDashboard/FormationPlacesWidget.tsx
import * as React from "react";
import {
  Box,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Typography,
  Card,
  Alert,
} from "@mui/material";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import InventoryIcon from "@mui/icons-material/Inventory";
import ArchiveIcon from "@mui/icons-material/Archive";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
} from "recharts";

import {
  Filters,
  GroupRow,
  useFormationGrouped,
  useFormationOverview,
} from "../../../types/formationStats";

/* 🧮 Utils */
function toFixed0(n?: number | null) {
  return n == null ? "—" : Math.round(n).toString();
}
function omit<T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Omit<T, K> {
  const clone = { ...obj };
  for (const k of keys) delete clone[k];
  return clone;
}

export default function FormationPlacesWidget({
  title = "Overview Places Formation",
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

  // ⚙️ Filtres complets
  const effectiveFilters = React.useMemo(
    () => ({ ...localFilters, avec_archivees: includeArchived }),
    [localFilters, includeArchived]
  );

  const centreQuery = useFormationGrouped("centre", omit(effectiveFilters, ["centre"] as const));
  const deptQuery = useFormationGrouped(
    "departement",
    omit(effectiveFilters, ["departement"] as const)
  );
  const { data, isLoading, error, refetch, isFetching } = useFormationOverview(effectiveFilters);
  const k = data?.kpis;

  // ✅ Options filtres
  const centreOptions =
    centreQuery.data?.results?.flatMap((r: GroupRow) => {
      const label =
        (typeof r["centre__nom"] === "string" && r["centre__nom"]) ||
        (typeof r.group_label === "string" && r.group_label) ||
        (r.centre_id != null ? `Centre #${r.centre_id}` : undefined);
      const value = r.group_key ?? r.centre_id ?? label;
      return value && label ? [{ label, value }] : [];
    }) ?? [];

  const deptOptions =
    deptQuery.data?.results?.flatMap((r: GroupRow) => {
      const label =
        (typeof r.group_label === "string" && r.group_label) ||
        (typeof r.departement === "string" && r.departement) ||
        undefined;
      const value = r.group_key ?? r.departement ?? label;
      return value && label ? [{ label, value }] : [];
    }) ?? [];

  // ✅ Données du graphique
  const chartData = k && [
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
        gap: 1.5,
        borderRadius: 2,
        height: "100%",
        minHeight: 360, // ✅ stabilité d’affichage
      }}
    >
      {/* Header */}
      <Box display="flex" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <Typography variant="subtitle2" fontWeight="bold">
          {title}
        </Typography>

        <Box display="flex" flexWrap="wrap" gap={1} alignItems="center">
          {/* Bouton archivées */}
          <Button
            size="small"
            variant={includeArchived ? "contained" : "outlined"}
            color={includeArchived ? "secondary" : "inherit"}
            onClick={() => setIncludeArchived((v) => !v)}
            startIcon={<ArchiveIcon fontSize="small" />}
          >
            {includeArchived ? "Retirer archivées" : "Ajouter archivées"}
          </Button>

          {/* Rafraîchir */}
          <Button
            size="small"
            variant="outlined"
            onClick={() => refetch()}
            startIcon={
              <AutorenewIcon
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
      <Box display="flex" flexWrap="wrap" gap={1} justifyContent="flex-end">
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
              departement: e.target.value ? String(e.target.value) : undefined,
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
      </Box>

      {/* KPI global */}
      {k && (
        <Box
          display="flex"
          alignItems="center"
          gap={1}
          p={1}
          border="1px solid"
          borderColor="divider"
          borderRadius={2}
          justifyContent="center"
        >
          <InventoryIcon fontSize="small" color="action" />
          <Box textAlign="center">
            <Typography variant="h6" fontWeight="bold">
              {toFixed0((k.total_dispo_crif ?? 0) + (k.total_dispo_mp ?? 0))}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Places dispo
            </Typography>
          </Box>
        </Box>
      )}

      {/* Graphique */}
      <Box sx={{ flex: 1, minHeight: 240 }}>
        {isLoading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress size={20} />
          </Box>
        ) : error ? (
          <Alert severity="error">{(error as Error).message}</Alert>
        ) : (
          chartData && (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={chartData}
                layout="vertical"
                barSize={30}
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={50} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Places" fill="#42a5f5">
                  <LabelList dataKey="Places" position="right" fontSize={11} />
                </Bar>
                <Bar dataKey="Inscrits" fill="#66bb6a">
                  <LabelList dataKey="Inscrits" position="right" fontSize={11} />
                </Bar>
                <Bar dataKey="Dispo" fill="#ffa726">
                  <LabelList dataKey="Dispo" position="right" fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )
        )}
      </Box>
    </Card>
  );
}
