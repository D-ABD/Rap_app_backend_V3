// ======================================================
// src/components/modals/FormationCommentsModal.tsx
// Modale affichant et gérant les commentaires d'une formation
// Compatible avec useDeleteCommentaire(id) dynamique
// ======================================================

import { useMemo, useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Paper,
} from "@mui/material";
import { useQuill } from "react-quilljs";
import "quill/dist/quill.snow.css";

import type { Commentaire } from "../../types/commentaire";
import api from "../../api/axios";
import {
  useCommentaires,
  useCreateCommentaire,
  useDeleteCommentaire,
  useDernierCommentaire,
} from "../../hooks/useCommentaires";
import CommentaireContent from "../../pages/commentaires/CommentaireContent";

/* ---------- Props ---------- */
type Props = {
  open: boolean;
  onClose: () => void;
  formationId: number;
  onCommentAdded?: (newComment: Commentaire) => void;
};

/* ---------- Utils ---------- */
const fmtDate = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d
    .toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(",", " à");
};

/* ---------- Composant principal ---------- */
export default function FormationCommentsModal({
  open,
  onClose,
  formationId,
  onCommentAdded,
}: Props) {
  const [meta, setMeta] = useState<{ nom: string; num_offre?: string } | null>(null);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // --- Hooks métier ---
  const { commentaires, loading, error, refetch } = useCommentaires(open ? formationId : undefined);
  const { createCommentaire, loading: creating } = useCreateCommentaire();
  const { deleteCommentaire } = useDeleteCommentaire(); // ✅ nouvelle version du hook (sans id)
  const { dernier, loading: loadingDernier } = useDernierCommentaire(
    open ? formationId : undefined
  );

  // --- Quill éditeur enrichi ---
  const { quill, quillRef } = useQuill({
    theme: "snow",
    modules: {
      toolbar: [
        ["bold", "italic", "underline", "strike"],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ color: [] }, { background: [] }],
        ["link", "clean"],
      ],
    },
  });

  useEffect(() => {
    if (quill) quill.setText(""); // réinitialise à chaque ouverture
  }, [quill, open]);

  // --- Charge les métadonnées de la formation ---
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const { data } = await api.get(`/formations/${formationId}/`);
        setMeta({ nom: data?.data?.nom, num_offre: data?.data?.num_offre });
      } catch (err) {
        if (import.meta.env.MODE !== "production") {
          // eslint-disable-next-line no-console
          console.error("Erreur lors du chargement de la formation :", err);
        }
      }
    })();
  }, [open, formationId]);

  // --- Ajout d’un commentaire enrichi ---
  const handleAdd = async () => {
    if (!quill) return;
    const contenu = quill.root.innerHTML.trim();
    if (!contenu || contenu === "<p><br></p>") return;

    try {
      const created = await createCommentaire(formationId, { contenu });
      quill.setText("");
      refetch();
      onCommentAdded?.(created);
    } catch (err) {
      if (import.meta.env.MODE !== "production") {
        // eslint-disable-next-line no-console
        console.error("Erreur lors de l’ajout du commentaire :", err);
      }
      alert("Impossible d’ajouter le commentaire.");
    }
  };

  // --- Suppression d’un commentaire ---
  const handleDelete = async (id: number) => {
    if (!confirm(`Supprimer le commentaire #${id} ?`)) return;
    try {
      setDeletingId(id);
      await deleteCommentaire(id); // ✅ version dynamique
      refetch();
    } catch (err) {
      if (import.meta.env.MODE !== "production") {
        // eslint-disable-next-line no-console
        console.error("Erreur lors de la suppression du commentaire :", err);
      }
      alert("Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  };

  // --- Filtrage local ---
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return commentaires;
    return commentaires.filter(
      (c) =>
        c.contenu.toLowerCase().includes(q) ||
        c.auteur?.toLowerCase().includes(q) ||
        c.formation_nom?.toLowerCase().includes(q)
    );
  }, [commentaires, search]);

  const getSat = (c: Commentaire) => c.saturation_formation ?? c.saturation ?? null;

  /* ---------- Rendu ---------- */
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>💬 Commentaires de la formation {meta ? `"${meta.nom}"` : ""}</DialogTitle>

      {meta && (
        <Typography variant="subtitle2" color="text.secondary" sx={{ px: 3, mt: -1, mb: 1 }}>
          {meta.nom} {meta.num_offre && <>— {meta.num_offre}</>}
        </Typography>
      )}

      <DialogContent dividers>
        {/* ─── Dernier commentaire ─── */}
        <Box mb={3}>
          <Typography variant="subtitle2" gutterBottom>
            🕓 Dernier commentaire :
          </Typography>

          {loadingDernier ? (
            <Box display="flex" justifyContent="center" py={2}>
              <CircularProgress size={20} />
            </Box>
          ) : !dernier ? (
            <Typography color="text.secondary">Aucun commentaire enregistré.</Typography>
          ) : (
            <Paper variant="outlined" sx={{ p: 2, backgroundColor: "action.hover" }}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>{dernier.auteur}</strong> —{" "}
                {fmtDate(dernier.updated_at || dernier.created_at)}
                {getSat(dernier) != null && (
                  <Chip
                    size="small"
                    label={`Sat. ${getSat(dernier)}%`}
                    sx={{ ml: 1 }}
                    color={
                      getSat(dernier)! >= 70
                        ? "success"
                        : getSat(dernier)! >= 40
                          ? "warning"
                          : "error"
                    }
                  />
                )}
              </Typography>
              <CommentaireContent html={dernier.contenu || "<em>—</em>"} />
            </Paper>
          )}
        </Box>

        {/* ─── Ajout d’un commentaire enrichi ─── */}
        <Box mb={2}>
          <Typography variant="subtitle2" gutterBottom>
            Ajouter un commentaire :
          </Typography>
          <div ref={quillRef} style={{ height: 150, marginBottom: "0.5rem" }} />
          <Button
            variant="contained"
            color="primary"
            disabled={creating}
            onClick={handleAdd}
            sx={{ mt: 1 }}
          >
            {creating ? "⏳" : "Publier"}
          </Button>
        </Box>

        {/* ─── Recherche ─── */}
        <Box mb={2}>
          <input
            type="text"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 10px",
              borderRadius: 4,
              border: "1px solid #ccc",
            }}
          />
        </Box>

        {/* ─── Liste des commentaires ─── */}
        {loading ? (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Typography color="error">{String(error.message)}</Typography>
        ) : filteredRows.length === 0 ? (
          <Typography>Aucun commentaire trouvé.</Typography>
        ) : (
          <List>
            {filteredRows.map((c) => (
              <ListItem
                key={c.id}
                alignItems="flex-start"
                secondaryAction={
                  <Button
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                    size="small"
                    color="error"
                  >
                    {deletingId === c.id ? "⏳" : "🗑️"}
                  </Button>
                }
              >
                <ListItemText
                  primary={
                    <>
                      <strong>{c.auteur}</strong> • {fmtDate(c.updated_at || c.created_at)}
                      {getSat(c) != null && (
                        <Chip
                          size="small"
                          label={`Sat. ${getSat(c)}%`}
                          sx={{ ml: 1 }}
                          color={
                            getSat(c)! >= 70 ? "success" : getSat(c)! >= 40 ? "warning" : "error"
                          }
                        />
                      )}
                    </>
                  }
                  secondary={
                    <Box
                      sx={{
                        display: "-webkit-box",
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        color: "text.secondary",
                      }}
                    >
                      <CommentaireContent html={c.contenu || "<em>—</em>"} />
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
