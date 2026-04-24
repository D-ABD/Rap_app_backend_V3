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
  Stack,
  Divider,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useQuill } from "react-quilljs";
import "quill/dist/quill.snow.css";

import type { Commentaire } from "../../types/commentaire";
import type { AppTheme } from "../../theme";
import SearchInput from "../SearchInput";
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
  const theme = useTheme<AppTheme>();
  const isLight = theme.palette.mode === "light";

  const [meta, setMeta] = useState<{ nom: string; num_offre?: string } | null>(null);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // --- Hooks métier ---
  const { commentaires, loading, error, refetch } = useCommentaires(
    open ? formationId : undefined
  );
  const { createCommentaire, loading: creating } = useCreateCommentaire();
  const { deleteCommentaire } = useDeleteCommentaire();
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
    if (quill) quill.setText("");
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
    if (!confirm(`Archiver le commentaire #${id} ?`)) return;
    try {
      setDeletingId(id);
      await deleteCommentaire(id);
      refetch();
    } catch (err) {
      if (import.meta.env.MODE !== "production") {
        // eslint-disable-next-line no-console
        console.error("Erreur lors de l’archivage du commentaire :", err);
      }
      alert("Archivage impossible.");
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

  const dialogSectionTokens = theme.custom.dialog.section;
  const sectionBackground = isLight
    ? dialogSectionTokens.background.light
    : dialogSectionTokens.background.dark;
  const sectionBorder = isLight
    ? dialogSectionTokens.border.light
    : dialogSectionTokens.border.dark;

  const sectionTitleBackground = isLight
    ? theme.custom.overlay.modalSectionTitle.background.light
    : theme.custom.overlay.modalSectionTitle.background.dark;
  const sectionTitleBorder = isLight
    ? theme.custom.overlay.modalSectionTitle.borderBottom.light
    : theme.custom.overlay.modalSectionTitle.borderBottom.dark;

  const sectionContainerSx = {
    border: sectionBorder,
    borderRadius: dialogSectionTokens.borderRadius,
    background: sectionBackground,
    overflow: "hidden",
  } as const;

  const sectionHeaderSx = {
    px: dialogSectionTokens.padding,
    py: 1,
    background: sectionTitleBackground,
    borderBottom: sectionTitleBorder,
  } as const;

  /* ---------- Rendu ---------- */
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Commentaires de la formation</DialogTitle>

      <DialogContent>
        <Stack spacing={2}>
          {meta ? (
            <Box>
              <Typography variant="body2" color="text.secondary">
                {meta.nom}
                {meta.num_offre ? ` — ${meta.num_offre}` : ""}
              </Typography>
            </Box>
          ) : null}

          {/* ─── Dernier commentaire ─── */}
          <Box sx={sectionContainerSx}>
            <Box sx={sectionHeaderSx}>
              <Typography variant="subtitle2" fontWeight={700}>
                Dernier commentaire
              </Typography>
            </Box>

            <Box sx={{ p: dialogSectionTokens.padding }}>
              {loadingDernier ? (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    py: 2,
                  }}
                >
                  <CircularProgress size={20} />
                </Box>
              ) : !dernier ? (
                <Typography color="text.secondary">
                  Aucun commentaire enregistré.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  <Box>
                    <Typography variant="body2">
                      <Box component="span" sx={{ fontWeight: 700 }}>
                        {dernier.auteur}
                      </Box>
                      {" — "}
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
                  </Box>

                  <Box color="text.secondary">
                    <CommentaireContent html={dernier.contenu || "<em>—</em>"} />
                  </Box>
                </Stack>
              )}
            </Box>
          </Box>

          {/* ─── Ajout d’un commentaire enrichi ─── */}
          <Box sx={sectionContainerSx}>
            <Box sx={sectionHeaderSx}>
              <Typography variant="subtitle2" fontWeight={700}>
                Ajouter un commentaire
              </Typography>
            </Box>

            <Box sx={{ p: dialogSectionTokens.padding }}>
              <Stack spacing={1.5}>
                <Box
                  sx={{
                    "& .ql-toolbar": {
                      borderTopLeftRadius: theme.shape.borderRadius,
                      borderTopRightRadius: theme.shape.borderRadius,
                      borderColor: "divider",
                      backgroundColor: "background.paper",
                    },
                    "& .ql-container": {
                      minHeight: 150,
                      borderBottomLeftRadius: theme.shape.borderRadius,
                      borderBottomRightRadius: theme.shape.borderRadius,
                      borderColor: "divider",
                      backgroundColor: "background.paper",
                      color: "text.primary",
                    },
                    "& .ql-editor": {
                      minHeight: 110,
                    },
                  }}
                >
                  <div ref={quillRef} />
                </Box>

                <Box>
                  <Button
                    variant="contained"
                    color="primary"
                    disabled={creating}
                    onClick={handleAdd}
                  >
                    {creating ? "Publication…" : "Publier"}
                  </Button>
                </Box>
              </Stack>
            </Box>
          </Box>

          {/* ─── Recherche ─── */}
          <SearchInput
            placeholder="Rechercher un commentaire…"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            fullWidth
          />

          {/* ─── Liste des commentaires ─── */}
          <Box sx={sectionContainerSx}>
            <Box sx={sectionHeaderSx}>
              <Typography variant="subtitle2" fontWeight={700}>
                Historique des commentaires
              </Typography>
            </Box>

            <Box sx={{ p: dialogSectionTokens.padding }}>
              {loading ? (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    py: 3,
                  }}
                >
                  <CircularProgress size={24} />
                </Box>
              ) : error ? (
                <Typography color="error">{String(error.message)}</Typography>
              ) : filteredRows.length === 0 ? (
                <Typography color="text.secondary">
                  Aucun commentaire trouvé.
                </Typography>
              ) : (
                <List disablePadding>
                  {filteredRows.map((c, index) => (
                    <Box key={c.id}>
                      <ListItem
                        alignItems="flex-start"
                        disableGutters
                        secondaryAction={
                          <Button
                            onClick={() => handleDelete(c.id)}
                            disabled={deletingId === c.id}
                            size="small"
                            color="error"
                          >
                            {deletingId === c.id ? "Archivage…" : "Archiver"}
                          </Button>
                        }
                        sx={{
                          py: 1.25,
                          pr: 10,
                        }}
                      >
                        <ListItemText
                          primary={
                            <Typography variant="body2">
                              <Box component="span" sx={{ fontWeight: 700 }}>
                                {c.auteur}
                              </Box>
                              {" • "}
                              {fmtDate(c.updated_at || c.created_at)}
                              {getSat(c) != null && (
                                <Chip
                                  size="small"
                                  label={`Sat. ${getSat(c)}%`}
                                  sx={{ ml: 1 }}
                                  color={
                                    getSat(c)! >= 70
                                      ? "success"
                                      : getSat(c)! >= 40
                                        ? "warning"
                                        : "error"
                                  }
                                />
                              )}
                            </Typography>
                          }
                          secondary={
                            <Box
                              sx={{
                                mt: 0.5,
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

                      {index < filteredRows.length - 1 ? <Divider /> : null}
                    </Box>
                  ))}
                </List>
              )}
            </Box>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}