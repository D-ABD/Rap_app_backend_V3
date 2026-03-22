// src/pages/formations/FormationTable.tsx
import { useMemo, useState } from "react";
import { Button, Chip, LinearProgress, Typography, Box, Stack, Checkbox } from "@mui/material";
import { Formation } from "../../types/formation";
import { getFieldValue } from "../../utils/getFieldValue";
import ResponsiveTableTemplate, { TableColumn } from "../../components/ResponsiveTableTemplate";
import FormationDetailModal from "./FormationDetailModal";

interface Props {
  formations: Formation[];
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onRowClick?: (id: number) => void;
}

const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

export default function FormationTable({ formations, selectedIds, onToggleSelect }: Props) {
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
            backgroundColor: row.activite === "archivee" ? "#9e9e9e" : "#4caf50",
            color: "#fff",
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
              backgroundColor: row.type_offre.couleur || "#546e7a",
              color: "#fff",
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
              backgroundColor: row.statut.couleur || "#9e9e9e",
              color: "#fff",
              fontWeight: 500,
            }}
          />
        ) : (
          "—"
        ),
    },
    { key: "num_offre", label: "N° Offre" },
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
      key: "intitule_diplome",
      label: "Diplôme / Titre visé",
      render: (r) => r.intitule_diplome || "—",
    },
    { key: "code_rncp", label: "Code RNCP", render: (r) => r.code_rncp || "—" },
    {
      key: "total_heures",
      label: "Durée (h)",
      render: (r) => r.total_heures ?? "—",
    },
    { key: "nombre_candidats", label: "Candidats" },
    { key: "nombre_entretiens", label: "Entretiens" },
    {
      key: "inscrits",
      label: "Capacité / Inscrits",
      render: (row) => {
        const inscrits = (row.inscrits_crif ?? 0) + (row.inscrits_mp ?? 0);
        const cap = row.cap ?? 0;
        const pct = cap > 0 ? (inscrits / cap) * 100 : 0;

        return (
          <Box>
            <Typography variant="body2">
              {inscrits} / {cap || "—"} inscrits
            </Typography>
            {cap > 0 && (
              <LinearProgress
                variant="determinate"
                value={pct}
                sx={{
                  mt: 0.5,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: "#eee",
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: pct > 95 ? "#c62828" : pct > 75 ? "#ed6c02" : "#2e7d32",
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
            <Typography variant="body2" fontWeight={500}>
              {Math.round(row.saturation)}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={row.saturation}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: "#eee",
                "& .MuiLinearProgress-bar": {
                  backgroundColor:
                    row.saturation > 95 ? "#d32f2f" : row.saturation > 75 ? "#ed6c02" : "#2e7d32",
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
            <Typography variant="body2" fontWeight={500}>
              {row.taux_transformation}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={row.taux_transformation}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: "#eee",
                "& .MuiLinearProgress-bar": {
                  backgroundColor:
                    row.taux_transformation > 60
                      ? "#2e7d32"
                      : row.taux_transformation > 30
                        ? "#ed6c02"
                        : "#d32f2f",
                },
              }}
            />
          </Stack>
        ) : (
          "—"
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
                window.location.href = `/formations/${row.id}/edit`;
              }}
            >
              Éditer
            </Button>
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
