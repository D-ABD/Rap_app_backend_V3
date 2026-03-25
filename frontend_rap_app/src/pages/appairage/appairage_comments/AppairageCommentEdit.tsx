// src/pages/appairages/appairage_comments/AppairageCommentEditPage.tsx
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Alert, Box, Button, CircularProgress, Stack, Typography } from "@mui/material";

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
      toast.success(`Commentaire #${numericId} mis à jour.`);
      navigate("/appairage-commentaires");
    } catch {
      toast.error("Le commentaire n'a pas pu être mis à jour.");
    }
  };

  // 🆕 Gestion archive / désarchive
  const handleArchiveToggle = async () => {
    if (!initial) return;
    try {
      const isArchived = initial.activite === "archive";
      const newState = await toggleArchive(isArchived);
      toast.success(
        newState === "archive" ? "Commentaire archivé." : "Commentaire désarchivé."
      );
      initial.activite = newState;
    } catch {
      toast.error("Le changement d'archivage a échoué.");
    }
  };

  if (!hasValidId) {
    return (
      <PageTemplate title="Modifier commentaire d’appairage" centered>
        <Alert severity="error">L'identifiant du commentaire d'appairage est invalide.</Alert>
      </PageTemplate>
    );
  }

  if (loading) {
    return (
      <PageTemplate title={`Modifier commentaire #${numericId}`} centered>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Chargement du commentaire...</Typography>
      </PageTemplate>
    );
  }

  if (error || !initial) {
    return (
      <PageTemplate title={`Modifier commentaire #${numericId}`} centered>
        <Alert severity="error">Le commentaire d'appairage n'a pas pu être chargé.</Alert>
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
            {archiving ? "En cours..." : isArchived ? "Désarchiver" : "Archiver"}
          </Button>

          {/* Navigation */}
          <Button variant="outlined" onClick={() => navigate("/appairage-commentaires")}>
            Retour
          </Button>
          <Button variant="outlined" onClick={() => navigate("/appairage-commentaires")}>
            Liste
          </Button>
        </Stack>
      }
    >
      {updateError && (
        <Box mb={2}>
          <Typography color="error">Le commentaire d'appairage n'a pas pu être mis à jour.</Typography>
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
