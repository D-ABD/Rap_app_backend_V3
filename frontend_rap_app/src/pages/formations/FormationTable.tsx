// src/pages/formations/FormationTable.tsx
import { useMemo, useState } from "react";
import {
  Button,
  Chip,
  LinearProgress,
  Typography,
  Box,
  Stack,
  Checkbox,
  useTheme,
  IconButton,
  Tooltip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import ArchiveIcon from "@mui/icons-material/Archive";
import UnarchiveIcon from "@mui/icons-material/Unarchive";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import AssignmentIcon from "@mui/icons-material/Assignment";
import type { AppTheme } from "../../theme";
import { useNavigate } from "react-router-dom";
import { Formation } from "../../types/formation";
import { getFieldValue } from "../../utils/getFieldValue";
import ResponsiveTableTemplate, {
  TableColumn,
} from "../../components/ResponsiveTableTemplate";
import FormationDetailModal from "./FormationDetailModal";
import { prefetchFormationDetail } from "../../hooks/useFormations";

interface Props {
  formations: Formation[];
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onRowClick?: (id: number) => void;
  onToggleArchive?: (row: Formation) => void;
  onHardDelete?: (row: Formation) => void;
  visibleColumnKeys?: string[];
  showActionsColumn?: boolean;
  /** Point d’entrée secondaire vers la création de plan d’action (même règles d’accès qu’en création de plan). */
  showPlanActionEntry?: boolean;
}

const formatDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("fr-FR") : "—";

const buildCandidatesUrl = (id: number) => `/candidats?formation=${id}`;
const buildInscritsUrl = (id: number) =>
  `/candidats?formation=${id}&parcours_phase=stagiaire_en_formation`;
const buildProspectionsUrl = (id: number) => `/prospections?formation=${id}`;
const buildAppairagesUrl = (id: number) => `/appairages?formation=${id}`;
const buildEvenementsUrl = (id: number) => `/evenements?formation=${id}`;

const buildPlanActionCreateUrl = (row: Formation) => {
  const p = new URLSearchParams();
  p.set("formation", String(row.id));
  if (row.centre?.id != null) p.set("centre", String(row.centre.id));
  return `/plans-action-formations/create?${p.toString()}`;
};

const getProspectionsCount = (row: Formation) =>
  typeof row.nombre_prospections === "number"
    ? row.nombre_prospections
    : Array.isArray(row.prospections)
      ? row.prospections.length
      : null;

const getAppairagesCount = (row: Formation) =>
  typeof row.nombre_appairages === "number"
    ? row.nombre_appairages
    : Array.isArray(row.appairages)
      ? row.appairages.length
      : null;

const compactTextButtonSx = {
  px: 0,
  py: 0,
  minWidth: 0,
  justifyContent: "flex-start",
  textTransform: "none" as const,
  fontWeight: 600,
  lineHeight: 1.2,
  borderRadius: 1,
};

export default function FormationTable({
  formations,
  selectedIds,
  onToggleSelect,
  onToggleArchive,
  onHardDelete,
  visibleColumnKeys,
  showActionsColumn = true,
  showPlanActionEntry = true,
}: Props) {
  const theme = useTheme<AppTheme>();
  const navigate = useNavigate();

  const getProgressMetricColor = (value?: number | null) => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return theme.palette.grey[600];
    }
    if (value >= 80) return theme.palette.success.main;
    if (value >= 25) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const progressTrackBg =
    theme.palette.mode === "light"
      ? alpha(theme.palette.text.primary, 0.08)
      : alpha(theme.palette.common.white, 0.12);

  const [sortField, _setSortField] = useState<string | null>(null);
  const [sortAsc, _setSortAsc] = useState(true);

  const [openDetail, setOpenDetail] = useState(false);
  const [selectedFormationId, setSelectedFormationId] = useState<number | null>(
    null
  );
  const [selectedFormation, setSelectedFormation] = useState<Formation | null>(
    null
  );

  const handleOpenDetail = (id: number, formation?: Formation) => {
    const preview = formation ?? formations.find((row) => row.id === id) ?? null;
    setSelectedFormation(preview);
    setSelectedFormationId(id);
    setOpenDetail(true);

    if (preview) {
      void prefetchFormationDetail(preview)
        .then((detail) => {
          setSelectedFormation((current) =>
            current?.id === detail.id || !current ? detail : current
          );
        })
        .catch(() => {
          // Ignore prefetch failures here; the modal handles loading and fallback.
        });
    }
  };

  const handleCloseDetail = () => {
    setSelectedFormationId(null);
    setSelectedFormation(null);
    setOpenDetail(false);
  };

  const handleHoverDetail = (formation: Formation) => {
    void prefetchFormationDetail(formation).catch(() => {
      // Ignore hover prefetch failures.
    });
  };

  const sortedFormations = useMemo(() => {
    return [...formations].sort((a, b) => {
      if (!sortField) return 0;

      const aValue = getFieldValue(a, sortField);
      const bValue = getFieldValue(b, sortField);

      if (aValue == null) return 1;
      if (bValue == null) return -1;

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortAsc
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortAsc ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  }, [formations, sortField, sortAsc]);

  const allVisibleIds = useMemo(() => formations.map((f) => f.id), [formations]);
  const allSelected =
    allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.includes(id));
  const partiallySelected =
    !allSelected && allVisibleIds.some((id) => selectedIds.includes(id));

  const toggleSelectAll = () => {
    if (allSelected) {
      allVisibleIds.forEach((id) => {
        if (selectedIds.includes(id)) onToggleSelect(id);
      });
    } else {
      allVisibleIds.forEach((id) => {
        if (!selectedIds.includes(id)) onToggleSelect(id);
      });
    }
  };

  const getStatusChipSx = (bgColor?: string, fallback?: string) => {
    const color = bgColor || fallback || theme.palette.grey[600];
    return {
      fontWeight: 700,
      borderRadius: "999px",
      color,
      backgroundColor: alpha(color, theme.palette.mode === "light" ? 0.12 : 0.22),
      border: `1px solid ${alpha(color, 0.22)}`,
      "& .MuiChip-label": {
        px: 1.1,
      },
    };
  };

  const renderMetricProgress = (value?: number | null) => {
    if (typeof value !== "number") return "—";

    const color = getProgressMetricColor(value);

    return (
      <Stack spacing={0.75} sx={{ minWidth: 92 }}>
        <Typography
          variant="body2"
          fontWeight={800}
          sx={{
            color,
            letterSpacing: 0.1,
          }}
        >
          {Math.round(value)}%
        </Typography>

        <LinearProgress
          variant="determinate"
          value={Math.max(0, Math.min(100, value))}
          sx={{
            height: 7,
            borderRadius: 999,
            backgroundColor: progressTrackBg,
            overflow: "hidden",
            "& .MuiLinearProgress-bar": {
              borderRadius: 999,
              backgroundColor: color,
            },
          }}
        />
      </Stack>
    );
  };

  const renderInlineMeta = (
    items: Array<{ label: string; value: string | number | null | undefined }>
  ) => (
    <Stack spacing={0.2} sx={{ mt: 0.45 }}>
      {items.map((item) => (
        <Stack
          key={item.label}
          direction="row"
          spacing={0.5}
          alignItems="center"
          sx={{ lineHeight: 1.15 }}
        >
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {item.label} :
          </Typography>
          <Typography variant="caption" fontWeight={700} sx={{ color: "text.primary" }}>
            {item.value ?? "—"}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );

  const actionIconButtonSx = {
    borderRadius: 2,
    border: `1px solid ${alpha(theme.palette.divider, 0.85)}`,
    backgroundColor:
      theme.palette.mode === "light"
        ? alpha(theme.palette.common.white, 0.9)
        : alpha(theme.palette.common.white, 0.04),
    transition: "all 0.18s ease",
    "&:hover": {
      transform: "translateY(-1px)",
      backgroundColor:
        theme.palette.mode === "light"
          ? alpha(theme.palette.primary.main, 0.06)
          : alpha(theme.palette.primary.main, 0.12),
      borderColor: alpha(theme.palette.primary.main, 0.28),
    },
  } as const;

  const columns: TableColumn<Formation>[] = [
    {
      key: "select",
      label: (
        <Checkbox
          checked={allSelected}
          indeterminate={partiallySelected}
          onClick={(e) => {
            e.stopPropagation();
            toggleSelectAll();
          }}
          color="primary"
          inputProps={{
            "aria-label": "Tout sélectionner",
          }}
        />
      ),
      sticky: "left",
      width: 40,
      hideable: false,
      render: (row) => (
        <Checkbox
          checked={selectedIds.includes(row.id)}
          onClick={(e) => e.stopPropagation()}
          onChange={() => onToggleSelect(row.id)}
          color="primary"
          inputProps={{
            "aria-label": `Sélectionner la formation ${row.nom ?? row.id}`,
          }}
        />
      ),
    },
    {
      key: "nom",
      label: "Formation",
      sticky: "left",
      width: 190,
      hideable: false,
      render: (row) => (
        <Stack spacing={0.35} sx={{ minWidth: 0, maxWidth: "100%" }}>
          <Typography
            variant="subtitle2"
            fontWeight={800}
            color="primary"
            sx={{
              cursor: "pointer",
              display: "-webkit-box",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "normal",
              wordBreak: "break-word",
              overflowWrap: "anywhere",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              lineHeight: 1.25,
              transition: "opacity 0.18s ease, transform 0.18s ease",
              "&:hover": {
                opacity: 0.9,
                transform: "translateX(1px)",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
              },
            }}
            onClick={() => handleOpenDetail(row.id, row)}
            title={row.nom || "—"}
          >
            {row.nom || "—"}
          </Typography>

          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            ID : {row.id}
          </Typography>
        </Stack>
      ),
    },
    {
      key: "centre.nom",
      label: "Centre",
      render: (row) => (
        <Typography variant="body2" fontWeight={500}>
          {row.centre?.nom || "—"}
        </Typography>
      ),
    },
    {
      key: "activite",
      label: "Activité",
      render: (row) => {
        const isArchived = row.activite === "archivee";
        const color = isArchived
          ? theme.palette.grey[600]
          : theme.palette.success.main;

        return (
          <Chip
            size="small"
            label={isArchived ? "Archivée" : "Active"}
            sx={getStatusChipSx(color)}
          />
        );
      },
    },
    {
      key: "type_offre",
      label: "Type",
      render: (row) =>
        row.type_offre ? (
          <Chip
            size="small"
            label={row.type_offre.libelle || row.type_offre.nom}
            sx={getStatusChipSx(
              row.type_offre.couleur,
              theme.palette.grey[700]
            )}
          />
        ) : (
          "—"
        ),
    },
    {
      key: "statut",
      label: "Statut",
      render: (row) =>
        row.statut ? (
          <Chip
            size="small"
            label={row.statut.libelle || row.statut.nom}
            sx={getStatusChipSx(row.statut.couleur, theme.palette.grey[500])}
          />
        ) : (
          "—"
        ),
    },
    {
      key: "num_offre",
      label: "N° Offre",
      render: (row) => (
        <Typography variant="body2" fontWeight={600}>
          {row.num_offre || "—"}
        </Typography>
      ),
    },
    {
      key: "periode",
      label: "Période",
      width: 160,
      render: (row) => (
        <Stack spacing={0.2}>
          <Typography variant="body2" fontWeight={600}>
            Du {formatDate(row.start_date)}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            au {formatDate(row.end_date)}
          </Typography>
        </Stack>
      ),
    },
    {
      key: "saturation",
      label: "Saturation",
      width: 120,
      render: (row) => renderMetricProgress(row.saturation),
    },
    {
      key: "inscrits_total",
      label: "Inscrits",
      width: 160,
      render: (row) => {
        const crif = row.inscrits_crif ?? 0;
        const mp = row.inscrits_mp ?? 0;
        const total = crif + mp;
        const cap = row.cap ?? 0;

        return (
          <Box>
            <Button
              size="small"
              variant="text"
              sx={{
                ...compactTextButtonSx,
                fontWeight: 800,
                color: "text.primary",
              }}
              onClick={(e) => {
                e.stopPropagation();
                navigate(buildInscritsUrl(row.id));
              }}
            >
              {cap > 0 ? `${total} / ${cap}` : total}
            </Button>

            {renderInlineMeta([
              { label: "CRIF", value: crif },
              { label: "MP", value: mp },
            ])}
          </Box>
        );
      },
    },
    {
      key: "places_restantes_total",
      label: "Places restantes",
      width: 150,
      render: (row) => {
        const crif =
          row.places_restantes_crif ??
          Math.max((row.prevus_crif ?? 0) - (row.inscrits_crif ?? 0), 0);

        const mp =
          row.places_restantes_mp ??
          Math.max((row.prevus_mp ?? 0) - (row.inscrits_mp ?? 0), 0);

        const total = crif + mp;

        return (
          <Box>
            <Typography variant="body2" fontWeight={800} sx={{ color: "text.primary" }}>
              {total} restantes
            </Typography>

            {renderInlineMeta([
              { label: "CRIF", value: crif },
              { label: "MP", value: mp },
            ])}
          </Box>
        );
      },
    },
    {
      key: "entrees_presents_formation",
      label: "En formation",
      width: 150,
      render: (row) => (
        <Stack spacing={0.4}>
          <Typography variant="body2" fontWeight={600}>
            Entrées : {row.entree_formation ?? 0}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Présents : {row.presents_en_formation ?? 0}
          </Typography>
        </Stack>
      ),
    },
    {
      key: "num_kairos",
      label: "N° Kairos",
      render: (row) => (
        <Typography variant="body2" fontWeight={600}>
          {row.num_kairos || "—"}
        </Typography>
      ),
    },
    {
      key: "candidats_entretiens",
      label: "Candidats / Entretiens",
      width: 165,
      render: (row) => (
        <Box>
          <Stack spacing={0.35}>
            <Button
              size="small"
              variant="text"
              sx={compactTextButtonSx}
              onClick={(e) => {
                e.stopPropagation();
                navigate(buildCandidatesUrl(row.id));
              }}
            >
              Candidats : {row.nombre_candidats ?? 0}
            </Button>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Entretiens : {row.nombre_entretiens ?? 0}
            </Typography>
          </Stack>
        </Box>
      ),
    },
    {
      key: "prospections_appairages",
      label: "Prospections / Appairages",
      width: 175,
      render: (row) => (
        <Box>
          <Stack spacing={0.35}>
            <Button
              size="small"
              variant="text"
              sx={compactTextButtonSx}
              onClick={(e) => {
                e.stopPropagation();
                navigate(buildProspectionsUrl(row.id));
              }}
            >
              Prospections : {getProspectionsCount(row) ?? "—"}
            </Button>

            <Button
              size="small"
              variant="text"
              sx={compactTextButtonSx}
              onClick={(e) => {
                e.stopPropagation();
                navigate(buildAppairagesUrl(row.id));
              }}
            >
              Appairages : {getAppairagesCount(row) ?? "—"}
            </Button>
          </Stack>
        </Box>
      ),
    },
    {
      key: "nombre_evenements",
      label: "Événements",
      width: 95,
      render: (row) => (
        <Button
          size="small"
          variant="text"
          sx={{
            ...compactTextButtonSx,
            fontWeight: 700,
          }}
          onClick={(e) => {
            e.stopPropagation();
            navigate(buildEvenementsUrl(row.id));
          }}
        >
          {row.nombre_evenements ?? 0}
        </Button>
      ),
    },
    {
      key: "taux_transformation",
      label: "Transformation",
      width: 130,
      render: (row) => renderMetricProgress(row.taux_transformation),
    },
  ];

  return (
    <>
      <ResponsiveTableTemplate
        columns={columns}
        data={sortedFormations}
        getRowId={(row) => row.id}
        cardTitle={(row) => row.nom || "—"}
        visibleColumnKeys={visibleColumnKeys}
        showActionsColumn={showActionsColumn}
        actions={(row) => (
          <Stack direction="row" spacing={0.75} flexWrap="wrap">
            <Tooltip title="Voir">
              <IconButton
                size="small"
                color="primary"
                sx={actionIconButtonSx}
                aria-label={`Voir la formation ${row.nom ?? row.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenDetail(row.id, row);
                }}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Éditer">
              <IconButton
                size="small"
                color="warning"
                sx={actionIconButtonSx}
                aria-label={`Éditer la formation ${row.nom ?? row.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/formations/${row.id}/edit`);
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {showPlanActionEntry && (
              <Tooltip title="Préparer un plan d'action">
                <IconButton
                  size="small"
                  color="default"
                  sx={actionIconButtonSx}
                  aria-label={`Préparer un plan d'action pour ${row.nom ?? row.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(buildPlanActionCreateUrl(row));
                  }}
                >
                  <AssignmentIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {onToggleArchive && (
              <Tooltip title={row.activite === "archivee" ? "Restaurer" : "Archiver"}>
                <IconButton
                  size="small"
                  color={row.activite === "archivee" ? "success" : "default"}
                  sx={actionIconButtonSx}
                  aria-label={
                    row.activite === "archivee"
                      ? `Restaurer la formation ${row.nom ?? row.id}`
                      : `Archiver la formation ${row.nom ?? row.id}`
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleArchive(row);
                  }}
                >
                  {row.activite === "archivee" ? (
                    <UnarchiveIcon fontSize="small" />
                  ) : (
                    <ArchiveIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            )}

            {onHardDelete && row.activite === "archivee" && (
              <Tooltip title="Supprimer définitivement">
                <IconButton
                  size="small"
                  color="error"
                  sx={actionIconButtonSx}
                  aria-label={`Supprimer définitivement la formation ${row.nom ?? row.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onHardDelete(row);
                  }}
                >
                  <DeleteForeverIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        )}
        onRowClick={(row) => handleOpenDetail(row.id, row)}
        onRowHover={handleHoverDetail}
      />

      {selectedFormationId !== null && (
        <FormationDetailModal
          open={openDetail}
          onClose={handleCloseDetail}
          formationId={selectedFormationId}
          formation={selectedFormation}
        />
      )}
    </>
  );
}