// ======================================================
// src/pages/commentaires/CommentairesCreatePage.tsx
// Création d’un commentaire avec aperçu du rendu en temps réel
// ======================================================

import { useState } from "react";
import { Box, Typography, Divider } from "@mui/material";
import { toast } from "react-toastify";

import PageTemplate from "../../components/PageTemplate";
import PageSection from "../../components/PageSection";
import CommentaireForm from "./CommentaireForm";

export default function CommentairesCreatePage() {
  const [previewHTML, setPreviewHTML] = useState<string>("");

  return (
    <PageTemplate
      title="Créer un commentaire"
      subtitle="Ajoutez un commentaire avec un shell plus lisible, sans modifier le flux métier."
      maxWidth="xl"
      backButton
      onBack={() => window.history.back()}
    >
      <Box display="flex" flexDirection={{ xs: "column", md: "row" }} gap={3}>
        <Box flex={1}>
          <PageSection>
            <CommentaireForm
              onSubmit={(payload) => {
                toast.success("✅ Commentaire créé avec succès");
                setPreviewHTML(payload.contenu);
              }}
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
