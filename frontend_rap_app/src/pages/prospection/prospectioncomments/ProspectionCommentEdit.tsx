import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";

import PageTemplate from "../../../components/PageTemplate";
import ProspectionCommentForm from "./ProspectionCommentForm";
import {
  useProspectionComment,
  useUpdateProspectionComment,
  useArchiveProspectionComment, // 🆕 import
} from "../../../hooks/useProspectionComments";
import { useAuth } from "../../../hooks/useAuth";

export default function ProspectionCommentEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  const { data: initial, loading, error } = useProspectionComment(id ?? null);
  const { update, error: updateError } = useUpdateProspectionComment(id ?? "");
  const { toggleArchive, loading: archiving } = useArchiveProspectionComment(id ?? ""); // 🆕

  const numericId = id ? Number(id) : NaN;
  const hasValidId = !!id && Number.isFinite(numericId);

  const { user } = useAuth();
  const canSetInternal = ["staff", "admin", "superadmin"].includes(user?.role ?? "");

  const handleSubmit = async (data: { body: string; is_internal?: boolean }) => {
    try {
      await update({ body: data.body, is_internal: data.is_internal });
      toast.success(`💬 Commentaire #${numericId} mis à jour`);
      navigate("/prospection-commentaires");
    } catch {
      toast.error("Erreur lors de la mise à jour du commentaire");
    }
  };

  // 🧩 Nouvelle logique pour archiver / désarchiver
  const handleArchiveToggle = async () => {
    if (!initial) return;
    try {
      // ✅ on compare à "archive" (backend)
      const isArchived = initial.activite === "archive";
      const newState = await toggleArchive(isArchived);
      toast.success(
        newState === "archive" ? "📦 Commentaire archivé" : "♻️ Commentaire désarchivé"
      );
      // ✅ maj locale cohérente
      initial.activite = newState;
    } catch {
      toast.error("❌ Échec de l’opération d’archivage");
    }
  };

  if (!hasValidId) {
    return (
      <PageTemplate title="Modifier commentaire" centered>
        <Typography color="error">❌ Paramètre invalide.</Typography>
      </PageTemplate>
    );
  }

  if (loading) {
    return (
      <PageTemplate title={`Modifier commentaire #${numericId}`} centered>
        <CircularProgress />
      </PageTemplate>
    );
  }

  if (error) {
    return (
      <PageTemplate title={`Modifier commentaire #${numericId}`} centered>
        <Typography color="error">❌ Erreur de chargement.</Typography>
      </PageTemplate>
    );
  }

  if (!initial) {
    return (
      <PageTemplate title={`Modifier commentaire #${numericId}`} centered>
        <CircularProgress />
      </PageTemplate>
    );
  }

  // ✅ cohérence : "archive" et non "archivee"
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

          {/* ✅ Boutons de navigation */}
          <Button variant="outlined" onClick={() => navigate("/prospection-commentaires")}>
            ← Retour
          </Button>

          <Button variant="outlined" onClick={() => navigate("/prospection-commentaires")}>
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

      <ProspectionCommentForm
        initial={initial}
        prospectionId={initial.prospection}
        canSetInternal={canSetInternal}
        onSubmit={async (payload) => {
          await handleSubmit({
            body: payload.body,
            is_internal: payload.is_internal,
          });
        }}
      />
    </PageTemplate>
  );
}
