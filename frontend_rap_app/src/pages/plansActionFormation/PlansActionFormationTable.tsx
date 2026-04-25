// ======================================================
// Tableau responsive — Plans d'action formation (liste LOT 4)
// ======================================================

import { useMemo } from "react";
import { IconButton, Stack, Tooltip, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";

import ResponsiveTableTemplate, {
  type TableColumn,
} from "../../components/ResponsiveTableTemplate";
import type { PlanActionFormationListItem } from "../../types/planActionFormation";

const fmtDate = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-FR");
};

const fmtDateTime = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
};

export type PlansActionFormationTableProps = {
  rows: PlanActionFormationListItem[];
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
  onDownloadPdf: (id: number) => void;
  deleteBusyId?: number | null;
  pdfBusyId?: number | null;
};

/**
 * Présentation tabulaire des plans : période, lieux, statut, volumétrie, audit.
 */
export default function PlansActionFormationTable({
  rows,
  onOpen,
  onDelete,
  onDownloadPdf,
  deleteBusyId,
  pdfBusyId,
}: PlansActionFormationTableProps) {
  const columns: TableColumn<PlanActionFormationListItem>[] = useMemo(
    () => [
      {
        key: "titre",
        label: "Titre",
        render: (row) => (
          <Typography variant="body2" fontWeight={600} component="span">
            {row.titre}
          </Typography>
        ),
      },
      {
        key: "periode",
        label: "Période",
        render: (row) => (
          <Typography variant="body2" component="span" sx={{ whiteSpace: "nowrap" }}>
            {fmtDate(row.date_debut)} → {fmtDate(row.date_fin)}
          </Typography>
        ),
      },
      {
        key: "periode_type_display",
        label: "Échelle",
        render: (row) => (
          <Typography variant="body2" color="text.secondary">
            {row.periode_type_display}
          </Typography>
        ),
      },
      {
        key: "centre_nom",
        label: "Centre",
        render: (row) => (
          <Typography variant="body2" color="text.secondary">
            {row.centre_nom ?? "—"}
          </Typography>
        ),
      },
      {
        key: "formation_nom",
        label: "Formation",
        render: (row) => (
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 220 }} noWrap title={row.formation_nom ?? ""}>
            {row.formation_nom ?? "—"}
          </Typography>
        ),
      },
      {
        key: "statut_display",
        label: "Statut",
        render: (row) => (
          <Typography variant="body2" fontWeight={500}>
            {row.statut_display}
          </Typography>
        ),
      },
      {
        key: "nb_commentaires",
        label: "Commentaires",
        align: "right",
        render: (row) => (
          <Typography variant="body2" component="span">
            {row.nb_commentaires}
          </Typography>
        ),
      },
      {
        key: "created_by_label",
        label: "Auteur",
        render: (row) => (
          <Typography variant="body2" color="text.secondary">
            {row.created_by_label ?? "—"}
          </Typography>
        ),
      },
      {
        key: "updated_at",
        label: "Maj",
        render: (row) => (
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }} component="span">
            {fmtDateTime(row.updated_at)}
          </Typography>
        ),
      },
    ],
    []
  );

  return (
    <ResponsiveTableTemplate<PlanActionFormationListItem>
      columns={columns}
      data={rows}
      getRowId={(r) => r.id}
      cardTitle={(r) => r.titre}
      showActionsColumn
      actions={(row) => {
        const busy = deleteBusyId === row.id;
        const pdfBusy = pdfBusyId === row.id;
        return (
          <Stack direction="row" spacing={0.5} justifyContent="center">
            <Tooltip title="Télécharger le PDF">
              <span>
                <IconButton
                  size="small"
                  disabled={pdfBusy}
                  onClick={() => onDownloadPdf(row.id)}
                  aria-label="Télécharger le plan en PDF"
                >
                  <PictureAsPdfIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Ouvrir le plan">
              <IconButton size="small" onClick={() => onOpen(row.id)} aria-label="Ouvrir le plan">
                <VisibilityOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Modifier">
              <IconButton size="small" onClick={() => onOpen(row.id)} aria-label="Modifier le plan">
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Supprimer">
              <span>
                <IconButton
                  size="small"
                  color="error"
                  disabled={busy}
                  onClick={() => onDelete(row.id)}
                  aria-label="Supprimer le plan"
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        );
      }}
    />
  );
}
