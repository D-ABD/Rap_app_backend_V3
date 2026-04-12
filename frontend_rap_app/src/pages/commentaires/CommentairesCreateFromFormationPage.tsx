// ======================================================
// src/pages/commentaires/CommentairesCreateFromFormationPage.tsx
// Création d’un commentaire depuis une formation avec aperçu du rendu
// (version finale fluide et stable)
// ======================================================

import { useParams } from "react-router-dom";
import { useState } from "react";
import { Box, Typography, Divider } from "@mui/material";
import PageTemplate from "../../components/PageTemplate";
import PageSection from "../../components/PageSection";
import CommentaireForm from "./CommentaireForm";

export default function CommentairesCreateFromFormationPage() {
  const { formationId } = useParams();
  const [previewHTML, setPreviewHTML] = useState<string>("");

  if (!formationId) {
    return (
      <Typography color="error" sx={{ p: 2 }}>
        Formation non spécifiée.
      </Typography>
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
      <Box display="flex" flexDirection={{ xs: "column", md: "row" }} gap={3}>
        <Box flex={1}>
          <PageSection>
            <CommentaireForm
              formationId={formationId}
              readonlyFormation={true}
              onSubmit={(payload) => setPreviewHTML(payload.contenu)}
            />
          </PageSection>
        </Box>

        <Box flex={1}>
          <PageSection>
            <Typography variant="subtitle1" gutterBottom>
              Aperçu du rendu
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {previewHTML ? (
              <div
                dangerouslySetInnerHTML={{ __html: previewHTML }}
                style={{
                  all: "revert",
                  fontSize: "0.95rem",
                  lineHeight: 1.5,
                  wordBreak: "break-word",
                }}
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                Aucun contenu pour le moment.
              </Typography>
            )}
          </PageSection>
        </Box>
      </Box>
    </PageTemplate>
  );
}
