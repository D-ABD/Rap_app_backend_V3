// src/pages/formations/FormationTable.tsx
import { useMemo, useState } from "react";
import { Button, Chip, LinearProgress, Typography, Box, Stack, Checkbox, useTheme } from "@mui/material";
import type { AppTheme } from "../../theme";
import { useNavigate } from "react-router-dom";
import { Formation } from "../../types/formation";
import { getFieldValue } from "../../utils/getFieldValue";
import ResponsiveTableTemplate, { TableColumn } from "../../components/ResponsiveTableTemplate";
import FormationDetailModal from "./FormationDetailModal";

interface Props {
  formations: Formation[];
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onRowClick?: (id: number) => void;
  onToggleArchive?: (row: Formation) => void;
  onHardDelete?: (row: Formation) => void;
}

const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");
const buildCandidatesUrl = (id: number) => `/candidats?formation=${id}`;
const buildInscritsUrl = (id: number) => `/candidats?formation=${id}&parcours_phase=stagiaire_en_formation`;
const buildProspectionsUrl = (id: number) => `/prospections?formation=${id}`;
const buildAppairagesUrl = (id: number) => `/appairages?formation=${id}`;
const buildEvenementsUrl = (id: number) => `/evenements?formation=${id}`;
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

export default function FormationTable({
  formations,
  selectedIds,
  onToggleSelect,
  onToggleArchive,
  onHardDelete,
}: Props) {
  const theme = useTheme<AppTheme>();
  const navigate = useNavigate();
  const getProgressMetricColor = (value?: number | null) => {
    if (typeof value !== "number" || Number.isNaN(value)) return theme.palette.grey[600];
    if (value >= 80) return theme.palette.success.main;
    if (value >= 25) return theme.palette.warning.main;
    return theme.palette.error.main;
  };
  const progressTrackBg =
    theme.palette.mode === "light" ? theme.palette.grey[200] : theme.palette.grey[800];
  const [sortField, _setSortField] = useState<string | null>(null); // ✅ renommé
  const [sortAsc, _setSortAsc] = useState(true); // ✅ renommé

  const [openDetail, setOpenDetail] = useState(false);
  const [selectedFormationId, setSelectedFormationId] = useState<number | null>(null);

  const handleOpenDetail = (id: number) => {
    setSelectedFormationId(id);
    setOpenDetail(true);
  };

  const handleCloseDetail = () => {
    setSelectedFormationId(null);
    setOpenDetail(false);
  };

  const sortedFormations = useMemo(() => {
    return [...formations].sort((a, b) => {
      if (!sortField) return 0;
      const aValue = getFieldValue(a, sortField);
      const bValue = getFieldValue(b, sortField);
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortAsc ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortAsc ? aValue - bValue : bValue - aValue;
      }
      return 0;
    });
  }, [formations, sortField, sortAsc]);

  // === Gestion de la sélection globale ===
  const allVisibleIds = useMemo(() => formations.map((f) => f.id), [formations]);
  const allSelected =
    allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.includes(id));
  const partiallySelected = !allSelected && allVisibleIds.some((id) => selectedIds.includes(id));

  const toggleSelectAll = () => {
    if (allSelected) {
      // Désélectionner tous les visibles
      allVisibleIds.forEach((id) => {
        if (selectedIds.includes(id)) onToggleSelect(id);
      });
    } else {
      // Sélectionner tous les visibles
      allVisibleIds.forEach((id) => {
        if (!selectedIds.includes(id)) onToggleSelect(id);
      });
    }
  };

  /* === Colonnes === */
  const columns: TableColumn<Formation>[] = [
    {
      key: "select",
      label: (
        <Checkbox
          checked={allSelected}
          indeterminate={partiallySelected}
          onClick={(e) => {
            e.stopPropagation(); // 🔒 évite d’ouvrir la ligne
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
      render: (row) => (
        <Checkbox
          checked={selectedIds.includes(row.id)}
          onClick={(e) => e.stopPropagation()} // 🔒 empêche clic ligne
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
      width: 240,
      render: (row) => (
        <Typography
          variant="subtitle2"
          fontWeight={600}
          color="primary"
          sx={{ cursor: "pointer" }}
          onClick={() => handleOpenDetail(row.id)}
        >
          {row.nom || "—"}
        </Typography>
      ),
    },
    {
      key: "centre.nom",
      label: "Centre",
      render: (row) => row.centre?.nom || "—",
    },
    {
      key: "activite",
      label: "Activité",
      render: (row) => (
        <Chip
          size="small"
          label={row.activite === "archivee" ? "Archivée" : "Active"}
          sx={{
            backgroundColor:
              row.activite === "archivee" ? theme.palette.grey[500] : theme.palette.success.main,
            color: theme.palette.common.white,
            fontWeight: 500,
          }}
        />
      ),
    },
    {
      key: "type_offre",
      label: "Type",
      render: (row) =>
        row.type_offre ? (
          <Chip
            size="small"
            label={row.type_offre.libelle || row.type_offre.nom}
            sx={{
              backgroundColor: row.type_offre.couleur || theme.palette.grey[700],
              color: theme.palette.common.white,
              fontWeight: 500,
            }}
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
            sx={{
              backgroundColor: row.statut.couleur || theme.palette.grey[500],
              color: theme.palette.common.white,
              fontWeight: 500,
            }}
          />
        ) : (
          "—"
        ),
    },
    { key: "num_offre", label: "N° Offre" },
    { key: "num_kairos", label: "N° Kairos", render: (row) => row.num_kairos || "—" },
    {
      key: "start_date",
      label: "Début",
      render: (row) => formatDate(row.start_date),
    },
    {
      key: "end_date",
      label: "Fin",
      render: (row) => formatDate(row.end_date),
    },
    {
      key: "total_heures",
      label: "Durée (h)",
      render: (r) => r.total_heures ?? "—",
    },
    {
      key: "nombre_candidats",
      label: "Candidats",
      render: (row) => (
        <Button
          size="small"
          variant="text"
          sx={{ px: 0, minWidth: 0 }}
          onClick={(e) => {
            e.stopPropagation();
            navigate(buildCandidatesUrl(row.id));
          }}
        >
          {row.nombre_candidats ?? 0}
        </Button>
      ),
    },
    { key: "nombre_entretiens", label: "Entretiens" },
    {
      key: "nombre_evenements",
      label: "Événements",
      render: (row) => (
        <Button
          size="small"
          variant="text"
          sx={{ px: 0, minWidth: 0 }}
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
      key: "cap",
      label: "Capacité",
      render: (row) => row.cap ?? "—",
    },
    {
      key: "prevus_crif",
      label: "Prévu CRIF",
      render: (row) => row.prevus_crif ?? 0,
    },
    {
      key: "prevus_mp",
      label: "Prévu MP",
      render: (row) => row.prevus_mp ?? 0,
    },
    {
      key: "inscrits_crif",
      label: "Inscrits CRIF",
      render: (row) => row.inscrits_crif ?? 0,
    },
    {
      key: "inscrits_mp",
      label: "Inscrits MP",
      render: (row) => row.inscrits_mp ?? 0,
    },
    {
      key: "inscrits_total",
      label: "Inscrits total",
      render: (row) => row.inscrits_total ?? ((row.inscrits_crif ?? 0) + (row.inscrits_mp ?? 0)),
    },
    {
      key: "prevus_total",
      label: "Prévu total",
      render: (row) => row.prevus_total ?? ((row.prevus_crif ?? 0) + (row.prevus_mp ?? 0)),
    },
    {
      key: "places_restantes_crif_mp",
      label: "Places restantes MP/CRIF",
      render: (row) =>
        `MP ${row.places_restantes_mp ?? Math.max((row.prevus_mp ?? 0) - (row.inscrits_mp ?? 0), 0)} / CRIF ${row.places_restantes_crif ?? Math.max((row.prevus_crif ?? 0) - (row.inscrits_crif ?? 0), 0)}`,
    },
    {
      key: "places_restantes",
      label: "Places restantes total",
      render: (row) => row.places_restantes ?? row.places_disponibles ?? "—",
    },
    {
      key: "inscrits",
      label: "Inscrits détaillés",
      render: (row) => {
        const inscrits = (row.inscrits_crif ?? 0) + (row.inscrits_mp ?? 0);
        const cap = row.cap ?? 0;
        const pct = cap > 0 ? (inscrits / cap) * 100 : 0;

        return (
          <Box>
            <Button
              size="small"
              variant="text"
              sx={{ px: 0, minWidth: 0 }}
              onClick={(e) => {
                e.stopPropagation();
                navigate(buildInscritsUrl(row.id));
              }}
            >
              {inscrits} / {cap || "—"} inscrits
            </Button>
            {cap > 0 && (
              <LinearProgress
                variant="determinate"
                value={pct}
                sx={{
                  mt: 0.5,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: progressTrackBg,
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: getProgressMetricColor(pct),
                  },
                }}
              />
            )}
          </Box>
        );
      },
    },
    {
      key: "saturation",
      label: "Saturation",
      render: (row) =>
        typeof row.saturation === "number" ? (
          <Stack spacing={0.5}>
            <Typography
              variant="body2"
              fontWeight={700}
              sx={{ color: getProgressMetricColor(row.saturation) }}
            >
              {Math.round(row.saturation)}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={row.saturation}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: progressTrackBg,
                "& .MuiLinearProgress-bar": {
                  backgroundColor: getProgressMetricColor(row.saturation),
                },
              }}
            />
          </Stack>
        ) : (
          "—"
        ),
    },
    {
      key: "taux_transformation",
      label: "Transformation",
      render: (row) =>
        typeof row.taux_transformation === "number" ? (
          <Stack spacing={0.5}>
            <Typography
              variant="body2"
              fontWeight={700}
              sx={{ color: getProgressMetricColor(row.taux_transformation) }}
            >
              {row.taux_transformation}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={row.taux_transformation}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: progressTrackBg,
                "& .MuiLinearProgress-bar": {
                  backgroundColor: getProgressMetricColor(row.taux_transformation),
                },
              }}
            />
          </Stack>
        ) : (
          "—"
        ),
    },
    {
      key: "nombre_prospections",
      label: "Nb prospections",
      render: (row) => (
        <Button
          size="small"
          variant="text"
          sx={{ px: 0, minWidth: 0 }}
          onClick={(e) => {
            e.stopPropagation();
            navigate(buildProspectionsUrl(row.id));
          }}
        >
          {getProspectionsCount(row) ?? "—"}
        </Button>
      ),
    },
    {
      key: "nombre_appairages",
      label: "Nb appairages",
      render: (row) => (
        <Button
          size="small"
          variant="text"
          sx={{ px: 0, minWidth: 0 }}
          onClick={(e) => {
            e.stopPropagation();
            navigate(buildAppairagesUrl(row.id));
          }}
        >
          {getAppairagesCount(row) ?? "—"}
        </Button>
      ),
    },
  ];

  return (
    <>
      <ResponsiveTableTemplate
        columns={columns}
        data={sortedFormations}
        getRowId={(row) => row.id}
        cardTitle={(row) => row.nom || "—"}
        actions={(row) => (
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              color="primary"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDetail(row.id);
              }}
            >
              Voir
            </Button>
            <Button
              size="small"
              variant="contained"
              color="warning"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/formations/${row.id}/edit`);
              }}
            >
              Éditer
            </Button>
            {onToggleArchive && (
              <Button
                size="small"
                variant="outlined"
                color={row.activite === "archivee" ? "success" : "inherit"}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleArchive(row);
                }}
              >
                {row.activite === "archivee" ? "Restaurer" : "Archiver"}
              </Button>
            )}
            {onHardDelete && row.activite === "archivee" && (
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={(e) => {
                  e.stopPropagation();
                  onHardDelete(row);
                }}
              >
                Supprimer définitivement
              </Button>
            )}
          </Stack>
        )}
        onRowClick={(row) => handleOpenDetail(row.id)}
      />

      {selectedFormationId && (
        <FormationDetailModal
          open={openDetail}
          onClose={handleCloseDetail}
          formationId={selectedFormationId}
        />
      )}
    </>
  );
}
