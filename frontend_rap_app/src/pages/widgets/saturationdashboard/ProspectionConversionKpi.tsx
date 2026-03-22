import * as React from "react";
import {
  getErrorMessage,
  ProspectionFilters,
  ProspectionGroupRow,
  resolveProspectionGroupLabel,
  useProspectionGrouped,
  useProspectionOverview,
} from "../../../types/prospectionStats";
import {
  Box,
  Typography,
  LinearProgress,
  Select,
  MenuItem,
  TextField,
  FormControl,
  Button,
} from "@mui/material";
import BarChartIcon from "@mui/icons-material/BarChart";
import ArchiveIcon from "@mui/icons-material/Archive";
import DashboardTemplateSaturation from "../../../components/dashboard/DashboardTemplateSaturation";

function ProgressBar({ value }: { value: number }) {
  let color: "success" | "warning" | "error" = "success";
  if (value >= 80) color = "error";
  else if (value >= 50) color = "warning";

  return (
    <LinearProgress
      variant="determinate"
      value={Math.round(value)}
      color={color}
      sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
    />
  );
}

type Props = {
  title?: string;
  initialFilters?: ProspectionFilters;
};

export default function ProspectionConversionKpi({
  title = "Prospections - Taux de transformation",
  initialFilters,
}: Props) {
  const [filters, setFilters] = React.useState<ProspectionFilters>(initialFilters ?? {});
  const [autoDepartement, setAutoDepartement] = React.useState(true);
  const includeArchived = Boolean(filters.avec_archivees);

  const { data, isLoading, error, isFetching } = useProspectionOverview(filters);

  const {
    data: centresGrouped,
    isLoading: loadingCentres,
    error: errCentres,
  } = useProspectionGrouped("centre", { ...filters, centre: undefined });

  const centreOptions = React.useMemo(() => {
    const rows = centresGrouped?.results ?? [];
    return rows
      .map((r: ProspectionGroupRow) => {
        const rawId =
          r.centre_id ??
          (typeof r.group_key === "number" || typeof r.group_key === "string"
            ? r.group_key
            : undefined);
        if (rawId == null) return null;
        return {
          id: String(rawId),
          label: resolveProspectionGroupLabel(r, "centre"),
        };
      })
      .filter(Boolean)
      .sort((a, b) => (a!.label || "").localeCompare(b!.label || "")) as Array<{
      id: string;
      label: string;
    }>;
  }, [centresGrouped]);

  const { data: depForCentre } = useProspectionGrouped("departement", {
    ...filters,
    departement: undefined,
    centre: filters.centre,
  });

  React.useEffect(() => {
    if (!autoDepartement || !filters.centre) return;
    const depRaw = depForCentre?.results?.[0]?.departement ?? depForCentre?.results?.[0]?.group_key;
    const dep = depRaw != null ? String(depRaw) : undefined;
    if (dep && dep !== filters.departement) {
      setFilters((f) => ({ ...f, departement: dep }));
    }
  }, [autoDepartement, filters.centre, depForCentre, filters.departement]);

  const total = data?.kpis.total ?? 0;
  const acceptees = data?.kpis.acceptees ?? 0;
  const taux = total > 0 ? (acceptees / total) * 100 : 0;

  const filtersBar = (
    <>
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <Select
          aria-label="Filtrer par centre"
          value={filters.centre ?? ""}
          onChange={(e) => {
            const value = e.target.value;
            setFilters((f) => ({ ...f, centre: value || undefined }));
            setAutoDepartement(true);
          }}
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

      <TextField
        aria-label="Filtrer par département"
        size="small"
        placeholder="Dépt (ex: 92)"
        value={filters.departement ?? ""}
        onChange={(e) => {
          const v = e.target.value.trim();
          setFilters((f) => ({ ...f, departement: v || undefined }));
          setAutoDepartement(false);
        }}
        sx={{ width: 100 }}
      />

      {/* 🔘 Bouton Archivées */}
      <Button
        size="small"
        variant={includeArchived ? "contained" : "outlined"}
        color={includeArchived ? "secondary" : "inherit"}
        onClick={() =>
          setFilters((f) => ({
            ...f,
            avec_archivees: f.avec_archivees ? undefined : true,
          }))
        }
        startIcon={<ArchiveIcon fontSize="small" />}
      >
        {includeArchived ? "Retirer archivées" : "Ajouter archivées"}
      </Button>
    </>
  );

  return (
    <DashboardTemplateSaturation
      title={title}
      toneColor="primary.main"
      isFetching={isFetching}
      isLoading={isLoading}
      error={error ? getErrorMessage(error) : errCentres ? getErrorMessage(errCentres) : null}
      filters={filtersBar}
    >
      {total > 0 && (
        <Box display="flex" alignItems="center" gap={2}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              bgcolor: "primary.light",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BarChartIcon color="primary" />
          </Box>

          <Box>
            <Typography variant="h6" fontWeight="bold">
              {Math.round(taux)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {acceptees} acceptée{acceptees > 1 ? "s" : ""} / {total} prospection
              {total > 1 ? "s" : ""}
            </Typography>
            <ProgressBar value={taux} />
          </Box>
        </Box>
      )}
    </DashboardTemplateSaturation>
  );
}
