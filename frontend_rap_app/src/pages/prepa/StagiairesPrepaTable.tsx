import { Chip, IconButton, Link, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import BlockIcon from "@mui/icons-material/Block";
import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { Link as RouterLink } from "react-router-dom";
import type { StagiairePrepa } from "src/types/prepa";

type Props = {
  items: StagiairePrepa[];
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onRestore?: (id: number) => void;
  onHardDelete?: (id: number) => void;
  onRowClick?: (id: number) => void;
};

const boolChip = (value?: boolean) => (
  <Chip size="small" color={value ? "success" : "default"} label={value ? "Oui" : "Non"} />
);

export default function StagiairesPrepaTable({ items, onEdit, onDelete, onRestore, onHardDelete, onRowClick }: Props) {
  if (!items.length) {
    return (
      <Typography sx={{ p: 2, textAlign: "center", color: "text.secondary" }}>
        Aucun stagiaire Prépa trouvé.
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
            <TableCell>Statut</TableCell>
            <TableCell>Atelier 1</TableCell>
            <TableCell>Atelier 3</TableCell>
            <TableCell>Atelier 4</TableCell>
            <TableCell>Atelier 5</TableCell>
            <TableCell>Atelier 6</TableCell>
            <TableCell>Autre</TableCell>
            <TableCell>Ateliers faits</TableCell>
            <TableCell>Dernier atelier</TableCell>
            <TableCell>Prépa d'origine</TableCell>
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
                <Chip
                  size="small"
                  color={
                    item.statut_parcours === "abandon"
                      ? "error"
                      : item.statut_parcours === "parcours_termine"
                        ? "success"
                        : item.statut_parcours === "en_parcours"
                          ? "info"
                          : "default"
                  }
                  label={item.statut_parcours_display ?? item.statut_parcours ?? "—"}
                />
              </TableCell>
              <TableCell>{boolChip(item.atelier_1_realise)}</TableCell>
              <TableCell>{boolChip(item.atelier_3_realise)}</TableCell>
              <TableCell>{boolChip(item.atelier_4_realise)}</TableCell>
              <TableCell>{boolChip(item.atelier_5_realise)}</TableCell>
              <TableCell>{boolChip(item.atelier_6_realise)}</TableCell>
              <TableCell>{boolChip(item.atelier_autre_realise)}</TableCell>
              <TableCell>{item.ateliers_realises_count ?? 0}</TableCell>
              <TableCell>{item.dernier_atelier_label ?? "—"}</TableCell>
              <TableCell>
                {item.prepa_origine_id ? (
                  <Link
                    component={RouterLink}
                    to={`/prepa/stagiaires?prepa_origine=${item.prepa_origine_id}`}
                    underline="hover"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {item.prepa_origine_label ?? `Prépa #${item.prepa_origine_id}`}
                  </Link>
                ) : (
                  "—"
                )}
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
