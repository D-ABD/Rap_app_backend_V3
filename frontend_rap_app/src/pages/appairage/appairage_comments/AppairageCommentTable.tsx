// src/features/appairages/components/AppairageCommentTable.tsx
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  IconButton,
  Chip,
  Checkbox,
  TableContainer,
  Paper,
  TablePagination,
} from "@mui/material";
import { Link } from "react-router-dom";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import type { AppairageCommentDTO } from "../../../types/appairageComment";
import { useState } from "react";

interface Props {
  rows: AppairageCommentDTO[];
  onEdit?: (row: AppairageCommentDTO) => void;
  onDelete?: (row: AppairageCommentDTO) => void;
  linkToAppairage?: (appairageId: number) => string;
  onSelectionChange?: (ids: number[]) => void;
}

const dtfFR =
  typeof Intl !== "undefined"
    ? new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : undefined;

const fmt = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dtfFR ? dtfFR.format(d) : d.toLocaleString("fr-FR");
};

const defaultLinkToAppairage = (id: number) => `/appairages/${id}`;

export default function AppairageCommentTable({
  rows,
  onEdit,
  onDelete,
  linkToAppairage,
  onSelectionChange,
}: Props) {
  const [selected, setSelected] = useState<number[]>([]);

  const toggleRow = (id: number) => {
    setSelected((prev) => {
      const newSel = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      onSelectionChange?.(newSel);
      return newSel;
    });
  };

  const toggleAll = () => {
    if (selected.length === rows.length) {
      setSelected([]);
      onSelectionChange?.([]);
    } else {
      const all = rows.map((r) => r.id);
      setSelected(all);
      onSelectionChange?.(all);
    }
  };

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const paginated = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Paper>
      <TableContainer>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  size="small"
                  indeterminate={selected.length > 0 && selected.length < rows.length}
                  checked={rows.length > 0 && selected.length === rows.length}
                  onChange={toggleAll}
                />
              </TableCell>
              <TableCell>Appairage</TableCell>
              {/* 🆕 Colonne État */}
              <TableCell>État</TableCell>
              <TableCell>Commentaire</TableCell>
              {(onEdit || onDelete) && <TableCell>Actions</TableCell>}
            </TableRow>
          </TableHead>

          <TableBody>
            {paginated.map((r) => {
              const etat =
                r.activite ??
                r.statut_commentaire ??
                (r.statut_commentaire_display?.toLowerCase().includes("archiv")
                  ? "archive"
                  : "actif");
              const color = etat === "archive" ? "default" : "success";

              return (
                <TableRow key={r.id} hover>
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={selected.includes(r.id)}
                      onChange={() => toggleRow(r.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>

                  {/* 🔹 Appairage */}
                  <TableCell sx={{ maxWidth: 340 }}>
                    <Typography
                      component={Link}
                      to={(linkToAppairage || defaultLinkToAppairage)(r.appairage)}
                      variant="body2"
                      fontWeight="bold"
                      sx={{
                        color: "primary.main",
                        textDecoration: "none",
                        "&:hover": { textDecoration: "underline" },
                      }}
                    >
                      Appairage #{r.appairage}
                    </Typography>

                    <Typography variant="caption" color="text.secondary" display="block">
                      {[r.partenaire_nom, r.formation_nom].filter(Boolean).join(" • ") || "—"}
                    </Typography>

                    {(r.formation_numero_offre || r.formation_type_offre) && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Offre {r.formation_numero_offre ?? "?"} — {r.formation_type_offre ?? "?"}
                      </Typography>
                    )}

                    {r.formation_centre && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        {r.formation_centre}
                      </Typography>
                    )}

                    {r.statut_snapshot && (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={r.statut_snapshot}
                        sx={{ mt: 0.5 }}
                      />
                    )}
                  </TableCell>

                  {/* 🆕 Colonne État */}
                  <TableCell>
                    <Chip
                      size="small"
                      color={color === "success" ? "success" : "default"}
                      label={etat === "archive" ? "Archivé" : "Actif"}
                    />
                  </TableCell>

                  {/* 🔹 Auteur + corps du commentaire */}
                  <TableCell>
                    <Typography
                      component={Link}
                      to={`/appairage-commentaires/${r.id}/edit`}
                      variant="body2"
                      fontWeight="bold"
                      sx={{
                        color: "text.primary",
                        textDecoration: "none",
                        "&:hover": { textDecoration: "underline" },
                      }}
                    >
                      {r.created_by_username || "—"} • {fmt(r.created_at)}
                    </Typography>

                    <Typography
                      variant="body2"
                      sx={{
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        mt: 0.5,
                        maxWidth: 400,
                        color: "text.secondary",
                      }}
                      title={r.body}
                    >
                      {r.body || "—"}
                    </Typography>
                  </TableCell>

                  {(onEdit || onDelete) && (
                    <TableCell>
                      {onEdit && (
                        <IconButton aria-label="Éditer" size="small" onClick={() => onEdit(r)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )}
                      {onDelete && (
                        <IconButton
                          aria-label="Supprimer"
                          size="small"
                          color="error"
                          onClick={() => onDelete(r)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={rows.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 20, 50]}
        labelRowsPerPage="Lignes par page"
      />
    </Paper>
  );
}
