// ======================================================
// src/pages/commentaires/CommentairesTable.tsx
// Affichage enrichi des commentaires + infos formation + état
// ======================================================

import { useCallback, useMemo } from "react";
import { Box, Checkbox, Chip, LinearProgress, Tooltip, IconButton, Typography } from "@mui/material";
import {
  DeleteForever as DeleteForeverIcon,
  Edit as EditIcon,
  RestoreFromTrash as RestoreFromTrashIcon,
} from "@mui/icons-material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import type { Commentaire } from "../../types/commentaire";
import ResponsiveTableTemplate, {
  type TableColumn,
} from "../../components/ResponsiveTableTemplate";

/* ---------- Date FR ---------- */
function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/* ---------- Contenu HTML enrichi sécurisé ---------- */
function CommentaireContent({ html, maxLength = 400 }: { html: string; maxLength?: number }) {
  const sanitized = DOMPurify.sanitize(html || "<em>—</em>", {
    ALLOWED_TAGS: [
      "b", "i", "u", "em", "strong", "p", "br", "ul", "ol", "li", "span", "a", "blockquote",
    ],
    ALLOWED_ATTR: ["href", "title", "target", "style"],
    FORBID_TAGS: ["script", "style"],
    FORBID_ATTR: ["onerror", "onclick", "onload"],
  });

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = sanitized;
  tempDiv.querySelectorAll<HTMLElement>("span").forEach((el) => {
    const style = el.getAttribute("style");
    if (!style) return;
    const safeStyle = style
      .split(";")
      .map((s) => s.trim().toLowerCase())
      .filter(
        (s) =>
          s.startsWith("color:") ||
          s.startsWith("background-color:") ||
          s.startsWith("font-weight:") ||
          s.startsWith("font-style:") ||
          s.startsWith("text-decoration:")
      )
      .join("; ");
    el.setAttribute("style", safeStyle);
  });

  const cleanedHTML = tempDiv.innerHTML;
  const truncated =
    cleanedHTML.length > maxLength ? cleanedHTML.slice(0, maxLength) + "..." : cleanedHTML;

  return (
    <Tooltip
      title={
        <Box sx={{ maxWidth: 500, p: 1 }}>
          <div
            dangerouslySetInnerHTML={{ __html: cleanedHTML }}
            style={{
              all: "revert",
              fontSize: "0.9rem",
              lineHeight: 1.45,
              wordBreak: "break-word",
            }}
          />
        </Box>
      }
      arrow
      placement="top-start"
      enterDelay={500}
    >
      <Box
        sx={{
          maxHeight: 160,
          overflowY: "auto",
          wordBreak: "break-word",
          fontSize: "0.9rem",
          lineHeight: 1.45,
          px: 0.5,
        }}
      >
        <div
          dangerouslySetInnerHTML={{ __html: truncated || "<em>—</em>" }}
          style={{
            all: "revert",
            fontSize: "0.9rem",
            lineHeight: 1.45,
            wordBreak: "break-word",
          }}
        />
      </Box>
    </Tooltip>
  );
}

