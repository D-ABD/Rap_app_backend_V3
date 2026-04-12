import { Link } from "react-router-dom";
import {
  IconButton,
  Stack,
  Typography,
  Box,
  Checkbox,
  useMediaQuery,
  useTheme,
  Chip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";
import BusinessIcon from "@mui/icons-material/Business";
import PersonIcon from "@mui/icons-material/Person";

import ResponsiveTableTemplate, { TableColumn } from "../../../components/ResponsiveTableTemplate";
import type { ProspectionCommentDTO } from "../../../types/prospectionComment";
import { useState } from "react";
import CommentaireContent from "../../commentaires/CommentaireContent";
import type { AppTheme } from "../../../theme";

interface Props {
  rows: ProspectionCommentDTO[];
  onEdit?: (row: ProspectionCommentDTO) => void;
  onDelete?: (row: ProspectionCommentDTO) => void;
  onRestore?: (row: ProspectionCommentDTO) => void;
  onHardDelete?: (row: ProspectionCommentDTO) => void;
  canHardDelete?: boolean;
  linkToProspection?: (prospectionId: number) => string;
  onSelectionChange?: (ids: number[]) => void; // 🔹 pour l’export
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

export default function ProspectionCommentTable({
  rows,
  onEdit,
  onDelete,
  onRestore,
  onHardDelete,
  canHardDelete = false,
  linkToProspection,
  onSelectionChange,
}: Props) {
  const [selected, setSelected] = useState<number[]>([]);
  const theme = useTheme<AppTheme>();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const toggleRow = (id: number) => {
    setSelected((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
      onSelectionChange?.(next);
      return next;
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

  const columns: TableColumn<ProspectionCommentDTO>[] = [
    {
      key: "select",
      label: (
        <Checkbox
          size="small"
          indeterminate={selected.length > 0 && selected.length < rows.length}
          checked={rows.length > 0 && selected.length === rows.length}
          onChange={toggleAll}
        />
      ),
      width: 40,
      sticky: "left",
      render: (r) => (
        <Checkbox
          size="small"
          checked={selected.includes(r.id)}
          onChange={() => toggleRow(r.id)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },

    // 🆕 Colonne ÉTAT (juste avant Prospection)
    {
      key: "etat",
      label: "État",
      width: isMobile ? 80 : 100,
      render: (r) => {
        const isArchived = r.activite === "archive" || r.est_archive === true;
        return (
          <Chip
            label={isArchived ? "Archivé" : "Actif"}
            color={isArchived ? "default" : "success"}
            size="small"
            variant={isArchived ? "outlined" : "filled"}
          />
        );
      },
    },

    {
      key: "prospection",
      label: "Prospection / Formation",
      sticky: "left",
      width: isMobile ? 160 : 200,
      render: (r) => {
        const label =
          r.prospection_text?.trim() ||
          [r.partenaire_nom, r.formation_nom].filter(Boolean).join(" • ") ||
          `#${r.prospection}`;

        return (
          <Box display="flex" flexDirection="column" gap={0.5}>
            <Typography
              variant="body2"
              fontWeight="bold"
              component={linkToProspection ? Link : "span"}
              to={linkToProspection ? linkToProspection(r.prospection) : undefined}
              style={{
                textDecoration: linkToProspection ? "underline" : "none",
              }}
              noWrap
            >
              {label}
            </Typography>
            {r.partenaire_nom && !isMobile && (
              <Box display="flex" alignItems="center" gap={0.5}>
                <BusinessIcon fontSize="small" />
                <Typography variant="caption" color="text.secondary" noWrap>
                  {r.partenaire_nom}
                </Typography>
              </Box>
            )}
            {r.formation_centre_nom && !isMobile && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {r.formation_centre_nom}
              </Typography>
            )}
          </Box>
        );
      },
    },

    {
      key: "owner",
      label: "👤 Candidat",
      width: isMobile ? 100 : 120,
      render: (r) => (
        <Typography variant="body2" fontWeight="bold" noWrap>
          {r.prospection_owner_username || "—"}
        </Typography>
      ),
    },

    {
      key: "commentaire",
      label: "Commentaire",
      flexGrow: 1,
      render: (r) => (
        <Box display="flex" flexDirection="column" gap={0.5}>
          {/* Créateur + date */}
          <Box display="flex" alignItems="center" gap={0.5}>
            <PersonIcon fontSize="small" />
            <Typography
              variant="body2"
              noWrap
              title={r.created_by_username}
              sx={{ maxWidth: isMobile ? 100 : 150 }}
            >
              {r.created_by_username || "—"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              • {fmt(r.created_at)}
            </Typography>
          </Box>

          {/* Corps du commentaire */}
          <Box
            sx={{
              mt: 0.5,
              maxHeight: 84,
              overflow: "hidden",
            }}
            title={undefined}
          >
            <CommentaireContent html={r.body || "<em>—</em>"} />
          </Box>
        </Box>
      ),
    },
  ];

  return (
    <ResponsiveTableTemplate
      columns={columns}
      data={rows}
      getRowId={(r) => r.id}
      cardTitle={(r) => `#${r.id} • ${r.created_by_username || "—"}`}
      actions={(r) =>
        (onEdit || onDelete || onHardDelete) && (
          <Stack direction="row" spacing={1}>
            {onEdit && (
              <IconButton
                size="small"
                aria-label={`Modifier le commentaire #${r.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(r);
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            )}
            {onDelete && (
              r.est_archive ? (
                <>
                  <IconButton
                    size="small"
                    aria-label={`Restaurer le commentaire #${r.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestore?.(r);
                    }}
                    color="success"
                  >
                    <RestoreFromTrashIcon fontSize="small" />
                  </IconButton>
                  {canHardDelete && onHardDelete && (
                    <IconButton
                      size="small"
                      aria-label={`Supprimer définitivement le commentaire #${r.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onHardDelete(r);
                      }}
                      color="error"
                    >
                      <DeleteForeverIcon fontSize="small" />
                    </IconButton>
                  )}
                </>
              ) : (
                <IconButton
                  size="small"
                  aria-label={`Archiver le commentaire #${r.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(r);
                  }}
                  color="error"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )
            )}
          </Stack>
        )
      }
      onRowClick={onEdit}
    />
  );
}
