// ======================================================
// src/pages/commentaires/CommentairesCreateFromFormationPage.tsx
// Création d’un commentaire depuis une formation avec aperçu du rendu
// (version finale fluide et stable)
// ======================================================

import { useParams } from "react-router-dom";
import { useState } from "react";
import { Box, Paper, Typography, Divider } from "@mui/material";
import PageTemplate from "../../components/PageTemplate";
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
    <PageTemplate title="➕ Créer un commentaire" backButton onBack={() => window.history.back()}>
      <Box display="flex" flexDirection={{ xs: "column", md: "row" }} gap={3}>
        {/* 📝 Formulaire */}
        <Box flex={1}>
          <CommentaireForm
            formationId={formationId}
            readonlyFormation={true}
            onSubmit={(payload) => setPreviewHTML(payload.contenu)}
          />
        </Box>

        {/* 👁️ Aperçu du rendu */}
        <Paper
          variant="outlined"
          sx={{
            flex: 1,
            p: 2,
            maxHeight: "calc(100vh - 200px)",
            overflowY: "auto",
            bgcolor: "grey.50",
            "& ul": {
              listStyle: "disc",
              paddingLeft: "1.5rem",
              margin: "0.5rem 0",
            },
            "& ol": {
              listStyle: "decimal",
              paddingLeft: "1.5rem",
              margin: "0.5rem 0",
            },
            "& li > p": { margin: 0 },
          }}
        >
          <Typography variant="subtitle1" gutterBottom>
            Aperçu du rendu :
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
        </Paper>
      </Box>
    </PageTemplate>
  );
}
