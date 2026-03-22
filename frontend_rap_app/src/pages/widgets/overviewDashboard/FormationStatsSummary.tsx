import * as React from "react";
import {
  Card,
  Typography,
  Box,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  FormControl,
  Select,
  MenuItem,
  useTheme,
} from "@mui/material";
import ArchiveIcon from "@mui/icons-material/Archive";
import {
  useFormationOverview,
  useFormationGrouped,
  GroupRow,
  Filters,
} from "../../../types/formationStats";

/* ──────────────────────────────────────────────────────────── */
/* Utilitaire pour retirer certaines clés d'un objet           */
/* ──────────────────────────────────────────────────────────── */
function omit<T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Omit<T, K> {
  const clone = { ...obj };
  for (const k of keys) delete clone[k];
  return clone;
}

/* ──────────────────────────────────────────────────────────── */
/* Composant principal                                         */
/* ──────────────────────────────────────────────────────────── */
export default function FormationStatsSummary({
  title = "Statistiques des formations",
  filters = {},
}: {
  title?: string;
  filters?: Filters;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  // 🔘 Inclut les archivées par défaut
  const [includeArchived] = React.useState(true);

  // 🔎 Filtres locaux
  const [localFilters, setLocalFilters] = React.useState<Filters>(filters ?? {});

  // 🧠 Fusion filtres + flag archivées
  const effectiveFilters = React.useMemo(
    () => ({
      ...localFilters,
      ...(includeArchived ? { avec_archivees: true } : {}),
    }),
    [localFilters, includeArchived]
  );

  // 📊 Requêtes de données
  const centreQuery = useFormationGrouped(
    "centre",
    omit<Filters, "centre">(effectiveFilters, ["centre"])
  );
  const deptQuery = useFormationGrouped(
    "departement",
    omit<Filters, "departement">(effectiveFilters, ["departement"])
  );
  const { data, isLoading, error } = useFormationOverview(effectiveFilters);

  const k = data?.kpis;

  // 🕒 États de chargement / erreur
  if (isLoading) {
    return (
      <Card
        sx={{
          p: 4,
          textAlign: "center",
          borderRadius: 3,
          bgcolor: theme.palette.background.paper,
          color: theme.palette.text.primary,
        }}
      >
        <CircularProgress size={24} />
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ p: 3, borderRadius: 3 }}>
        <Alert severity="error">{(error as Error).message}</Alert>
      </Card>
    );
  }

  if (!k) return null;

  // 🎨 Palette dynamique selon le thème
  const cardBg = isDark
    ? "linear-gradient(180deg, #1E1E1E 0%, #121212 100%)"
    : "linear-gradient(180deg, #fafafa 0%, #ffffff 100%)";

  const statBoxBg = isDark ? "rgba(255,255,255,0.04)" : "background.paper";
  const statShadow = isDark ? "0 2px 6px rgba(0,0,0,0.5)" : "0 2px 6px rgba(0,0,0,0.05)";

  const stats = [
    { label: "Actives", value: k.nb_actives ?? 0, color: theme.palette.primary.main },
    { label: "À venir", value: k.nb_a_venir ?? 0, color: theme.palette.info.main },
    { label: "Terminées", value: k.nb_terminees ?? 0, color: theme.palette.success.main },
    { label: "Annulées", value: k.nb_annulees ?? 0, color: theme.palette.error.main },
    {
      label: "Archivées",
      value: k.nb_archivees ?? 0,
      color: isDark ? theme.palette.grey[400] : theme.palette.text.secondary,
    },
  ];

  return (
    <Card
      sx={{
        p: 3,
        borderRadius: 3,
        boxShadow: isDark ? "0 2px 12px rgba(0,0,0,0.6)" : 2,
        background: cardBg,
        transition: "all 0.3s ease",
      }}
    >
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
        flexWrap="wrap"
        gap={1.5}
      >
        <Typography variant="h6" fontWeight={700} sx={{ color: theme.palette.text.primary }}>
          {title}
        </Typography>

        <Chip
          icon={<ArchiveIcon fontSize="small" />}
          label="Avec archivées"
          size="small"
          variant="outlined"
          sx={{
            borderRadius: 2,
            fontSize: 12,
            fontWeight: 500,
            color: isDark ? theme.palette.grey[400] : theme.palette.text.secondary,
            borderColor: isDark ? theme.palette.grey[700] : theme.palette.grey[300],
            bgcolor: isDark ? "rgba(255,255,255,0.05)" : "transparent",
          }}
        />
      </Box>

      {/* Filtres */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        {/* Centre */}
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select
            value={localFilters.centre ?? ""}
            onChange={(e) =>
              setLocalFilters((f) => ({
                ...f,
                centre: e.target.value || undefined,
              }))
            }
            displayEmpty
            sx={{
              bgcolor: isDark ? "rgba(255,255,255,0.06)" : "background.paper",
              borderRadius: 1,
            }}
          >
            <MenuItem value="">Tous centres</MenuItem>
            {centreQuery.data?.results?.map((r: GroupRow, i: number) => {
              const label =
                (typeof r["centre__nom"] === "string" && r["centre__nom"]) ||
                (typeof r.group_label === "string" && r.group_label) ||
                undefined;
              const value = r.group_key ?? r.centre_id ?? label;
              return value && label ? (
                <MenuItem key={i} value={String(value)}>
                  {label}
                </MenuItem>
              ) : null;
            })}
          </Select>
        </FormControl>

        {/* Département */}
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <Select
            value={localFilters.departement ?? ""}
            onChange={(e) =>
              setLocalFilters((f) => ({
                ...f,
                departement: e.target.value || undefined,
              }))
            }
            displayEmpty
            sx={{
              bgcolor: isDark ? "rgba(255,255,255,0.06)" : "background.paper",
              borderRadius: 1,
            }}
          >
            <MenuItem value="">Tous départements</MenuItem>
            {deptQuery.data?.results?.map((r: GroupRow, i: number) => {
              const label =
                (typeof r.group_label === "string" && r.group_label) ||
                (typeof r.departement === "string" && r.departement) ||
                undefined;
              const value = r.group_key ?? r.departement ?? label;
              return value && label ? (
                <MenuItem key={i} value={String(value)}>
                  {label}
                </MenuItem>
              ) : null;
            })}
          </Select>
        </FormControl>
      </Box>

      {/* Stats */}
      <Grid container spacing={2.5}>
        {stats.map((s) => (
          <Grid item xs={6} sm={4} md={2.4} key={s.label}>
            <Box
              sx={{
                p: 2.5,
                borderRadius: 2.5,
                textAlign: "center",
                bgcolor: statBoxBg,
                boxShadow: statShadow,
                transition: "all 0.2s ease",
                "&:hover": {
                  boxShadow: isDark ? "0 4px 14px rgba(0,0,0,0.7)" : "0 4px 12px rgba(0,0,0,0.08)",
                  transform: "translateY(-2px)",
                },
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  color: s.color,
                  fontWeight: 700,
                  mb: 0.5,
                  lineHeight: 1.2,
                }}
              >
                {s.value}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}
              >
                {s.label}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Card>
  );
}
