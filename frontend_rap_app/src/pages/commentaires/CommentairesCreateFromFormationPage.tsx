// ======================================================
// src/pages/commentaires/CommentairesCreateFromFormationPage.tsx
// Création d’un commentaire depuis une formation avec aperçu du rendu
// (refactor LOT 7 : structure plus cohérente, logique inchangée)
// ======================================================

import { useParams } from "react-router-dom";
import { useState } from "react";
import { Box, Typography, Divider, Stack } from "@mui/material";
import PageTemplate from "../../components/PageTemplate";
import PageSection from "../../components/PageSection";
import CommentaireForm from "./CommentaireForm";

export default function CommentairesCreateFromFormationPage() {
  const { formationId } = useParams();
  const [previewHTML, setPreviewHTML] = useState<string>("");

  if (!formationId) {
    return (
      <PageTemplate
        title="Créer un commentaire"
        subtitle="Ajoutez un commentaire directement dans le contexte d’une formation."
        maxWidth="xl"
        backButton
        onBack={() => window.history.back()}
      >
        <Typography color="error">Formation non spécifiée.</Typography>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate
      title="Créer un commentaire"
      subtitle="Ajoutez un commentaire directement dans le contexte d’une formation."
      maxWidth="xl"
      backButton
      onBack={() => window.history.back()}
    >
      <Box
        display="grid"
        gridTemplateColumns={{ xs: "1fr", md: "minmax(0, 1fr) minmax(0, 1fr)" }}
        gap={3}
        alignItems="start"
      >
        <PageSection>
          <CommentaireForm
            formationId={formationId}
            readonlyFormation={true}
            onSubmit={(payload) => setPreviewHTML(payload.contenu)}
          />
        </PageSection>

        <PageSection>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Aperçu du rendu
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Vérifiez le rendu HTML du commentaire avant retour à la liste.
              </Typography>
            </Box>

            <Divider />

            {previewHTML ? (
              <Box
                sx={{
                  wordBreak: "break-word",
                  "& *": {
                    maxWidth: "100%",
                  },
                  "& p": {
                    marginTop: 0,
                  },
                }}
              >
                <div
                  dangerouslySetInnerHTML={{ __html: previewHTML }}
                  style={{
                    all: "revert",
                    fontSize: "0.95rem",
                    lineHeight: 1.5,
                    wordBreak: "break-word",
                  }}
                />
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Aucun contenu pour le moment.
              </Typography>
            )}
          </Stack>
        </PageSection>
      </Box>
    </PageTemplate>
  );
}