import * as React from "react";
import {
  Alert,
  Box,
  Card,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import EventIcon from "@mui/icons-material/Event";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  EvenementBreakdownRow,
  EvenementStatsFilters,
  getErrorMessage,
  useEvenementOverview,
} from "../../../types/evenementStats";

const COLORS = ["#42a5f5", "#ef5350", "#ffb300", "#66bb6a", "#90a4ae"];

type Props = {
  title?: string;
  initialFilters?: EvenementStatsFilters;
};

export default function EvenementOverviewWidget({
  title = "Overview Événements",
  initialFilters,
}: Props) {
  const [filters, setFilters] = React.useState<EvenementStatsFilters>(initialFilters ?? {});
  const { data, isLoading, error } = useEvenementOverview(filters);

  const pieData = React.useMemo(
    () =>
      (data?.repartition.par_statut ?? [])
        .map((row: EvenementBreakdownRow) => ({
          name: row.label,
          value: row.count ?? 0,
        }))
        .filter((row) => row.value > 0),
    [data]
  );

  return (
    <Card sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2, borderRadius: 2, minHeight: 360 }}>
      <Box display="flex" alignItems="center" gap={1}>
        <EventIcon color="primary" />
        <Typography variant="subtitle2" fontWeight="bold">
          {title}
        </Typography>
      </Box>

      <Divider />

      {!isLoading && !error && (
        <Stack spacing={1.25}>
          <Box textAlign="center">
            <Typography variant="h6" fontWeight="bold" color="primary">
              {data?.kpis.total ?? 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              événements au total
            </Typography>
          </Box>

          <Box display="flex" justifyContent="center" flexWrap="wrap" gap={1}>
            <Chip size="small" color="info" label={`Aujourd'hui : ${data?.kpis.aujourd_hui ?? 0}`} />
            <Chip size="small" color="warning" label={`Bientôt : ${data?.kpis.bientot ?? 0}`} />
            <Chip size="small" color="success" label={`À venir : ${data?.kpis.a_venir ?? 0}`} />
            <Chip size="small" variant="outlined" label={`Passés : ${data?.kpis.passes ?? 0}`} />
            <Chip size="small" variant="outlined" label={`Sans date : ${data?.kpis.sans_date ?? 0}`} />
          </Box>

          <Box display="flex" justifyContent="center" flexWrap="wrap" gap={1}>
            <Chip size="small" color="secondary" label={`Avec formation : ${data?.kpis.avec_formation ?? 0}`} />
            <Chip size="small" variant="outlined" label={`Sans formation : ${data?.kpis.sans_formation ?? 0}`} />
            <Chip
              size="small"
              color="success"
              label={`Taux participation : ${Math.round(data?.kpis.taux_remplissage_global ?? 0)}%`}
            />
          </Box>
        </Stack>
      )}

      <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
        <Select
          size="small"
          value={filters.statut ?? ""}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              statut: e.target.value || undefined,
            }))
          }
          displayEmpty
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">Tous les statuts</MenuItem>
          <MenuItem value="past">Passés</MenuItem>
          <MenuItem value="today">Aujourd'hui</MenuItem>
          <MenuItem value="soon">Bientôt</MenuItem>
          <MenuItem value="future">À venir</MenuItem>
          <MenuItem value="unknown">Sans date</MenuItem>
        </Select>
      </Box>

      <Box sx={{ flex: 1, minHeight: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {isLoading ? (
          <CircularProgress size={22} />
        ) : error ? (
          <Alert severity="error">{getErrorMessage(error)}</Alert>
        ) : pieData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius="75%"
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {pieData.map((_, index) => (
                  <Cell key={`evenement-pie-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value} événements`} />
              <Legend verticalAlign="bottom" height={30} iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Aucune donnée disponible
          </Typography>
        )}
      </Box>
    </Card>
  );
}
