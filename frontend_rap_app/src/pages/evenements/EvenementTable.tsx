import { Button, Stack, Typography } from "@mui/material";
import { useMemo } from "react";
import ResponsiveTableTemplate, { type TableColumn } from "../../components/ResponsiveTableTemplate";
import { colCustom, colText } from "../../components/tables/columnFactories";
import InlineStatusBadge from "../../components/ui/InlineStatusBadge";
import type { Evenement } from "../../types/evenement";

type Props = {
  evenements: Evenement[];
  onRowClick: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
};

function getEvenementTypeLabel(evenement: Evenement) {
  if (evenement.type_evenement === "autre" && evenement.description_autre?.trim()) {
    return `Autre : ${evenement.description_autre.trim()}`;
  }

  return evenement.type_evenement_display || evenement.type_evenement;
}

export default function EvenementTable({ evenements, onRowClick, onEdit, onDelete }: Props) {
  const columns = useMemo<TableColumn<Evenement>[]>(
    () => [
      colCustom<Evenement>(
        "type_evenement_display",
        "Événement",
        (row) => (
          <Typography variant="subtitle2" fontWeight={600} color="primary">
            {getEvenementTypeLabel(row)}
          </Typography>
        ),
        { sticky: "left", width: 220 }
      ),
      colText<Evenement>("formation_nom", "Formation"),
      colText<Evenement>("event_date_formatted", "Date"),
      colCustom<Evenement>("lieu", "Lieu", (row) => row.lieu || "—"),
      colCustom<Evenement>("status_label", "Statut", (row) => <InlineStatusBadge label={row.status_label} color="primary" />),
      colCustom<Evenement>("participants", "Participation", (row) =>
        row.participants_prevus != null || row.participants_reels != null
          ? `${row.participants_reels ?? 0} / ${row.participants_prevus ?? 0}`
          : "—"
      ),
    ],
    []
  );

  return (
    <ResponsiveTableTemplate
      columns={columns}
      data={evenements}
      getRowId={(row) => row.id}
      cardTitle={(row) => getEvenementTypeLabel(row)}
      onRowClick={(row) => onRowClick(row.id)}
      actions={(row) => (
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); onEdit(row.id); }}>
            Modifier
          </Button>
          <Button size="small" color="error" variant="outlined" onClick={(e) => { e.stopPropagation(); onDelete(row.id); }}>
            Archiver
          </Button>
        </Stack>
      )}
    />
  );
}
