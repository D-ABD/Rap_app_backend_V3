import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Box,
  Badge,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteIcon from "@mui/icons-material/Delete";

import {
  useListAppairageComments,
  useCreateAppairageComment,
  useDeleteAppairageComment,
} from "../../hooks/useAppairageComments";
import type { AppairageCommentDTO } from "../../types/appairageComment";
import CommentaireContent from "../../pages/commentaires/CommentaireContent";
import RichHtmlEditorField from "../forms/RichHtmlEditorField";

type Props = {
  show: boolean;
  onClose: () => void;
  appairageId: number;
  onCommentAdded?: (c: AppairageCommentDTO) => void;
};

/* ---------- Utils ---------- */
const dtf =
  typeof Intl !== "undefined"
    ? new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : undefined;

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dtf ? dtf.format(d) : d.toLocaleString("fr-FR");
};

/* ---------- Component ---------- */
export default function AppairageCommentsModal({
  show,
  onClose,
  appairageId,
  onCommentAdded,
}: Props) {
  const [newComment, setNewComment] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const {
    data: comments,
    loading,
    refetch,
  } = useListAppairageComments({ appairage: appairageId }, show ? 1 : 0);
  const { create, loading: creating } = useCreateAppairageComment();

  // ✅ Correction : on fournit un id par défaut pour satisfaire le hook
  const { remove, loading: deleting } = useDeleteAppairageComment(deletingId ?? 0);

  const handleAdd = async () => {
    const trimmed = newComment.replace(/<[^>]*>/g, "").trim();
    if (!trimmed) return;
    try {
      const created = await create({
        appairage: appairageId,
        body: newComment,
      });
      setNewComment("");
      onCommentAdded?.(created);
      refetch();
    } catch {
      alert("Impossible d’ajouter le commentaire.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(`Supprimer le commentaire #${id} ?`)) return;
    try {
      setDeletingId(id);
      await remove(); // ✅ id déjà passé au hook
      refetch();
    } catch {
      alert("Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  };

  const count = comments?.length ?? 0;

  return (
    <Dialog open={show} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        💬 Commentaires appairage
        <Badge badgeContent={count} color="primary" sx={{ ml: "auto", mr: 1 }} />
        <IconButton onClick={refetch} disabled={loading}>
          <RefreshIcon />
        </IconButton>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {/* Formulaire ajout commentaire */}
        <Box sx={{ mb: 2 }}>
          <RichHtmlEditorField
            label="Ajouter un commentaire"
            value={newComment}
            onChange={setNewComment}
            placeholder="Ajouter un commentaire enrichi…"
            minHeight={120}
          />
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={!newComment.replace(/<[^>]*>/g, "").trim() || creating}
            sx={{ mt: 1 }}
          >
            {creating ? "⏳ Ajout…" : "Ajouter"}
          </Button>
        </Box>

        {/* Liste */}
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : !comments || comments.length === 0 ? (
          <Typography color="text.secondary">Aucun commentaire</Typography>
        ) : (
          <List sx={{ maxHeight: "52vh", overflow: "auto" }}>
            {comments.map((c) => (
              <ListItem
                key={c.id}
                alignItems="flex-start"
                secondaryAction={
                  <IconButton
                    edge="end"
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id || deleting}
                  >
                    {deletingId === c.id ? <CircularProgress size={18} /> : <DeleteIcon />}
                  </IconButton>
                }
              >
                <ListItemText
                  primary={
                    <Typography variant="body2" color="text.secondary">
                      <strong>{c.auteur_nom || "—"}</strong> • {fmtDate(c.created_at)}
                    </Typography>
                  }
                  secondary={
                    <Typography
                      component="div"
                      variant="body1"
                      color="text.primary"
                    >
                      <CommentaireContent html={c.body || "<em>—</em>"} />
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
}
