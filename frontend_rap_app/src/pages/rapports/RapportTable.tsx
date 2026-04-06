import { Box, Button, Chip, Paper, Typography } from "@mui/material";
import { useMemo } from "react";
import ResponsiveTableTemplate, { type TableColumn } from "../../components/ResponsiveTableTemplate";
import type { Rapport } from "../../types/rapport";

interface Props {
  rapports: Rapport[];
  onOpen: (rapport: Rapport) => void;
  onEdit: (id: number) => void;
  onDelete: (rapport: Rapport) => void;
  onExport: (rapport: Rapport) => void;
}

function getSummary(rapport: Rapport) {
  const summary = (rapport.donnees?.phase_summary as Record<string, unknown> | undefined) ?? {};
  const candidats = (summary.candidats as Record<string, unknown> | undefined) ?? {};
  return {
    total: Number(candidats.total ?? 0),
    enFormation: Number(candidats.stagiaires_en_formation ?? 0),
    abandons: Number(candidats.abandons ?? 0),
  };
}

export default function RapportTable({ rapports, onOpen, onEdit, onDelete, onExport }: Props) {
  const columns = useMemo<TableColumn<Rapport>[]>(
    () => [
      {
        key: "nom",
        label: "Nom",
        sticky: "left",
        width: 200,
        render: (row) => <Typography fontWeight={600}>{row.nom}</Typography>,
      },
      {
        key: "type_rapport_display",
        label: "Type",
        render: (row) => row.type_rapport_display || row.type_rapport,
      },
      {
        key: "periode_display",
        label: "Période",
        render: (row) => row.periode_display || row.periode,
      },
      {
        key: "dates_range",
        label: "Dates",
        render: (row) => (
          <>
            {row.date_debut} {"->"} {row.date_fin}
          </>
        ),
      },
      {
        key: "synthese",
        label: "Synthèse",
        render: (row) => {
          const summary = getSummary(row);
          return summary.total > 0 ? (
            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
              <Chip size="small" label={`Candidats ${summary.total}`} />
              <Chip size="small" color="success" label={`Formation ${summary.enFormation}`} />
              {summary.abandons > 0 ? <Chip size="small" color="error" label={`Abandons ${summary.abandons}`} /> : null}
            </Box>
          ) : (
            "—"
          );
        },
      },
      {
        key: "format_display",
        label: "Format",
        render: (row) => row.format_display || row.format,
      },
      {
        key: "centre_nom",
        label: "Centre",
        render: (row) => row.centre_nom || "—",
      },
      {
        key: "formation_nom",
        label: "Formation",
        render: (row) => row.formation_nom || "—",
      },
    ],
    []
  );

  return (
    <ResponsiveTableTemplate
      columns={columns}
      data={rapports}
      getRowId={(row) => row.id}
      cardTitle={(row) => row.nom}
      onRowClick={(row) => onOpen(row)}
      tableContainerComponent={Paper}
      actionsAlign="right"
      actions={(row) => (
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Button size="small" onClick={() => onExport(row)}>
            Exporter
          </Button>
          <Button size="small" onClick={() => onEdit(row.id)}>
            Modifier
          </Button>
          <Button size="small" color="error" onClick={() => onDelete(row)}>
            Archiver
          </Button>
        </Box>
      )}
    />
  );
}
