// src/features/appairages/components/AppairageLastCommentRow.tsx
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import type { AppairageCommentDTO } from "../../../types/appairageComment";

type Props = {
  appairageId: number;
  lastComment: AppairageCommentDTO | null;
  commentsCount: number;
  onOpenModal: () => void;
};

export default function AppairageLastCommentRow({
  lastComment,
  commentsCount,
  onOpenModal,
}: Props) {
  return (
    <Paper
      variant="outlined"
      sx={{
        display: "grid",
        gridTemplateColumns: "180px 1fr auto",
        gap: 2,
        alignItems: "center",
        p: 2,
        borderRadius: 2,
        mt: 2,
      }}
    >
      {/* Label */}
      <Typography fontWeight={600} color="text.primary">
        Dernier commentaire
      </Typography>

      {/* Contenu */}
      <Box>
        {!lastComment ? (
          <Typography variant="body2" color="text.secondary">
            Aucun commentaire pour le moment.
          </Typography>
        ) : (
          <>
            <Typography
              variant="body2"
              sx={{
                color: "text.primary",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
              title={lastComment.body}
            >
              {lastComment.body}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              {lastComment.auteur_nom} •{" "}
              {new Date(lastComment.created_at).toLocaleDateString("fr-FR")}
              {commentsCount > 1 ? ` • ${commentsCount} au total` : ""}
            </Typography>
          </>
        )}
      </Box>

      {/* Bouton */}
      <Stack>
        <Button
          variant="outlined"
          size="small"
          onClick={onOpenModal}
          aria-label="Voir tous les commentaires"
        >
          Voir tous / ajouter
        </Button>
      </Stack>
    </Paper>
  );
}