function FormationColumnCell({ c }: { c: Commentaire }) {
  return (
    <Box sx={{ maxWidth: 340 }}>
      <Typography variant="subtitle2">
        {c.formation ? (
          <Typography
            component={RouterLink}
            to={`/formations/${c.formation}`}
            variant="subtitle2"
            sx={{ color: "primary.main", textDecoration: "none" }}
            onClick={(e) => e.stopPropagation()}
          >
            {c.formation_label || c.formation_nom || "—"}
          </Typography>
        ) : (
          c.formation_label || c.formation_nom || "—"
        )}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block">
        {c.type_offre_nom || "—"} / {c.num_offre || "—"}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block">
        {c.centre_nom || "—"} / {c.statut_nom || "—"}
      </Typography>

      {typeof c.saturation_formation === "number" && (
        <Box mt={1}>
          <Typography variant="caption" color="text.secondary">
            🧪 Saturation au moment du commentaire : <strong>{c.saturation_formation}%</strong>
          </Typography>
          <LinearProgress
            variant="determinate"
            value={c.saturation_formation}
            sx={{
              mt: 0.5,
              height: 6,
              borderRadius: 3,
              backgroundColor: "grey.200",
              "& .MuiLinearProgress-bar": {
                backgroundColor:
                  c.saturation_formation < 50
                    ? "warning.main"
                    : c.saturation_formation < 80
                      ? "info.main"
                      : "success.main",
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
}

interface Props {
  commentaires: Commentaire[];
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onClickRow?: (id: number) => void;
  onRestore?: (id: number) => void;
  onHardDelete?: (id: number) => void;
  canHardDelete?: boolean;
}

export default function CommentairesTable({
  commentaires,
  selectedIds,
  onToggleSelect,
  onClickRow,
  onRestore,
  onHardDelete,
  canHardDelete = false,
}: Props) {
  const navigate = useNavigate();

  const handleRowNavigate = useCallback(
    (c: Commentaire) => {
      if (onClickRow) onClickRow(c.id);
      else navigate(`/commentaires/${c.id}/edit`);
    },
    [onClickRow, navigate]
  );

  const columns = useMemo<TableColumn<Commentaire>[]>(
    () => [
      {
        key: "select",
        label: "",
        width: 48,
        sticky: "left",
        headerRender: () => <Box />,
        render: (c) => (
          <Box onClick={(e) => e.stopPropagation()} sx={{ display: "inline-flex" }}>
            <Checkbox
              checked={selectedIds.includes(c.id)}
              onChange={() => onToggleSelect(c.id)}
            />
          </Box>
        ),
      },
      {
        key: "formation",
        label: "Formation",
        noWrap: false,
        render: (c) => <FormationColumnCell c={c} />,
      },
      {
        key: "statut",
        label: "État",
        render: (c) => {
          const isArchived = c.statut_commentaire === "archive" || c.is_archived;
          return (
            <Chip
              label={isArchived ? "Archivé" : "Actif"}
              color={isArchived ? "default" : "success"}
              size="small"
              sx={{
                fontWeight: 500,
                bgcolor: isArchived ? "grey.200" : "success.light",
                color: isArchived ? "text.secondary" : "success.dark",
              }}
            />
          );
        },
      },
      {
        key: "auteur",
        label: "Auteur / Date",
        noWrap: false,
        render: (c) => (
          <Box sx={{ whiteSpace: "nowrap" }}>
            <Typography variant="body2">{c.auteur || "—"}</Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDate(c.date || c.created_at)}
            </Typography>
          </Box>
        ),
      },
      {
        key: "contenu",
        label: "Contenu",
        noWrap: false,
        render: (c) => (
          <Box sx={{ maxWidth: 420 }}>
            <CommentaireContent html={c.contenu || "<em>—</em>"} />
          </Box>
        ),
      },
    ],
    [onToggleSelect, selectedIds]
  );

  if (!commentaires.length) {
    return (
      <Box sx={{ textAlign: "center", py: 5, color: "text.secondary" }}>
        <Typography variant="body2">Aucun commentaire à afficher</Typography>
      </Box>
    );
  }

  return (
    <ResponsiveTableTemplate<Commentaire>
      columns={columns}
      data={commentaires}
      getRowId={(c) => c.id}
      onRowClick={handleRowNavigate}
      isRowSelected={(c) => selectedIds.includes(c.id)}
      cardTitle={(c) => c.formation_label || c.formation_nom || `Commentaire #${c.id}`}
      actionsAlign="right"
      actions={(c) => {
        const isArchived = c.statut_commentaire === "archive" || c.is_archived;
        return (
          <>
            <Tooltip title="Éditer le commentaire">
              <IconButton
                size="small"
                color="primary"
                onClick={() => navigate(`/commentaires/${c.id}/edit`)}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {isArchived && onRestore && (
              <Tooltip title="Restaurer le commentaire">
                <IconButton size="small" color="success" onClick={() => onRestore(c.id)}>
                  <RestoreFromTrashIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {isArchived && canHardDelete && onHardDelete && (
              <Tooltip title="Supprimer définitivement">
                <IconButton size="small" color="error" onClick={() => onHardDelete(c.id)}>
                  <DeleteForeverIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </>
        );
      }}
      showActionsColumn
    />
  );
}
