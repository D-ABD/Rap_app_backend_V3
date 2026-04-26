import { useMemo } from "react";
import { Box, Stack, Typography, Button, Skeleton, Paper } from "@mui/material";
import { useListProspectionComments } from "../../../hooks/useProspectionComments";
import type { ProspectionCommentDTO } from "../../../types/prospectionComment";
import CommentaireContent from "../../commentaires/CommentaireContent";

type Props = {
  prospectionId: number;
  onOpenModal: () => void;

  /** Permet au parent (ProspectionEditPage) de forcer l’affichage d’un dernier commentaire local */
  lastComment?: string | null;
  /** Permet au parent d’afficher le compteur de commentaires sans recharger */
  commentsCount?: number;
};

export default function ProspectionLastCommentRow({
  prospectionId,
  onOpenModal,
  lastComment = null,
  commentsCount,
}: Props) {
  const params = useMemo(
    () => ({ prospection: prospectionId, ordering: "-created_at" as const }),
    [prospectionId]
  );
  const { data, loading, error } = useListProspectionComments(params);

  // Gestion des données
  const rows: ProspectionCommentDTO[] = Array.isArray(data?.results)
    ? (data.results as ProspectionCommentDTO[])
    : Array.isArray(data)
      ? data
      : [];

  const lastFromAPI: ProspectionCommentDTO | undefined = rows[0];
  const effectiveLastBody = lastComment ?? lastFromAPI?.body ?? null;
  const effectiveCount = commentsCount ?? rows.length ?? 0;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "180px 1fr auto" },
        gap: 2,
        alignItems: "center",
      }}
    >
      <Typography variant="subtitle2" fontWeight={600} color="text.primary">
        Dernier commentaire
      </Typography>

      <Box sx={{ minHeight: 40 }}>
        {loading && (
          <Stack spacing={1}>
            <Skeleton width="60%" height={20} />
            <Skeleton height={20} />
          </Stack>
        )}

        {!loading && error && (
          <Box>
            <Typography variant="body2" color="error" component="p" sx={{ m: 0 }}>
              Erreur de chargement des commentaires.
            </Typography>
            {error.message ? (
              <Typography variant="caption" color="error" display="block" sx={{ mt: 0.25 }}>
                {error.message}
              </Typography>
            ) : null}
          </Box>
        )}

        {!loading && !error && !effectiveLastBody && (
          <Typography variant="body2" color="text.secondary">
            Aucun commentaire pour le moment.
          </Typography>
        )}

        {!loading && !error && effectiveLastBody && (
          <Stack spacing={0.5}>
            <Box sx={{ maxHeight: 56, overflow: "hidden" }}>
              <CommentaireContent html={effectiveLastBody} />
            </Box>
            <Typography variant="caption" color="text.secondary">
              {typeof effectiveCount === "number" && effectiveCount > 1
                ? `(${effectiveCount} au total)`
                : ""}
            </Typography>
          </Stack>
        )}
      </Box>

      <Box>
        <Button
          onClick={onOpenModal}
          variant="outlined"
          size="small"
          aria-label="Voir tous les commentaires"
        >
          Voir tous / ajouter un commentaire
        </Button>
      </Box>
    </Paper>
  );
}
