// ======================================================
// src/pages/commentaires/CommentairesCreatePage.tsx
// Création d’un commentaire avec aperçu du rendu en temps réel
// (version finale fluide : enregistre via CommentaireForm + aperçu live)
// ======================================================

import { useState } from "react";
import { Box, Paper, Typography, Divider } from "@mui/material";
import { toast } from "react-toastify";

import PageTemplate from "../../components/PageTemplate";
import CommentaireForm from "./CommentaireForm";

export default function CommentairesCreatePage() {
  const [previewHTML, setPreviewHTML] = useState<string>("");

  return (
    <PageTemplate title="➕ Créer un commentaire" backButton onBack={() => window.history.back()}>
      {/* ⚙️ Conteneur principal */}
      <Box display="flex" flexDirection={{ xs: "column", md: "row" }} gap={3}>
        {/* 📝 Formulaire de création */}
        <Box flex={1}>
          <CommentaireForm
            onSubmit={(payload) => {
              toast.success("✅ Commentaire créé avec succès");
              setPreviewHTML(payload.contenu);
            }}
          />
        </Box>

        {/* 👁️ Aperçu du rendu en temps réel */}
        <Paper
          variant="outlined"
          sx={{
            flex: 1,
            p: 2,
            maxHeight: "calc(100vh - 200px)",
            overflowY: "auto",
            bgcolor: "grey.50",
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
                all: "revert", // ✅ neutralise les styles MUI
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
