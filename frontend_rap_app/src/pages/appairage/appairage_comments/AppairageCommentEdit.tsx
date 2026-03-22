// src/pages/appairages/appairage_comments/AppairageCommentEditPage.tsx
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";

import AppairageCommentForm from "./AppairageCommentForm";
import {
  useAppairageComment,
  useUpdateAppairageComment,
  useArchiveAppairageComment, // 🆕
} from "../../../hooks/useAppairageComments";
import type {
  AppairageCommentDTO,
  AppairageCommentUpdateInput,
} from "../../../types/appairageComment";
import PageTemplate from "../../../components/PageTemplate";

export default function AppairageCommentEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  const { data: initial, loading, error } = useAppairageComment(id ?? null);
  const { update, error: updateError } = useUpdateAppairageComment(id ?? "");
  const { toggleArchive, loading: archiving } = useArchiveAppairageComment(id ?? ""); // 🆕

  const numericId = id ? Number(id) : NaN;
  const hasValidId = !!id && Number.isFinite(numericId);

  const handleSubmit = async (data: AppairageCommentUpdateInput) => {
    try {
      await update(data);
      toast.success(`💬 Commentaire #${numericId} mis à jour`);
      navigate("/appairage-commentaires");
    } catch {
      toast.error("Erreur lors de la mise à jour du commentaire");
    }
  };

  // 🆕 Gestion archive / désarchive
  const handleArchiveToggle = async () => {
    if (!initial) return;
    try {
      const isArchived = initial.activite === "archive";
      const newState = await toggleArchive(isArchived);
      toast.success(
        newState === "archive" ? "📦 Commentaire archivé" : "♻️ Commentaire désarchivé"
      );
      initial.activite = newState;
    } catch {
      toast.error("❌ Échec de l’opération d’archivage");
    }
  };

  if (!hasValidId) {
    return (
      <PageTemplate title="Modifier commentaire d’appairage" centered>
        <Typography color="error">❌ Paramètre invalide.</Typography>
      </PageTemplate>
    );
  }

  if (loading) {
    return (
      <PageTemplate title={`Modifier commentaire #${numericId}`} centered>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>⏳ Chargement…</Typography>
      </PageTemplate>
    );
  }

  if (error || !initial) {
    return (
      <PageTemplate title={`Modifier commentaire #${numericId}`} centered>
        <Typography color="error">❌ Erreur de chargement.</Typography>
      </PageTemplate>
    );
  }

  const isArchived = initial.activite === "archive";

  return (
    <PageTemplate
      title={`Commentaire #${numericId} — ${isArchived ? "Archivé" : "Actif"}`}
      actions={
        <Stack direction="row" spacing={1}>
          {/* 🆕 Bouton Archiver / Désarchiver */}
          <Button
            variant="contained"
            color={isArchived ? "success" : "warning"}
            onClick={handleArchiveToggle}
            disabled={archiving}
          >
            {archiving ? "⏳ En cours…" : isArchived ? "♻️ Désarchiver" : "📦 Archiver"}
          </Button>

          {/* Navigation */}
          <Button variant="outlined" onClick={() => navigate("/appairage-commentaires")}>
            ← Retour
          </Button>
          <Button variant="outlined" onClick={() => navigate("/appairage-commentaires")}>
            Liste
          </Button>
        </Stack>
      }
    >
      {updateError && (
        <Box mb={2}>
          <Typography color="error">❌ Impossible de mettre à jour le commentaire.</Typography>
        </Box>
      )}

      <AppairageCommentForm
        initial={initial as AppairageCommentDTO}
        appairageId={initial.appairage}
        onSubmit={handleSubmit}
      />
    </PageTemplate>
  );
}
