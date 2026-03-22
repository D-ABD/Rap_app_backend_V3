// src/pages/widgets/overviewDashboard/FormationSaturationWidget.tsx
import * as React from "react";
import { Filters, useFormationOverview, useFormationGrouped } from "../../../types/formationStats";

import {
  Box,
  Typography,
  LinearProgress,
  MenuItem,
  Select,
  FormControl,
  Button,
  Stack,
  Tooltip,
} from "@mui/material";

import SpeedIcon from "@mui/icons-material/Speed";
import ArchiveIcon from "@mui/icons-material/Archive";
import DashboardTemplateSaturation from "../../../components/dashboard/DashboardTemplateSaturation";

/* --------------------------
🔢 Utils
--------------------------- */
function toFixed0(n?: number) {
  return n == null ? "—" : Math.round(n).toString();
}

function omit<T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Omit<T, K> {
  const clone = { ...obj };
  for (const k of keys) delete clone[k];
  return clone;
}

function ColoredProgressBar({ value }: { value: number }) {
  const status = value >= 80 ? "error" : value >= 50 ? "warning" : "success";

  return (
    <LinearProgress
      variant="determinate"
      value={value}
      color={status}
      sx={{ height: 6, borderRadius: 3 }}
    />
  );
}

/* --------------------------
📌 Composant principal
--------------------------- */
export default function FormationSaturationWidget({
  title = "Saturation des formations",
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

  // Filtres combinés (norme interne)
  const effectiveFilters = React.useMemo(
    () => ({ ...localFilters, avec_archivees: includeArchived }),
    [localFilters, includeArchived]
  );

  /* --------------------------
  📊 DATA
  --------------------------- */
  const centreQuery = useFormationGrouped("centre", omit(effectiveFilters, ["centre"] as const));
  const deptQuery = useFormationGrouped(
    "departement",
    omit(effectiveFilters, ["departement"] as const)
  );

  const { data, isLoading, isFetching, error } = useFormationOverview(effectiveFilters);
  const k = data?.kpis;

  /* --------------------------
  🎨 Couleur du titre
  --------------------------- */
  let toneColor: "text.secondary" | "success.main" | "warning.main" | "error.main" =
    "text.secondary";

  if (k?.taux_saturation != null) {
    if (k.taux_saturation < 50) toneColor = "success.main";
    else if (k.taux_saturation < 80) toneColor = "warning.main";
    else toneColor = "error.main";
  }

  /* --------------------------
  🧭 Options centre / département
  --------------------------- */
  const centreOptions = React.useMemo(() => {
    return centreQuery.data?.results
      ?.filter((r) => r.group_key || r["centre__nom"])
      .map((r) => ({
        value: String(r.group_key ?? r.centre_id),
        label: r["centre__nom"] ?? r.group_label ?? `Centre ${r.centre_id}`,
      }));
  }, [centreQuery.data]);

  const deptOptions = React.useMemo(() => {
    return deptQuery.data?.results
      ?.filter((r) => r.group_key || r.departement)
      .map((r) => ({
        value: String(r.group_key ?? r.departement),
        label: r.group_label ?? r.departement,
      }));
  }, [deptQuery.data]);

  /* --------------------------
  🎛️ BARRE DE FILTRES
  --------------------------- */
  const filtersBar = (
    <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
      {/* Centre */}
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <Select
          value={localFilters.centre ?? ""}
          onChange={(e) => setLocalFilters((f) => ({ ...f, centre: e.target.value || undefined }))}
          disabled={centreQuery.isLoading}
          displayEmpty
        >
          <MenuItem value="">Tous centres</MenuItem>
          {centreOptions?.map((opt, i) => (
            <MenuItem key={i} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Département */}
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <Select
          value={localFilters.departement ?? ""}
          onChange={(e) =>
            setLocalFilters((f) => ({ ...f, departement: e.target.value || undefined }))
          }
          disabled={deptQuery.isLoading}
          displayEmpty
        >
          <MenuItem value="">Tous départements</MenuItem>
          {deptOptions?.map((opt, i) => (
            <MenuItem key={i} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Archivées */}
      <Tooltip title="Afficher / masquer les formations archivées">
        <Button
          size="small"
          variant={includeArchived ? "contained" : "outlined"}
          color={includeArchived ? "secondary" : "inherit"}
          onClick={() => setIncludeArchived((v) => !v)}
          startIcon={<ArchiveIcon fontSize="small" />}
          sx={{ whiteSpace: "nowrap" }}
        >
          {includeArchived ? "Arch. incluses" : "Arch. exclues"}
        </Button>
      </Tooltip>
    </Stack>
  );

  /* --------------------------
  🎛️ RENDU
  --------------------------- */
  return (
    <DashboardTemplateSaturation
      title={title}
      toneColor={toneColor}
      isFetching={isFetching}
      isLoading={isLoading}
      error={error ? (error as Error).message : null}
      filters={filtersBar}
    >
      {k && (
        <Box display="flex" alignItems="center" gap={2}>
          {/* 🟦 Pastille icône */}
          <Box
            sx={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              bgcolor: "primary.light",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "0.2s ease",
              "&:hover": {
                bgcolor: "primary.main",
                transform: "scale(1.05)",
              },
            }}
          >
            <SpeedIcon color="primary" />
          </Box>

          {/* 📊 Valeurs */}
          <Box flex={1}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 0.5 }}>
              {toFixed0(k.taux_saturation)}%
            </Typography>
            <ColoredProgressBar value={k.taux_saturation} />
          </Box>
        </Box>
      )}
    </DashboardTemplateSaturation>
  );
}
