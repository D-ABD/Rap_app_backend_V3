import { Chip, IconButton, Link, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import BlockIcon from "@mui/icons-material/Block";
import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { Link as RouterLink } from "react-router-dom";
import type { ParticipantDeclic } from "src/types/declic";
import CommentaireContent from "../commentaires/CommentaireContent";

type Props = {
  items: ParticipantDeclic[];
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onRestore?: (id: number) => void;
  onHardDelete?: (id: number) => void;
  onRowClick?: (id: number) => void;
};

export default function ParticipantsDeclicTable({ items, onEdit, onDelete, onRestore, onHardDelete, onRowClick }: Props) {
  if (!items.length) {
    return (
      <Typography sx={{ p: 2, textAlign: "center", color: "text.secondary" }}>
        Aucun participant Déclic trouvé.
      </Typography>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>Nom</TableCell>
            <TableCell>Prénom</TableCell>
            <TableCell>Centre</TableCell>
            <TableCell>Séance Déclic</TableCell>
            <TableCell>Présent</TableCell>
            <TableCell>Commentaire</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} hover onClick={() => item.id && onRowClick?.(item.id)} sx={{ cursor: "pointer" }}>
              <TableCell>{item.nom}</TableCell>
              <TableCell>{item.prenom}</TableCell>
              <TableCell>{item.centre_nom ?? item.centre?.nom ?? "—"}</TableCell>
              <TableCell>
                {item.declic_origine_id ? (
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
                )}
              </TableCell>
              <TableCell>
                <Chip size="small" color={item.present ? "success" : "default"} label={item.present ? "Oui" : "Non"} />
              </TableCell>
              <TableCell>
                <CommentaireContent html={item.commentaire_presence || "<em>—</em>"} />
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
