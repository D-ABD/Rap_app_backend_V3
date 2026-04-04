// ======================================================
// src/pages/commentaires/CommentairesTable.tsx
// Affichage enrichi des commentaires + infos formation + état
// (version améliorée — lisibilité, accessibilité, style, perf)
// ======================================================

import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  LinearProgress,
  Box,
  Typography,
  Chip,
  Tooltip,
  IconButton,
} from "@mui/material";
import {
  DeleteForever as DeleteForeverIcon,
  Edit as EditIcon,
  RestoreFromTrash as RestoreFromTrashIcon,
} from "@mui/icons-material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import type { Commentaire } from "../../types/commentaire";

/* ---------- 🕒 Formateur de date en français ---------- */
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

/* ---------- 🧩 Contenu HTML enrichi sécurisé ---------- */
function CommentaireContent({ html, maxLength = 400 }: { html: string; maxLength?: number }) {
  const sanitized = DOMPurify.sanitize(html || "<em>—</em>", {
    ALLOWED_TAGS: [
      "b",
      "i",
      "u",
      "em",
      "strong",
      "p",
      "br",
      "ul",
      "ol",
      "li",
      "span",
      "a",
      "blockquote",
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

/* ---------- Types Props ---------- */
interface Props {
  commentaires: Commentaire[];
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onClickRow?: (id: number) => void;
  onRestore?: (id: number) => void;
  onHardDelete?: (id: number) => void;
  canHardDelete?: boolean;
}

/* ---------- Composant principal ---------- */
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

  if (!commentaires.length) {
    return (
      <Box sx={{ textAlign: "center", py: 5, color: "text.secondary" }}>
        <Typography variant="body2">Aucun commentaire à afficher</Typography>
      </Box>
    );
  }

  return (
    <Table size="small" sx={{ "& td, & th": { verticalAlign: "top" } }}>
      <TableHead>
        <TableRow>
          <TableCell padding="checkbox" />
          <TableCell>Formation</TableCell>
          <TableCell>État</TableCell>
          <TableCell>Auteur / Date</TableCell>
          <TableCell>Contenu</TableCell>
          <TableCell align="center" sx={{ width: 90 }}>
            Actions
          </TableCell>
        </TableRow>
      </TableHead>

      <TableBody>
        {commentaires.map((c) => {
          const isSelected = selectedIds.includes(c.id);
          const isArchived = c.statut_commentaire === "archive" || c.is_archived;

          return (
            <TableRow
              key={c.id}
              hover
              selected={isSelected}
              sx={{
                cursor: "pointer",
                "&:hover": { backgroundColor: "grey.50" },
                transition: "background-color 0.2s ease-in-out",
              }}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest("button,a,input")) return;
                onClickRow?.(c.id) ?? navigate(`/commentaires/${c.id}/edit`);
              }}
            >
              {/* ✅ Checkbox */}
              <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                <Checkbox checked={isSelected} onChange={() => onToggleSelect(c.id)} />
              </TableCell>

              {/* ✅ Infos formation */}
              <TableCell sx={{ maxWidth: 340 }}>
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
              </TableCell>

              {/* ✅ Statut */}
              <TableCell>
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
              </TableCell>

              {/* ✅ Auteur + date */}
              <TableCell sx={{ whiteSpace: "nowrap" }}>
                <Typography variant="body2">{c.auteur || "—"}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(c.date || c.created_at)}
                </Typography>
              </TableCell>

              {/* ✅ Contenu enrichi */}
              <TableCell sx={{ maxWidth: 420 }}>
                <CommentaireContent html={c.contenu || "<em>—</em>"} />
              </TableCell>

              {/* ✅ Actions */}
              <TableCell align="center" onClick={(e) => e.stopPropagation()}>
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
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
