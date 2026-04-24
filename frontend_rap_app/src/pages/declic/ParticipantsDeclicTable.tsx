import { useMemo } from "react";
import { Chip, IconButton, Link, Stack, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import BlockIcon from "@mui/icons-material/Block";
import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { Link as RouterLink } from "react-router-dom";
import type { ParticipantDeclic } from "src/types/declic";
import CommentaireContent from "../commentaires/CommentaireContent";
import ResponsiveTableTemplate, {
  type TableColumn,
} from "../../components/ResponsiveTableTemplate";

type Props = {
  items: ParticipantDeclic[];
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onRestore?: (id: number) => void;
  onHardDelete?: (id: number) => void;
  onRowClick?: (id: number) => void;
};

export default function ParticipantsDeclicTable({
  items,
  onEdit,
  onDelete,
  onRestore,
  onHardDelete,
  onRowClick,
}: Props) {
  const columns = useMemo<TableColumn<ParticipantDeclic>[]>(
    () => [
      { key: "nom", label: "Nom", render: (item) => item.nom },
      { key: "prenom", label: "Prénom", render: (item) => item.prenom },
      {
        key: "centre",
        label: "Centre",
        render: (item) => item.centre_nom ?? item.centre?.nom ?? "—",
      },
      {
        key: "seance",
        label: "Séance Déclic",
        noWrap: false,
        render: (item) =>
          item.declic_origine_id ? (
            <Link
              component={RouterLink}
              to={`/participants-declic?declic_origine=${item.declic_origine_id}`}
              underline="hover"
              onClick={(e) => e.stopPropagation()}
            >
              {item.declic_origine_label ?? `Déclic #${item.declic_origine_id}`}
            </Link>
          ) : (
            "—"
          ),
      },
      {
        key: "present",
        label: "Présent",
        render: (item) => (
          <Chip
            size="small"
            color={item.present ? "success" : "default"}
            label={item.present ? "Oui" : "Non"}
          />
        ),
      },
      {
        key: "commentaire",
        label: "Commentaire",
        noWrap: false,
        render: (item) => <CommentaireContent html={item.commentaire_presence || "<em>—</em>"} />,
      },
    ],
    []
  );

  if (!items.length) {
    return (
      <Typography sx={{ p: 2, textAlign: "center", color: "text.secondary" }}>
        Aucun participant Déclic trouvé.
      </Typography>
    );
  }

  return (
    <ResponsiveTableTemplate<ParticipantDeclic>
      columns={columns}
      data={items}
      getRowId={(item) => item.id ?? `tmp-${item.nom}-${item.prenom}`}
      onRowClick={
        onRowClick
          ? (item) => {
              if (item.id) onRowClick(item.id);
            }
          : undefined
      }
      cardTitle={(item) => `${item.nom} ${item.prenom}`.trim() || "Participant"}
      actions={(item) => (
        <Stack direction="row" spacing={1}>
          {item.id ? (
            <IconButton size="small" onClick={() => onRowClick?.(item.id!)}>
              <VisibilityIcon fontSize="inherit" />
            </IconButton>
          ) : null}
          {item.id && onEdit ? (
            <IconButton size="small" color="primary" onClick={() => onEdit(item.id!)}>
              <EditIcon fontSize="inherit" />
            </IconButton>
          ) : null}
          {item.id && onDelete && (item.is_active ?? true) ? (
            <IconButton size="small" color="error" onClick={() => onDelete(item.id!)}>
              <DeleteIcon fontSize="inherit" />
            </IconButton>
          ) : null}
          {item.id && onRestore && !(item.is_active ?? true) ? (
            <IconButton size="small" color="success" onClick={() => onRestore(item.id!)}>
              <RestoreFromTrashIcon fontSize="inherit" />
            </IconButton>
          ) : null}
          {item.id && onHardDelete && !(item.is_active ?? true) ? (
            <IconButton size="small" color="error" onClick={() => onHardDelete(item.id!)}>
              <BlockIcon fontSize="inherit" />
            </IconButton>
          ) : null}
        </Stack>
      )}
      showActionsColumn
    />
  );
}
