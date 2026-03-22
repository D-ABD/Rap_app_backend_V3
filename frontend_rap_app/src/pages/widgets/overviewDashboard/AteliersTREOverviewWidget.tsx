// src/pages/widgets/overviewDashboard/AteliersTREOverviewWidget.tsx
import * as React from "react";
import {
  ATELIER_TYPE_LABELS,
  AtelierTREFilters,
  AtelierTREGroupRow,
  getErrorMessage,
  resolveGroupLabel,
  useAtelierTREGrouped,
  useAtelierTREOverview,
} from "../../../types/atelierTreStats";
import {
  Select,
  MenuItem,
  Button,
  FormControl,
  Typography,
  Box,
  Card,
  CircularProgress,
  Alert,
  useTheme,
  Divider,
} from "@mui/material";
import InventoryIcon from "@mui/icons-material/Inventory";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
  Cell,
  CartesianGrid,
} from "recharts";

/* Utils */
function fmt(n?: number | null) {
  return n == null ? "—" : Math.round(n).toString();
}

type AtelierTypeKey = keyof typeof ATELIER_TYPE_LABELS;

export default function AteliersTREOverviewWidget() {
  const theme = useTheme();
  const initialRef = React.useRef<AtelierTREFilters>({});
  const [filters, setFilters] = React.useState<AtelierTREFilters>(initialRef.current);

  const { data: overview, isLoading, error } = useAtelierTREOverview(filters);

  // Centres
  const { data: centresGrouped, error: centresError } = useAtelierTREGrouped("centre", {
    ...filters,
    centre: undefined,
  });
  const centreOptions =
    centresGrouped?.results?.flatMap((r: AtelierTREGroupRow) => {
      const id =
        (typeof r.centre_id === "number" ? r.centre_id : undefined) ??
        (typeof r.group_key === "number" || typeof r.group_key === "string"
          ? r.group_key
          : undefined);
      return id != null ? [{ id, label: resolveGroupLabel(r) }] : [];
    }) ?? [];

  // Départements
  const { data: depsGrouped, error: depsError } = useAtelierTREGrouped("departement", {
    ...filters,
    departement: undefined,
  });
  const departementOptions =
    depsGrouped?.results?.flatMap((r: AtelierTREGroupRow) => {
      const code =
        (typeof r.departement === "string" && r.departement) ||
        (typeof r.group_key === "string" ? r.group_key : "");
      return code ? [{ code, label: resolveGroupLabel(r) }] : [];
    }) ?? [];

  const atelierTypeEntries = Object.entries(ATELIER_TYPE_LABELS) as Array<[AtelierTypeKey, string]>;

  const reset = () => setFilters(initialRef.current);

  // 📊 Données du diagramme
  const chartData = overview && [
    {
      name: "Candidats uniques",
      value: overview.kpis.nb_candidats_uniques,
      color: theme.palette.info.main,
    },
    {
      name: "Inscriptions",
      value: overview.kpis.inscrits_total,
      color: theme.palette.success.main,
    },
    {
      name: "Présents",
      value: overview.kpis.presences.present,
      color: theme.palette.success.dark,
    },
    {
      name: "Absents",
      value: overview.kpis.presences.absent,
      color: theme.palette.error.main,
    },
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
        minHeight: 360, // ✅ assure une taille suffisante pour le graphique
      }}
    >
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1}>
        <InventoryIcon color="primary" fontSize="small" />
        <Typography variant="subtitle2" fontWeight="bold">
          Overview Ateliers TRE
        </Typography>
      </Box>

      {/* Filtres */}
      <Box display="flex" flexWrap="wrap" gap={1}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <Select
            value={(filters.type_atelier as string) ?? ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                type_atelier: e.target.value || undefined,
              }))
            }
            displayEmpty
          >
            <MenuItem value="">Tous types</MenuItem>
            {atelierTypeEntries.map(([key, label]) => (
              <MenuItem key={key} value={key}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <Select
            value={filters.centre ? String(filters.centre) : ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                centre: e.target.value || undefined,
              }))
            }
            displayEmpty
            disabled={!!centresError}
          >
            <MenuItem value="">{centresError ? "Indisponibles" : "Tous centres"}</MenuItem>
            {centreOptions.map((c) => (
              <MenuItem key={String(c.id)} value={String(c.id)}>
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
            disabled={!!depsError}
          >
            <MenuItem value="">{depsError ? "Indisponibles" : "Tous départements"}</MenuItem>
            {departementOptions.map((d) => (
              <MenuItem key={d.code} value={d.code}>
                {d.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button variant="outlined" size="small" onClick={reset} sx={{ alignSelf: "flex-end" }}>
          Réinitialiser
        </Button>
      </Box>

      {/* KPI Global */}
      {overview && (
        <Box display="flex" flexWrap="wrap" alignItems="center" gap={3} mt={1}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h6">{fmt(overview.kpis.nb_ateliers)}</Typography>
            <Typography variant="body2" color="text.secondary">
              Total ateliers
            </Typography>
          </Box>

          <Divider orientation="vertical" flexItem />

          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h6">
              {overview.kpis.taux_presence != null
                ? `${overview.kpis.taux_presence.toFixed(1)} %`
                : "—"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Taux de présence
            </Typography>
          </Box>
        </Box>
      )}

      {/* Graphique en barres */}
      <Box
        sx={{
          flex: 1,
          width: "100%",
          minWidth: 0, // ✅ Recharts fix
          minHeight: 240, // ✅ stabilité visuelle
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isLoading ? (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress size={22} />
          </Box>
        ) : error ? (
          <Alert severity="error">{getErrorMessage(error)}</Alert>
        ) : (
          chartData && (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={110} />
                <Tooltip formatter={(v) => `${v} participants`} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                  <LabelList dataKey="value" position="right" fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )
        )}
      </Box>
    </Card>
  );
}
